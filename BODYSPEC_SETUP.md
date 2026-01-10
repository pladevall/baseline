# Bodyspec DEXA Integration Setup Guide

This guide will walk you through setting up the Bodyspec DEXA scan integration for your BIA Tracker application.

## Overview

The Bodyspec integration allows you to:
- Connect your Bodyspec account using secure OAuth 2.0 authentication
- Automatically sync your DEXA scan results
- Compare BIA measurements with DEXA scans (the gold standard)
- View side-by-side comparisons of body composition metrics

## Prerequisites

1. A Bodyspec account with DEXA scan data
2. Supabase project configured
3. Your app deployed or running locally

## Step 1: Database Setup

Run the SQL migrations to create the required tables in your Supabase database:

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the migration files in order:
   - `supabase/migrations/001_create_bodyspec_tables.sql` - Creates base tables
   - `supabase/migrations/002_add_oauth_tokens.sql` - Adds OAuth token fields

This will create:
- `bodyspec_connections` table - stores your Bodyspec OAuth connection with tokens
- `bodyspec_scans` table - stores synced DEXA scan data

## Step 2: Environment Variables

Add the following to your `.env.local` file:

```env
# Your app's public URL (used for OAuth callback)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional: Custom Bodyspec OAuth client ID (defaults to public client)
# NEXT_PUBLIC_BODYSPEC_CLIENT_ID=your-client-id

# Optional: Custom encryption key for token storage
BODYSPEC_ENCRYPTION_KEY=your-secure-random-key-here
```

For production deployment (e.g., Vercel), set `NEXT_PUBLIC_APP_URL` to your production URL.

## Step 3: Connect Your Bodyspec Account

The app uses OAuth 2.0 with PKCE for secure authentication. No manual tokens needed!

1. Start your Next.js development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to your app (usually http://localhost:3000)

3. Click on the "Bodyspec DEXA Integration" section to expand it

4. Click **"Connect with Bodyspec"**

5. You'll be redirected to Bodyspec's login page

6. Log in with your Bodyspec account credentials

7. After authorization, you'll be redirected back to your app with the connection established

## Step 4: Sync Your DEXA Scans

Once connected, you can sync your DEXA scans:

1. In the Bodyspec section, you'll see a "Sync Now" button
2. Click it to fetch your latest scans from Bodyspec
3. The sync process will:
   - Fetch all completed appointments with scan data
   - Save new scans to your local database
   - Skip scans that have already been synced

## Smart Sync Strategy

The integration uses a smart sync strategy to minimize API calls:

- **Never synced**: Syncs immediately
- **Recent scan (<7 days)**: Syncs daily
- **Medium age scan (7-30 days)**: Syncs every 3 days
- **Old scan (30-90 days)**: Syncs weekly
- **Very old scan (90+ days)**: Syncs monthly

You can always manually trigger a sync regardless of the schedule.

## Token Management

The app automatically handles OAuth tokens:

- **Access tokens** are used for API requests
- **Refresh tokens** are stored securely and used to obtain new access tokens when they expire
- **Automatic refresh**: The app will automatically refresh expired tokens before making API calls

## Viewing Your Data

### DEXA Scans List
After syncing, your DEXA scans will appear in the Bodyspec section showing:
- Scan date
- Body fat percentage
- Weight
- Lean body mass

### Comparison with BIA Data
The app automatically highlights when you have both BIA and DEXA data from similar dates. DEXA scans are marked with an amber "DEXA" badge for easy identification.

## Understanding BIA vs DEXA

- **DEXA (Dual-Energy X-ray Absorptiometry)**: The gold standard for body composition measurement. Most accurate.
- **BIA (Bioelectrical Impedance Analysis)**: Quick and convenient but can vary ±3-5% from DEXA due to hydration, food intake, and other factors.

Use DEXA scans as your reference point for accurate body composition, and BIA for tracking trends between DEXA scans.

## Troubleshooting

### "Authorization was denied"
- You may have clicked "Deny" on the Bodyspec authorization page
- Try connecting again and click "Allow" to grant access

### "Security validation failed"
- Your browser session may have expired during authorization
- Clear cookies and try again

### "Session expired"
- The OAuth flow took too long (>10 minutes)
- Try connecting again promptly

### "Failed to complete authorization"
- There may be a temporary issue with Bodyspec's servers
- Wait a few minutes and try again

### No scans appearing after sync
- Ensure you have completed DEXA scans in your Bodyspec account
- Check that the scans are marked as "completed" in Bodyspec
- Scan data may take 1-2 days to become available after your appointment

### Connection shows "error" status
- Try disconnecting and reconnecting
- Check Supabase logs for detailed error information

## Security Notes

1. **OAuth 2.0 + PKCE**: Uses industry-standard secure authentication with Proof Key for Code Exchange
2. **Token Storage**: Access and refresh tokens are encrypted before storage in the database
3. **No Passwords**: Your Bodyspec password is never shared with this app
4. **Automatic Expiry**: Tokens expire and are automatically refreshed
5. **Data Privacy**: All data is stored in your Supabase instance - you control your data

## API Endpoints

The integration provides the following API endpoints:

### OAuth Endpoints
- `GET /api/auth/bodyspec/authorize` - Initiates OAuth flow
- `GET /api/auth/bodyspec/callback` - Handles OAuth callback

### Data Endpoints
- `POST /api/bodyspec/sync` - Sync scans from Bodyspec
- `GET /api/bodyspec/scans` - Get stored scans
- `GET /api/bodyspec/connections` - Get connections
- `DELETE /api/bodyspec/disconnect` - Remove a connection

## Data Structure

### BodyspecScanData
```typescript
{
  bodyFatPercentage: number;
  totalBodyFat: number;        // lb
  leanBodyMass: number;        // lb
  boneMineralDensity: number;
  visceralAdiposeTissue: number; // cm²
  weight: number;              // lb
  regional: {
    leftArm: { fat: number, lean: number, bmd?: number },
    rightArm: { fat: number, lean: number, bmd?: number },
    trunk: { fat: number, lean: number, bmd?: number },
    leftLeg: { fat: number, lean: number, bmd?: number },
    rightLeg: { fat: number, lean: number, bmd?: number }
  };
  androidGynoidRatio?: number;
  boneMineralContent?: number;
  tScore?: number;
  zScore?: number;
}
```

## Multiple Accounts

You can connect multiple Bodyspec accounts if needed:
1. Each connection is tracked separately
2. Scans are associated with their respective connections
3. All scans appear in a unified timeline

## Disconnecting

To remove a Bodyspec connection:
1. Click "Disconnect" next to the connection name
2. Confirm the action
3. **Warning**: This will delete all synced scans associated with that connection

## Support

For issues with:
- **Bodyspec API**: Contact Bodyspec support or check [their documentation](https://app.bodyspec.com/docs)
- **Integration code**: Check the GitHub issues or submit a bug report
- **Supabase**: Check Supabase documentation or support

## References

- [Bodyspec API Documentation](https://app.bodyspec.com/docs)
- [OAuth 2.0 with PKCE](https://oauth.net/2/pkce/)
- [Understanding DEXA Scans](https://www.bodyspec.com/what-is-dxa)
- [Interpreting DEXA Results](https://www.bodyspec.com/blog/post/interpreting_dexa_scan_results_tscore_zscore_and_body_composition)
