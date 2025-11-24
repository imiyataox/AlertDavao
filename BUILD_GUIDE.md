# Build Guide for AlertDavao Development

## Prerequisites

Ensure you have the following installed:
- Node.js (v18 or higher recommended)
- npm or yarn
- Expo CLI (`npm install -g expo-cli` or use `npx expo`)

## Quick Start - Development Build

### 1. Install Dependencies

```bash
# Install frontend dependencies
cd UserSide
npm install

# Install backend dependencies
cd backends
npm install
cd ..
```

### 2. Start the Backend Server

```bash
# From UserSide/backends directory
cd UserSide/backends
npm start

# The backend will run on http://localhost:3000
# OTP codes will be logged to console for development testing
```

### 3. Start the Expo Development Server

```bash
# From UserSide directory
cd UserSide
npx expo start

# Or with cache clearing
npx expo start --clear
```

### 4. Access the App

Choose one of the following options:

**For Web Development:**
```bash
# Press 'w' in the terminal or visit
http://localhost:8081
```

**For iOS Simulator:**
```bash
# Press 'i' in the terminal
# Requires Xcode installed on macOS
```

**For Android Emulator:**
```bash
# Press 'a' in the terminal
# Requires Android Studio and emulator setup
```

**For Physical Device:**
```bash
# Scan QR code with Expo Go app
# Available on iOS App Store and Google Play Store
```

## Build Commands

### Clear Cache and Rebuild
```bash
cd UserSide

# Clear Metro bundler cache
npx expo start --clear

# Or manually clear cache
rm -rf .expo
rm -rf node_modules/.cache
npx expo start
```

### Production Web Build
```bash
cd UserSide

# Build for web
npx expo export --platform web

# Output will be in dist/ directory
```

### Production Mobile Build (EAS Build)
```bash
cd UserSide

# Install EAS CLI globally (if not already installed)
npm install -g eas-cli

# Login to Expo account
eas login

# Configure build
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios

# Build for both
eas build --platform all
```

## Development Workflow

### Step 1: Backend Setup
```bash
# Navigate to backend
cd UserSide/backends

# Start backend server
npm start

# Backend runs on port 3000
# Console will show OTP codes for testing
```

### Step 2: Frontend Development
```bash
# Navigate to frontend
cd UserSide

# Start with cache clearing (recommended)
npx expo start --clear

# Choose platform:
# Press 'w' for web
# Press 'a' for Android
# Press 'i' for iOS
```

### Step 3: Testing Features

**Registration Flow:**
1. Navigate to /register
2. Fill in form with phone number
3. Complete reCAPTCHA
4. Check backend console for OTP code
5. Enter OTP in modal
6. Complete registration

**Login Flow:**
1. Navigate to /login
2. Enter credentials
3. Check backend console for OTP code
4. Enter OTP in modal
5. Login successful

## Environment Configuration

### Backend (.env file location: `UserSide/backends/.env`)

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=alertdavao

# Email (for verification emails)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Google OAuth
GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com

# Twilio (for OTP SMS in production)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Environment
NODE_ENV=development
```

### Frontend (app.json configuration)

```json
{
  "expo": {
    "extra": {
      "googleWebClientId": "your-web-client-id.apps.googleusercontent.com",
      "googleAndroidClientId": "your-android-client-id.apps.googleusercontent.com"
    }
  }
}
```

## Troubleshooting

### Cache Issues
```bash
# Clear all caches
cd UserSide
rm -rf .expo
rm -rf node_modules/.cache
npx expo start --clear
```

### Package Installation Issues
```bash
# Reinstall all packages
cd UserSide
rm -rf node_modules package-lock.json
npm install

# Backend
cd backends
rm -rf node_modules package-lock.json
npm install
```

### Port Conflicts
```bash
# If port 3000 is in use for backend
# Change port in backends/server.js
const PORT = process.env.PORT || 3001;

# If port 8081 is in use for Expo
npx expo start --port 8082
```

### TypeScript Errors
```bash
# Check for errors
cd UserSide
npx tsc --noEmit --skipLibCheck

# Most TypeScript config errors can be ignored
# as they're related to tsconfig.json settings
```

### Module Not Found Errors
```bash
# Clear cache and reinstall
cd UserSide
rm -rf node_modules
npm install
npx expo start --clear
```

## Platform-Specific Notes

### Web Development
- Uses port 8081 by default
- Hot reloading enabled
- reCAPTCHA works in web browser
- Phone input shows dropdown for country selection

### Android Development
- Requires Android Studio
- Enable Developer Options on device
- Use USB debugging or emulator
- Backend URL should be `http://10.0.2.2:3000` for emulator

### iOS Development
- Requires macOS and Xcode
- iOS Simulator available on macOS only
- Backend URL should be `http://localhost:3000` for simulator
- Physical device testing requires Apple Developer account

## Development Mode Features

### OTP Testing
- OTP codes are logged to backend console
- API response includes `devOTP` field (development only)
- No SMS actually sent in development mode

### reCAPTCHA Testing
- Uses test site key: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`
- Always passes in development
- Replace with production key for deployment

### Phone Validation
- All countries supported
- Validation based on country format
- Saved in international format (+639123456789)

## Package Versions

### Frontend
- react-native-phone-number-input: ^2.1.0
- react-native-otp-entry: ^1.8.5
- react-native-recaptcha-that-works: ^2.0.0
- expo: ~54.0.6
- react-native: 0.81.5

### Backend
- twilio: ^5.10.6
- google-auth-library: ^9.15.1
- express: ^4.18.2
- mysql2: ^3.6.0

## Useful Commands

```bash
# Check package versions
cd UserSide && npm list | grep -E "phone|otp|recaptcha"

# View backend logs with OTP codes
cd UserSide/backends && npm start | grep "OTP"

# Reset everything
cd UserSide
rm -rf .expo node_modules/.cache
npx expo start --clear

# Check for security vulnerabilities
npm audit
```

## Next Steps

1. **Development Testing**
   - Test registration flow
   - Test login flow
   - Verify OTP codes in console
   - Test error handling

2. **Production Setup**
   - Configure Twilio credentials
   - Replace reCAPTCHA test key
   - Set up production database
   - Configure email service

3. **Deployment**
   - Build production bundles
   - Deploy backend to server
   - Submit mobile apps to stores
   - Configure production environment variables

## Support

For issues or questions:
1. Check console logs for errors
2. Verify all environment variables are set
3. Ensure backend is running before starting frontend
4. Clear cache if experiencing build issues

---

**Current Build Status:** ✅ All dependencies installed, imports fixed, ready for development
