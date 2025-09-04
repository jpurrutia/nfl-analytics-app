# ESPN Fantasy Football Authentication Guide

## Overview

To access private ESPN Fantasy Football leagues through our API, you need to provide authentication cookies from your ESPN account. This guide walks you through obtaining the required `SWID` and `espn_s2` cookies.

## Why Are These Cookies Needed?

ESPN's Fantasy API requires authentication to access private league data. The cookies prove that you're logged in and have permission to view the league.

## Step-by-Step Instructions

### Using Chrome Browser

1. **Log into ESPN Fantasy**
   - Navigate to https://www.espn.com/fantasy/football/
   - Sign in with your ESPN account that has access to your fantasy league

2. **Open Developer Tools**
   - Right-click anywhere on the page
   - Select "Inspect" from the context menu
   - Alternatively, press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)

3. **Navigate to Application Tab**
   - In the Developer Tools panel, find the top menu bar
   - Click on "Application" 
   - If you don't see it, click the `>>` dropdown arrow to reveal more options

4. **Find ESPN Cookies**
   - In the left sidebar, expand "Storage"
   - Expand "Cookies"
   - Click on `http://fantasy.espn.com`

5. **Locate SWID Cookie**
   - In the table on the right, scroll down until you find `SWID`
   - Copy the value from the "Value" column
   - **Important**: Copy WITHOUT the curly brackets `{}`
   - Example: `43B70875-0C4B-428L-B608-759A4BB28FA1`

6. **Locate espn_s2 Cookie**
   - Continue scrolling in the same table
   - Find `espn_s2`
   - Copy the entire value (this will be much longer than SWID)
   - This value won't have curly brackets

### Using Firefox Browser

1. Follow steps 1-2 above
2. Click on "Storage" tab instead of "Application"
3. Expand "Cookies" and select the ESPN domain
4. Find and copy the same cookie values

### Using Safari Browser

1. Enable Developer menu: Safari → Preferences → Advanced → Show Develop menu
2. Follow similar steps using Develop → Show Web Inspector

## Using the Cookies in the API

### Connecting a League

When connecting your ESPN league, include the cookies in your API request:

```json
POST /api/leagues
{
  "league_id": "your-league-id",
  "platform": "ESPN",
  "swid": "43B70875-0C4B-428L-B608-759A4BB28FA1",
  "espn_s2": "AEBxvY3Kc6hPbEHKxvY3..."
}
```

### Important Notes

- **Cookie Expiration**: These cookies typically expire after 365 days. You'll need to re-authenticate annually.
- **Security**: Never share these cookies publicly. They provide access to your ESPN account.
- **Private Leagues Only**: Public leagues don't require authentication.
- **One League at a Time**: If you have multiple leagues, you can use the same cookies for all of them.

## Troubleshooting

### "League not found" Error
- Verify the league ID is correct
- For private leagues, ensure cookies are provided
- Check that your ESPN account has access to the league

### "Unauthorized" Error
- Your cookies may have expired
- Try logging out and back into ESPN, then get fresh cookies
- Ensure you copied the values correctly (no extra spaces)

### Cookies Not Visible
- Make sure you're logged into ESPN
- Try refreshing the page
- Clear browser cache and login again

## Security Best Practices

1. **Never commit cookies to version control**
2. **Store cookies securely** (use environment variables or secrets management)
3. **Rotate cookies periodically** for security
4. **Limit cookie access** to only necessary services

## API Integration Example

### Python Script
```python
import requests

# Your cookies (keep these secure!)
SWID = "your-swid-here"
ESPN_S2 = "your-espn-s2-here"

# Connect league
response = requests.post(
    "http://localhost:8080/api/leagues",
    json={
        "league_id": "123456",
        "platform": "ESPN",
        "swid": SWID,
        "espn_s2": ESPN_S2
    },
    headers={"Authorization": "Bearer your-jwt-token"}
)

print(response.json())
```

### cURL Example
```bash
curl -X POST http://localhost:8080/api/leagues \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "league_id": "123456",
    "platform": "ESPN",
    "swid": "your-swid-here",
    "espn_s2": "your-espn-s2-here"
  }'
```

## Need Help?

If you're having trouble obtaining or using the cookies, please:
1. Check that you're using a supported browser
2. Ensure you're logged into the correct ESPN account
3. Verify the league ID is correct
4. Contact support with specific error messages