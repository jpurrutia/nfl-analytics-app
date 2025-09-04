package espn

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSetAuthentication(t *testing.T) {
	client := NewESPNClient()
	
	swid := "43B70875-0C4B-428L-B608-759A4BB28FA1"
	espnS2 := "AEBxvY3Kc6hPbEHKxvY3Kc6hPbEHKxvY3Kc6hPbEHKxvY3Kc6hPbEHKxvY3Kc6"
	
	// Set authentication
	client.SetAuthentication(swid, espnS2)
	
	// Verify cookies were created correctly
	assert.Equal(t, swid, client.swid)
	assert.Equal(t, espnS2, client.espnS2)
	assert.Len(t, client.cookies, 2)
	
	// Check SWID cookie format (should have curly braces)
	swidCookie := client.cookies[0]
	assert.Equal(t, "SWID", swidCookie.Name)
	assert.Equal(t, "{"+swid+"}", swidCookie.Value)
	assert.Equal(t, ".espn.com", swidCookie.Domain)
	
	// Check espn_s2 cookie
	s2Cookie := client.cookies[1]
	assert.Equal(t, "espn_s2", s2Cookie.Name)
	assert.Equal(t, espnS2, s2Cookie.Value)
	assert.Equal(t, ".espn.com", s2Cookie.Domain)
}

func TestAuthenticationInstructions(t *testing.T) {
	// This test documents the expected format of cookies
	// SWID: UUID format without curly braces when input
	// espn_s2: Long alphanumeric string
	
	exampleSWID := "12345678-ABCD-EFGH-IJKL-MNOPQRSTUVWX"
	exampleS2 := "AEBxvY3Kc6hPbEHK" + // Typically 200+ characters
		"xvY3Kc6hPbEHKxvY3Kc6hPbEHKxvY3Kc6hPbEHK" +
		"xvY3Kc6hPbEHKxvY3Kc6hPbEHKxvY3Kc6hPbEHK"
	
	// Validate format
	assert.Regexp(t, `^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$`, exampleSWID)
	assert.True(t, len(exampleS2) > 50, "espn_s2 should be a long string")
}

func TestPrivateLeagueAccess(t *testing.T) {
	// Test that authentication is properly added to requests
	client := NewESPNClient()
	
	// Without auth, private league should fail
	assert.Len(t, client.cookies, 0, "No cookies should be set initially")
	
	// With auth, cookies should be present
	client.SetAuthentication("test-swid", "test-s2")
	assert.Len(t, client.cookies, 2, "Two cookies should be set after authentication")
	
	// Verify cookies are formatted correctly for ESPN
	for _, cookie := range client.cookies {
		assert.NotEmpty(t, cookie.Name)
		assert.NotEmpty(t, cookie.Value)
		assert.Equal(t, ".espn.com", cookie.Domain)
		assert.Equal(t, "/", cookie.Path)
	}
}