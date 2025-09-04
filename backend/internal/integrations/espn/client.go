package espn

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"
	"time"
)

const (
	baseURL = "https://fantasy.espn.com/apis/v3/games/ffl"
	userAgent = "Mozilla/5.0 (compatible; NFLAnalytics/1.0)"
	maxRetries = 3
	retryDelay = time.Second
)

// ESPNClient handles communication with ESPN Fantasy API
type ESPNClient struct {
	httpClient *http.Client
	baseURL    string
	rateLimiter *rateLimiter
	mu         sync.RWMutex
	swid       string // ESPN SWID cookie for authentication
	espnS2     string // ESPN S2 cookie for authentication
	cookies    []*http.Cookie
}

// rateLimiter prevents hitting API rate limits
type rateLimiter struct {
	mu           sync.Mutex
	lastRequest  time.Time
	minInterval  time.Duration
	requestCount int
	resetTime    time.Time
}

// NewESPNClient creates a new ESPN API client
func NewESPNClient() *ESPNClient {
	return &ESPNClient{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		baseURL: baseURL,
		rateLimiter: &rateLimiter{
			minInterval: 100 * time.Millisecond, // 10 requests per second max
			resetTime:   time.Now().Add(time.Minute),
		},
	}
}

// SetAuthentication sets ESPN authentication cookies for private leagues
func (c *ESPNClient) SetAuthentication(swid, espnS2 string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.swid = swid
	c.espnS2 = espnS2
	
	// Create cookie objects
	c.cookies = []*http.Cookie{
		{
			Name:  "SWID",
			Value: fmt.Sprintf("{%s}", swid), // ESPN expects SWID with curly braces
			Domain: ".espn.com",
			Path: "/",
		},
		{
			Name:  "espn_s2",
			Value: espnS2,
			Domain: ".espn.com",
			Path: "/",
		},
	}
}

// SetCookies sets authentication cookies for private leagues (deprecated - use SetAuthentication)
func (c *ESPNClient) SetCookies(cookies []*http.Cookie) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cookies = cookies
}

// GetLeagueInfo fetches league information
func (c *ESPNClient) GetLeagueInfo(ctx context.Context, leagueID string) (*LeagueInfo, error) {
	endpoint := fmt.Sprintf("%s/seasons/2023/segments/0/leagues/%s", c.baseURL, leagueID)
	
	var info LeagueInfo
	if err := c.makeRequest(ctx, "GET", endpoint, nil, &info); err != nil {
		return nil, fmt.Errorf("failed to get league info: %w", err)
	}
	
	return &info, nil
}

// GetRosters fetches all team rosters
func (c *ESPNClient) GetRosters(ctx context.Context, leagueID string) ([]Roster, error) {
	endpoint := fmt.Sprintf("%s/seasons/2023/segments/0/leagues/%s?view=roster", c.baseURL, leagueID)
	
	var response struct {
		Teams []struct {
			ID     int            `json:"id"`
			Roster []RosterPlayer `json:"roster"`
		} `json:"teams"`
	}
	
	if err := c.makeRequest(ctx, "GET", endpoint, nil, &response); err != nil {
		return nil, fmt.Errorf("failed to get rosters: %w", err)
	}
	
	rosters := make([]Roster, 0, len(response.Teams))
	for _, team := range response.Teams {
		rosters = append(rosters, Roster{
			TeamID:  team.ID,
			Players: team.Roster,
		})
	}
	
	return rosters, nil
}

// GetAvailablePlayers fetches free agents and waiver wire players
func (c *ESPNClient) GetAvailablePlayers(ctx context.Context, leagueID string) ([]Player, error) {
	endpoint := fmt.Sprintf("%s/seasons/2023/segments/0/leagues/%s/players?view=kona_player_info", c.baseURL, leagueID)
	
	params := url.Values{}
	params.Add("scoringPeriodId", "0")
	params.Add("filterStatus", `{"value":"FREEAGENT"}`)
	params.Add("filterSlotIds", `{"value":[0,2,4,6,23,16,17]}`)
	params.Add("limit", "200")
	
	fullURL := fmt.Sprintf("%s&%s", endpoint, params.Encode())
	
	var response struct {
		Players []Player `json:"players"`
	}
	
	if err := c.makeRequest(ctx, "GET", fullURL, nil, &response); err != nil {
		return nil, fmt.Errorf("failed to get available players: %w", err)
	}
	
	return response.Players, nil
}

// GetMatchups fetches matchups for a specific week
func (c *ESPNClient) GetMatchups(ctx context.Context, leagueID string, week int) ([]Matchup, error) {
	endpoint := fmt.Sprintf("%s/seasons/2023/segments/0/leagues/%s?view=mMatchup", c.baseURL, leagueID)
	
	params := url.Values{}
	params.Add("scoringPeriodId", fmt.Sprintf("%d", week))
	
	fullURL := fmt.Sprintf("%s&%s", endpoint, params.Encode())
	
	var response struct {
		Schedule []Matchup `json:"schedule"`
	}
	
	if err := c.makeRequest(ctx, "GET", fullURL, nil, &response); err != nil {
		return nil, fmt.Errorf("failed to get matchups: %w", err)
	}
	
	return response.Schedule, nil
}

// GetTransactions fetches recent transactions
func (c *ESPNClient) GetTransactions(ctx context.Context, leagueID string, limit int) ([]Transaction, error) {
	endpoint := fmt.Sprintf("%s/seasons/2023/segments/0/leagues/%s/transactions", c.baseURL, leagueID)
	
	params := url.Values{}
	params.Add("limit", fmt.Sprintf("%d", limit))
	
	fullURL := fmt.Sprintf("%s?%s", endpoint, params.Encode())
	
	var transactions []Transaction
	if err := c.makeRequest(ctx, "GET", fullURL, nil, &transactions); err != nil {
		return nil, fmt.Errorf("failed to get transactions: %w", err)
	}
	
	return transactions, nil
}

// GetDraftResults fetches draft results
func (c *ESPNClient) GetDraftResults(ctx context.Context, leagueID string) ([]DraftPick, error) {
	endpoint := fmt.Sprintf("%s/seasons/2023/segments/0/leagues/%s/draft", c.baseURL, leagueID)
	
	var response struct {
		Picks []DraftPick `json:"picks"`
	}
	
	if err := c.makeRequest(ctx, "GET", endpoint, nil, &response); err != nil {
		return nil, fmt.Errorf("failed to get draft results: %w", err)
	}
	
	return response.Picks, nil
}

// DetectScoringFormat determines the league's scoring format
func (c *ESPNClient) DetectScoringFormat(settings LeagueSettings) string {
	receptionPoints := settings.ScoringSettings.ReceptionPoints
	
	if receptionPoints == 1.0 {
		return "PPR"
	} else if receptionPoints == 0.5 {
		return "HALF_PPR"
	}
	return "STANDARD"
}

// makeRequest handles HTTP requests with rate limiting and retries
func (c *ESPNClient) makeRequest(ctx context.Context, method, url string, body io.Reader, result interface{}) error {
	// Apply rate limiting
	if err := c.rateLimiter.wait(); err != nil {
		return err
	}
	
	var lastErr error
	for attempt := 0; attempt < maxRetries; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(retryDelay * time.Duration(attempt)):
			}
		}
		
		req, err := http.NewRequestWithContext(ctx, method, url, body)
		if err != nil {
			return err
		}
		
		req.Header.Set("User-Agent", userAgent)
		req.Header.Set("Accept", "application/json")
		
		// Add cookies for private leagues
		c.mu.RLock()
		for _, cookie := range c.cookies {
			req.AddCookie(cookie)
		}
		c.mu.RUnlock()
		
		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = err
			continue
		}
		defer resp.Body.Close()
		
		// Handle HTTP errors
		if resp.StatusCode != http.StatusOK {
			lastErr = c.handleHTTPError(resp)
			if resp.StatusCode == http.StatusTooManyRequests {
				// Back off on rate limiting
				c.rateLimiter.backoff()
			}
			continue
		}
		
		// Parse response
		if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
			return fmt.Errorf("failed to parse response: %w", err)
		}
		
		return nil
	}
	
	return fmt.Errorf("request failed after %d attempts: %w", maxRetries, lastErr)
}

// handleHTTPError processes HTTP error responses
func (c *ESPNClient) handleHTTPError(resp *http.Response) error {
	switch resp.StatusCode {
	case http.StatusNotFound:
		return fmt.Errorf("league not found")
	case http.StatusUnauthorized:
		return fmt.Errorf("unauthorized - private league requires authentication")
	case http.StatusTooManyRequests:
		return fmt.Errorf("rate limited - too many requests")
	case http.StatusServiceUnavailable:
		return fmt.Errorf("service unavailable - ESPN API is down")
	default:
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("server error (status %d): %s", resp.StatusCode, string(body))
	}
}

// wait implements rate limiting
func (r *rateLimiter) wait() error {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	now := time.Now()
	
	// Reset counter if window expired
	if now.After(r.resetTime) {
		r.requestCount = 0
		r.resetTime = now.Add(time.Minute)
	}
	
	// Check if we've hit the limit
	if r.requestCount >= 100 { // 100 requests per minute
		sleepTime := r.resetTime.Sub(now)
		if sleepTime > 0 {
			time.Sleep(sleepTime)
		}
		r.requestCount = 0
		r.resetTime = time.Now().Add(time.Minute)
	}
	
	// Enforce minimum interval between requests
	timeSinceLastRequest := now.Sub(r.lastRequest)
	if timeSinceLastRequest < r.minInterval {
		time.Sleep(r.minInterval - timeSinceLastRequest)
	}
	
	r.lastRequest = time.Now()
	r.requestCount++
	
	return nil
}

// backoff increases the rate limit interval
func (r *rateLimiter) backoff() {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	r.minInterval = r.minInterval * 2
	if r.minInterval > 5*time.Second {
		r.minInterval = 5 * time.Second
	}
}