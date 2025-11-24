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
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { useUser } from '../../contexts/UserContext';

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

   const router = useRouter();
   const { setUser } = useUser();
   
   // Reset loading state when component mounts (fixes logout issue)
   useEffect(() => {
     setIsLoading(false);
   }, []);
   
   // Google Sign-In configuration
   const googleWebClientId = Constants.expoConfig?.extra?.googleWebClientId || '';
   const googleAndroidClientId = Constants.expoConfig?.extra?.googleAndroidClientId || '';
   
   console.log('🔐 Login component loaded, BASE_URL:', BASE_URL);
   console.log('🔑 Google Web Client ID:', googleWebClientId);
   console.log('🔑 Google Android Client ID:', googleAndroidClientId);
   
   const [request, response, promptAsync] = Google.useAuthRequest({
     webClientId: googleWebClientId,
     androidClientId: googleAndroidClientId,
     scopes: ['profile', 'email'],
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
         console.log("✅ Login successful:", data);
         
         const user = data.user || data;
         
         // Check user role
         if (user.role === 'police' || user.role === 'admin') {
           // Police and Admin users should log in via AdminSide
           alert('Police and Admin users must log in through the AdminSide dashboard.');
           setIsLoading(false);
           return;
         }
         
         // Store user data in AsyncStorage
         try {
           await AsyncStorage.setItem('userData', JSON.stringify(user));
           console.log('User data stored successfully');
           
           // Immediately update UserContext
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
           console.log('✅ UserContext updated immediately after login');
         } catch (storageError) {
           console.error('Error storing user data:', storageError);
         }
         
         // Regular users go to the Tabs group root (index tab)
         router.replace("/(tabs)");
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

  const handleForgotPassword = () => {
    console.log("Forgot Password clicked!");
    // router.push("/forgot-password"); // enable if the route exists
  };

  const handleSignUp = () => {
    console.log("Sign Up clicked!");
    // Navigate to the Register UI
    router.push("/register");
  };

  // Handle Google Sign-In response
  useEffect(() => {
    console.log('🔍 OAuth response changed:', response);
    
    if (response?.type === 'success') {
      console.log('✅ OAuth success! Response:', JSON.stringify(response, null, 2));
      const { authentication } = response;
      
      if (authentication?.accessToken) {
        console.log('🎫 Got access token, fetching user info...');
        handleGoogleSignIn(authentication.accessToken);
      } else {
        console.log('⚠️ No access token in response');
      }
    } else if (response?.type === 'error') {
      console.log('❌ OAuth error:', response.error);
      Alert.alert('Sign In Failed', response.error?.message || 'Failed to sign in with Google');
    } else if (response?.type === 'cancel') {
      console.log('🚫 OAuth cancelled by user');
    }
  }, [response]);

  const handleGoogleSignIn = async (accessToken: string) => {
    setIsLoading(true);
    try {
      // Get user info from Google
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/userinfo/v2/me',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const googleUser = await userInfoResponse.json();

      console.log('Google user info:', googleUser);

      // Send to backend for authentication/registration
      const response = await fetch(`${BASE_URL}/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleId: googleUser.id,
          email: googleUser.email,
          firstName: googleUser.given_name || '',
          lastName: googleUser.family_name || '',
          profilePicture: googleUser.picture,
        }),
      });

      const data = await response.json();

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

        // Store user data
        await AsyncStorage.setItem('userData', JSON.stringify(user));
        console.log('Google Sign-In successful');

        // Navigate to main app
        router.replace('/(tabs)');
      } else {
        Alert.alert('Sign In Failed', data.message || 'Could not sign in with Google');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
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
    </ScrollView>
  );
};

export default Login;
