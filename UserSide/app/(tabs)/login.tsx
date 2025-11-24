import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  Alert,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useUser } from '../../contexts/UserContext';
import { OtpInput } from "react-native-otp-entry";

import styles from "./styles";

// Complete the auth session
WebBrowser.maybeCompleteAuthSession();

WebBrowser.maybeCompleteAuthSession();

// Check if running in Expo Go (development) or standalone app (production)
const isExpoGo = Constants.appOwnership === 'expo';

const BASE_URL = "http://192.168.1.11:3000"; // Backend server URL

const Login = () => {
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [showPassword, setShowPassword] = useState(false);
   const [isLoading, setIsLoading] = useState(false);
   const [showOTPModal, setShowOTPModal] = useState(false);
   const [otp, setOtp] = useState("");
   const [pendingUserData, setPendingUserData] = useState(null);

   const router = useRouter();
   const { setUser } = useUser();
   
   // Reset loading state when component mounts (fixes logout issue)
   useEffect(() => {
     setIsLoading(false);
   }, []);
   
   // Google Sign-In configuration - Using ID Token flow (token-only, no redirects)
   const googleWebClientId = Constants.expoConfig?.extra?.googleWebClientId || '';
   const googleAndroidClientId = Constants.expoConfig?.extra?.googleAndroidClientId || '';
   
   console.log('🔐 Login component loaded, BASE_URL:', BASE_URL);
   console.log('🔑 Google Web Client ID:', googleWebClientId);
   console.log('🔑 Google Android Client ID:', googleAndroidClientId);
   
   // Use ID Token request instead of regular auth request
   const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
     webClientId: googleWebClientId,
     androidClientId: googleAndroidClientId,
   });
   
   // Log every time response changes
   useEffect(() => {
     console.log('📱 Response state updated:', response ? response.type : 'null');
     if (response) {
       console.log('📱 Full response:', JSON.stringify(response, null, 2));
     }
   }, [response]);


  const handlePress = async () => {
    if (isLoading) return;
    
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }
    
    setIsLoading(true);
    console.log('🔐 Attempting login with:', { email, password: '***' });
    console.log('📍 Using backend URL:', BASE_URL);
    
    try {
      console.log('🌐 Sending login request...');
      const response = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      console.log('📦 Response status:', response.status);
      const data = await response.json();
      console.log('📥 Response data:', data);

      if (response.ok) {
         console.log("✅ Login credentials verified:", data);
         
         const user = data.user || data;
         
         // Check user role
         if (user.role === 'police' || user.role === 'admin') {
           // Police and Admin users should log in via AdminSide
           alert('Police and Admin users must log in through the AdminSide dashboard.');
           setIsLoading(false);
           return;
         }
         
         // Store user data temporarily
         setPendingUserData(user);
         
         // Send OTP to user's phone
         await sendLoginOTP();
       } else {
         alert(data.message || "Login failed");
         setIsLoading(false);
       }
    } catch (err: any) {
      console.error("❌ Error logging in:", err);
      console.error("Error message:", err.message);
      console.error("Error stack:", err.stack);
      alert("Network error: " + (err.message || "Unknown"));
      setIsLoading(false);
    }
  };

  const sendLoginOTP = async () => {
    try {
      console.log('📱 Sending login OTP...');
      const response = await fetch(`${BASE_URL}/api/otp/login/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      console.log('📥 OTP send response:', data);

      if (response.ok) {
        setShowOTPModal(true);
        setIsLoading(false);
        Alert.alert(
          "OTP Sent",
          `A verification code has been sent to ${data.phoneNumber}${data.devOTP ? `\n\nDev OTP: ${data.devOTP}` : ''}`
        );
      } else {
        Alert.alert("Error", data.message || "Failed to send OTP");
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("❌ Error sending OTP:", err);
      Alert.alert("Error", "Failed to send OTP. Please try again.");
      setIsLoading(false);
    }
  };

  const verifyLoginOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter the 6-digit OTP code.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/otp/login/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (response.ok) {
        // OTP verified, complete login
        const user = pendingUserData;
        
        // Store user data in AsyncStorage
        try {
          await AsyncStorage.setItem('userData', JSON.stringify(user));
          console.log('User data stored successfully');
          
          // Update UserContext
          setUser({
            id: user.id?.toString() || '0',
            firstName: user.firstname || user.firstName || '',
            lastName: user.lastname || user.lastName || '',
            email: user.email || '',
            phone: user.contact || user.phone || '',
            address: user.address || '',
            isVerified: Boolean(user.is_verified || user.isVerified),
            profileImage: user.profile_image || user.profileImage,
          });
          console.log('✅ UserContext updated after OTP verification');
        } catch (storageError) {
          console.error('Error storing user data:', storageError);
        }
        
        setShowOTPModal(false);
        setIsLoading(false);
        // Regular users go to the Tabs group root (index tab)
        router.replace("/(tabs)");
      } else {
        Alert.alert("OTP Verification Failed", data.message || "Incorrect OTP");
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error("❌ Error verifying OTP:", err);
      Alert.alert("Error", "Failed to verify OTP. Please try again.");
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    console.log("Forgot Password clicked!");
    // router.push("/forgot-password"); // enable if the route exists
  };

  const handleSignUp = () => {
    console.log("Sign Up clicked!");
    // Navigate to the Register UI
    router.push("/register");
  };

  // Handle Google Sign-In response - Using ID Token flow
  useEffect(() => {
    console.log('🔍 OAuth response changed:', response);
    
    if (response?.type === 'success') {
      console.log('✅ OAuth success! Response:', JSON.stringify(response, null, 2));
      const { params } = response;
      
      // With useIdTokenAuthRequest, we get the ID token directly in params
      if (params?.id_token) {
        console.log('🎫 Got ID token, sending to backend...');
        handleGoogleSignInWithToken(params.id_token);
      } else {
        console.log('⚠️ No ID token in response');
        Alert.alert('Sign In Failed', 'Could not retrieve Google ID token');
      }
    } else if (response?.type === 'error') {
      console.log('❌ OAuth error:', response.error);
      Alert.alert('Sign In Failed', response.error?.message || 'Failed to sign in with Google');
    } else if (response?.type === 'cancel') {
      console.log('🚫 OAuth cancelled by user');
    }
  }, [response]);

  const handleGoogleSignInWithToken = async (idToken: string) => {
    setIsLoading(true);
    try {
      console.log('📤 Sending ID token to backend...');
      
      // Send ID token directly to backend for verification
      const response = await fetch(`${BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await response.json();
      console.log('📥 Backend response:', data);

      if (response.ok) {
        const user = data.user || data;

        // Check user role
        if (user.role === 'police' || user.role === 'admin') {
          Alert.alert(
            'Wrong Portal',
            'Police and Admin users must log in through the AdminSide dashboard.'
          );
          setIsLoading(false);
          return;
        }

        // Store user data in AsyncStorage
        await AsyncStorage.setItem('userData', JSON.stringify(user));
        console.log('✅ Google Sign-In successful');

        // Update UserContext
        setUser({
          id: user.id?.toString() || '0',
          firstName: user.firstname || user.firstName || '',
          lastName: user.lastname || user.lastName || '',
          email: user.email || '',
          phone: user.contact || user.phone || '',
          address: user.address || '',
          isVerified: Boolean(user.is_verified || user.isVerified),
          profileImage: user.profile_image || user.profileImage || user.profile_picture,
        });
        console.log('✅ UserContext updated after Google Sign-In');

        // Navigate to main app
        router.replace('/(tabs)');
      } else {
        Alert.alert('Sign In Failed', data.message || 'Could not sign in with Google');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('❌ Google Sign-In error:', error);
      Alert.alert(
        'Sign In Error',
        'Failed to sign in with Google. Please try again.'
      );
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.container}>
        {/* Title */}
        <Text style={styles.textTitle}>
          <Text style={styles.alertWelcome}>Alert</Text>
          <Text style={styles.davao}>Davao</Text>
        </Text>

        <Text style={styles.subheadingCenter}>Welcome back to AlertDavao!</Text>
        <Text style={styles.normalTxtCentered}>Sign in to your account</Text>

        {/* Email */}
        <Text style={styles.subheading2}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />

        {/* Password with toggle */}
        <Text style={styles.subheading2}>Password</Text>
        <View style={{ position: 'relative' }}>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <Pressable
            onPress={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: 12, top: 12 }}
          >
            <Text style={{ color: "#1D3557", fontSize: 14 }}>
              {showPassword ? "Hide" : "Show"}
            </Text>
          </Pressable>
        </View>

        {/* Login Button */}
        <View style={styles.buttonWrapper}>
          <Button 
            title={isLoading ? "Logging in..." : "Login"} 
            onPress={handlePress} 
            color="#1D3557"
            disabled={isLoading}
          />
        </View>

        {/* Google Sign-In Section */}
        <Text style={{ textAlign: 'center', color: '#999', marginTop: 20, marginBottom: 10 }}>
          or continue with
        </Text>

        {/* Google Login Button */}
        <Pressable 
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FFFFFF',
            borderWidth: 2,
            borderColor: '#4285F4',
            borderRadius: 8,
            padding: 16,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 6,
            elevation: 4,
            opacity: (!request || isLoading) ? 0.5 : 1,
          }}
          onPress={() => {
            if (!isLoading) {
              console.log('👆 Google Sign-In button pressed');
              promptAsync();
            }
          }}
          disabled={!request || isLoading}
        >
          <View style={{ width: 24, height: 24, marginRight: 12, backgroundColor: '#4285F4', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }}>G</Text>
          </View>
          <Text style={{ color: '#4285F4', fontSize: 16, fontWeight: '600' }}>
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </Text>
        </Pressable>

        {/* OnClick Texts */}
        <Pressable onPress={handleForgotPassword}>
          <Text
            style={{ color: "#1D3557", marginTop: 10, textAlign: "center" }}
          >
            Forgot Password?
          </Text>
        </Pressable>

        <Pressable onPress={handleSignUp}>
          <Text
            style={{ color: "#457b9d", marginTop: 10, textAlign: "center" }}
          >
            Don’t have an account? Sign Up
          </Text>
        </Pressable>
      </View>
      {/* OTP Modal */}
      {showOTPModal && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 10,
            padding: 20,
            width: '90%',
            maxWidth: 400,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' }}>
              Enter Verification Code
            </Text>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 20, textAlign: 'center' }}>
              We've sent a 6-digit code to your registered phone number
            </Text>
            
            <OtpInput
              numberOfDigits={6}
              onTextChange={setOtp}
              focusColor="#1D3557"
              theme={{
                containerStyle: { marginBottom: 20 },
                pinCodeContainerStyle: {
                  borderColor: '#1D3557',
                  borderWidth: 2,
                  borderRadius: 8,
                },
              }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#ccc',
                  padding: 12,
                  borderRadius: 5,
                  alignItems: 'center',
                }}
                onPress={() => {
                  setShowOTPModal(false);
                  setIsLoading(false);
                }}
              >
                <Text style={{ color: '#333', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: '#1D3557',
                  padding: 12,
                  borderRadius: 5,
                  alignItems: 'center',
                }}
                onPress={verifyLoginOTP}
                disabled={isLoading}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>
                  {isLoading ? 'Verifying...' : 'Verify'}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={{ marginTop: 15, alignItems: 'center' }}
              onPress={sendLoginOTP}
            >
              <Text style={{ color: '#1D3557', textDecorationLine: 'underline' }}>
                Resend Code
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default Login;
