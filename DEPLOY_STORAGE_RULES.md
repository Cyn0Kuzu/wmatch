# Deploy Firebase Storage Rules

## Quick Deploy

To fix the storage permission error for report screenshots, deploy the updated storage rules:

```bash
npm run deploy-firebase-rules
```

Or manually:
```bash
firebase deploy --only storage
```

## What This Fixes

The storage rules have been updated to allow authenticated users to upload report screenshots to:
- `reports/{reporterId}/{reportedUserId}/{filename}`

**Current Status:**
- ✅ Error handling works (reports submit without screenshots if upload fails)
- ✅ Storage rules updated locally
- ⚠️ **Storage rules need to be deployed to Firebase**

## After Deployment

Once deployed, screenshot uploads will work correctly. The app will continue to function with graceful fallback if uploads fail for any reason.

## Verify Deployment

After deploying, test by submitting a report with a screenshot. The permission error should no longer occur.

