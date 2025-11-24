# Google Sign-In: Token-Only Flow Implementation

## Overview

The Google Sign-In has been updated to use a **token-only flow** instead of the OAuth redirect flow. This eliminates issues with redirect URIs and origin rules.

## What Changed

### Before (OAuth Redirect Flow)
```
User clicks "Sign in with Google"
  ↓
expo-auth-session initiates OAuth redirect
  ↓
User signs in on Google's page
  ↓
Google redirects back with access token
  ↓
Frontend fetches user info from Google API
  ↓
Frontend sends user data to backend
  ↓
Backend creates/updates user
```

**Issues:**
- ❌ Required redirect_uri configuration
- ❌ Origin/CORS restrictions
- ❌ App verification needed for production
- ❌ Multiple HTTP requests (slower)

### After (Token-Only Flow)
```
User clicks "Sign in with Google"
  ↓
expo-auth-session requests ID token
  ↓
User signs in on Google's page
  ↓
Google returns ID token directly
  ↓
Frontend sends ID token to backend
  ↓
Backend verifies token with Google
  ↓
Backend creates/updates user and returns data
```

**Benefits:**
- ✅ No redirect_uri configuration needed
- ✅ No origin/CORS issues
- ✅ More secure (token verified server-side)
- ✅ Fewer HTTP requests (faster)
- ✅ Simpler code (less error-prone)

## Technical Changes

### Frontend (`UserSide/app/(tabs)/login.tsx`)

**Old code:**
```typescript
const [request, response, promptAsync] = Google.useAuthRequest({
  webClientId: googleWebClientId,
  androidClientId: googleAndroidClientId,
  scopes: ['profile', 'email'],
});

// In response handler
const { authentication } = response;
if (authentication?.accessToken) {
  // Fetch user info from Google
  const userInfoResponse = await fetch(
    'https://www.googleapis.com/userinfo/v2/me',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  // Send user data to backend
  await fetch(`${BASE_URL}/google-login`, {
    method: 'POST',
    body: JSON.stringify({ googleId, email, ... })
  });
}
```

**New code:**
```typescript
const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
  clientId: googleWebClientId,
  androidClientId: googleAndroidClientId,
});

// In response handler
const { params } = response;
if (params?.id_token) {
  // Send ID token directly to backend
  await fetch(`${BASE_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: params.id_token })
  });
}
```

### Backend (`UserSide/backends/server.js`)

**Added new route:**
```javascript
app.post("/api/auth/google", handleGoogleLoginWithToken);
```

This endpoint:
1. Receives ID token from frontend
2. Verifies it with Google using `google-auth-library`
3. Extracts user data from verified token
4. Creates/updates user in database
5. Returns user data to frontend

## Setup Requirements

### 1. Google Cloud Console Setup

The token-only flow still requires a Google OAuth Client ID, but configuration is simpler:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select your project
3. Go to **APIs & Services** > **Credentials**
4. Create **OAuth 2.0 Client ID**
   - Type: **Web application**
   - Name: `AlertDavao Web Client`
   - **No redirect URIs needed!** ✅
5. Copy the Client ID

### 2. Configure App

Update `UserSide/app.json`:
```json
{
  "expo": {
    "extra": {
      "googleWebClientId": "YOUR_CLIENT_ID.apps.googleusercontent.com"
    }
  }
}
```

Update `UserSide/backends/.env`:
```env
GOOGLE_WEB_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
```

### 3. OAuth Consent Screen (Optional for Testing)

For development/testing:
- Configure OAuth consent screen in Google Cloud Console
- Add test users (your email)
- Keep app in "Testing" mode

For production:
- Submit app for verification
- Configure privacy policy and terms

## Testing

1. **Start the backend:**
   ```bash
   cd UserSide/backends
   npm start
   ```

2. **Start the frontend:**
   ```bash
   cd UserSide
   npx expo start
   ```

3. **Test the flow:**
   - Open the app
   - Click "Continue with Google"
   - Sign in with your Google account
   - Should be logged in successfully ✅

## API Endpoint

### POST `/api/auth/google`

**Request:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

**Response (Success):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 10,
    "firstname": "John",
    "lastname": "Doe",
    "email": "user@gmail.com",
    "google_id": "123456789",
    "profile_picture": "https://...",
    "role": "user"
  }
}
```

**Response (Error):**
```json
{
  "message": "Invalid Google token"
}
```

## Security Features

✅ **Token Verification**: Backend verifies ID token with Google before trusting it  
✅ **Email Verification**: Only verified Google emails are accepted  
✅ **Server-Side Validation**: All authentication logic happens on the backend  
✅ **No Password Storage**: Google users don't need passwords  
✅ **Role-Based Access**: Police/Admin users are redirected appropriately  

## Troubleshooting

### "Invalid Client ID"
- Verify `googleWebClientId` in `app.json` matches your Google Cloud Console
- Make sure you're using **Web Application** client ID (not Android/iOS)

### "Invalid Google token"
- Check that backend has correct `GOOGLE_WEB_CLIENT_ID` in `.env`
- Ensure `google-auth-library` is installed: `npm install google-auth-library`

### "Sign In Failed"
- Check console logs for detailed error messages
- Verify internet connection
- Ensure Google Cloud Console API is enabled

### Button doesn't work
- Check that `googleWebClientId` is set in `app.json`
- Restart Expo development server after changing `app.json`
- Check console for "Google Web Client ID" log message

## Migration Notes

If upgrading from the old OAuth redirect flow:

1. **No code changes needed for existing users** - Old `/google-login` endpoint still works
2. **New users automatically use token flow** - Thanks to new `/api/auth/google` endpoint
3. **Database schema unchanged** - Same `google_id` and `profile_picture` columns
4. **Can remove redirect URIs** - No longer needed in Google Cloud Console

## Related Files

- `UserSide/app/(tabs)/login.tsx` - Frontend implementation
- `UserSide/backends/server.js` - Route configuration
- `UserSide/backends/handleGoogleAuth.js` - Backend logic
- `UserSide/app.json` - Google Client ID configuration
- `UserSide/backends/.env` - Backend environment variables

## References

- [Google Identity: ID Tokens](https://developers.google.com/identity/protocols/oauth2/openid-connect)
- [expo-auth-session: ID Token Request](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [google-auth-library: Verify ID Tokens](https://github.com/googleapis/google-auth-library-nodejs)

---

**Implementation completed!** 🎉

The token-only flow is now active and ready to use.
