import React, { useState, useEffect, useRef } from "react";
import { View, Text, Button, TextInput, ScrollView, TouchableOpacity, Alert } from "react-native";
import Checkbox from "expo-checkbox";
import PhoneInput from "react-native-phone-number-input";
import Recaptcha, { RecaptchaRef } from "react-native-recaptcha-that-works";
import { OtpInput } from "react-native-otp-entry";
import styles from "./styles";
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOptimalBackendUrl } from '../../config/backend';
import { useLoading } from '../../contexts/LoadingContext';

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmpassword, setConfirmPassword] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [formattedPhoneNumber, setFormattedPhoneNumber] = useState("");
  const [isChecked, setChecked] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [otp, setOtp] = useState("");
  const { showLoading, hideLoading } = useLoading();
  const router = useRouter();
  const phoneInputRef = useRef(null);
  const recaptchaRef = useRef<RecaptchaRef>(null);
  
  const RECAPTCHA_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"; // Test key - replace with your actual key

  // Check if user is already logged in
  useEffect(() => {
    const checkLoggedIn = async () => {
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          // User is already logged in, redirect to tabs
          router.replace("/(tabs)");
        }
      } catch (error) {
        console.log("Error checking login status:", error);
      }
    };

    checkLoggedIn();
  }, []);

  const handleRegister = async () => {
    if (!isChecked) {
      alert("You must accept the Terms & Conditions before registering.");
      return;
    }

    // Validate phone number
    const checkValid = phoneInputRef.current?.isValidNumber(phoneNumber);
    if (!checkValid) {
      Alert.alert(
        "Invalid Phone Number",
        "Please enter a valid phone number with country code."
      );
      return;
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email)) {
      Alert.alert(
        "Invalid Email",
        "Please enter a valid email address (e.g., example@gmail.com, user@yahoo.com). Email must contain @ and a domain."
      );
      return;
    }

    // Additional check to ensure email has @ symbol
    if (!email.includes('@')) {
      Alert.alert(
        "Invalid Email Format",
        "Email must contain @ symbol. For example: nicolequim@gmail.com"
      );
      return;
    }

    if (password !== confirmpassword) {
      alert("Passwords do not match!");
      return;
    }

    // Validate password requirements
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      Alert.alert(
        "Weak Password",
        "Password must contain:\n• Minimum 8 characters\n• At least one letter\n• At least one number\n• At least one symbol (@$!%*?&)"
      );
      return;
    }

    // Verify reCAPTCHA
    if (!captchaToken) {
      Alert.alert(
        "reCAPTCHA Required",
        "Please complete the reCAPTCHA verification."
      );
      return;
    }

    // Send OTP before registration
    await sendOTPCode();
  };

  const sendOTPCode = async () => {
    showLoading('Sending OTP...');
    try {
      const backendUrl = await getOptimalBackendUrl();
      const fullPhoneNumber = phoneInputRef.current?.getNumberAfterPossiblyEliminatingZero().formattedNumber || formattedPhoneNumber;
      
      const response = await fetch(`${backendUrl}/api/otp/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber: fullPhoneNumber }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowOTPModal(true);
        Alert.alert(
          "OTP Sent",
          `A verification code has been sent to ${fullPhoneNumber}${data.devOTP ? `\n\nDev OTP: ${data.devOTP}` : ''}`
        );
      } else {
        Alert.alert("Error", data.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error("OTP send error:", error);
      Alert.alert("Error", "Failed to send OTP. Please try again.");
    } finally {
      hideLoading();
    }
  };

  const verifyOTPAndRegister = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert("Invalid OTP", "Please enter the 6-digit OTP code.");
      return;
    }

    showLoading('Verifying OTP and creating account...');
    try {
      const backendUrl = await getOptimalBackendUrl();
      const fullPhoneNumber = phoneInputRef.current?.getNumberAfterPossiblyEliminatingZero().formattedNumber || formattedPhoneNumber;
      
      // Verify OTP
      const otpResponse = await fetch(`${backendUrl}/api/otp/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: fullPhoneNumber,
          otp: otp
        }),
      });

      const otpData = await otpResponse.json();

      if (!otpResponse.ok) {
        Alert.alert("OTP Verification Failed", otpData.message || "Incorrect OTP");
        return;
      }

      // OTP verified, proceed with registration
      const registerResponse = await fetch(`${backendUrl}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstname,
          lastname,
          email,
          contact: fullPhoneNumber,
          password,
        }),
      });

      const registerData = await registerResponse.json();

      if (registerResponse.ok) {
        setShowOTPModal(false);
        Alert.alert(
          "Verification Email Sent",
          "Your phone number has been verified! A verification link has been sent to your email. Please check your email and click the confirmation link to activate your account before logging in.\n\nThe verification link will expire in 24 hours.",
          [
            {
              text: "OK",
              onPress: () => router.replace('/login')
            }
          ]
        );
      } else {
        Alert.alert("Registration Failed", registerData.message || "Registration failed");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert("Error", "Failed to connect to server. Please ensure the backend is running.");
    } finally {
      hideLoading();
    }
  };

  const handleCaptchaVerify = (token: string) => {
    console.log("reCAPTCHA verified:", token);
    setCaptchaToken(token);
  };

  const handleCaptchaExpire = () => {
    console.log("reCAPTCHA expired");
    setCaptchaToken("");
  };

  const handleCaptchaError = (error: any) => {
    console.error("reCAPTCHA error:", error);
    Alert.alert("reCAPTCHA Error", "Failed to load reCAPTCHA. Please try again.");
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContentContainer}
    >
      {/* Title */}
      <Text style={styles.textTitle}>
        <Text style={styles.alertWelcome}>Alert</Text>
        <Text style={styles.davao}>Davao</Text>
      </Text>

      <Text style={styles.subheadingCenter}>Welcome to AlertDavao!</Text>
      <Text style={styles.normalTxtCentered}>
        Register and Create an Account
      </Text>

      {/* Firstname */}
      <Text style={styles.subheading2}>Firstname</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your first name"
        value={firstname}
        onChangeText={setFirstname}
      />

      {/* Lastname */}
      <Text style={styles.subheading2}>Lastname</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your last name"
        value={lastname}
        onChangeText={setLastname}
      />

      {/* Email */}
      <Text style={styles.subheading2}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
      />

      {/* Contact */}
      <Text style={styles.subheading2}>Contact Number</Text>
      <PhoneInput
        ref={phoneInputRef}
        defaultValue={phoneNumber}
        defaultCode="PH"
        layout="first"
        onChangeText={(text) => setPhoneNumber(text)}
        onChangeFormattedText={(text) => setFormattedPhoneNumber(text)}
        withDarkTheme={false}
        withShadow
        autoFocus={false}
        containerStyle={{
          width: '100%',
          marginBottom: 12,
          borderRadius: 5,
        }}
        textContainerStyle={{
          paddingVertical: 0,
          backgroundColor: '#fff',
          borderRadius: 5,
        }}
      />

      {/* Password */}
      <Text style={styles.subheading2}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Text style={{ fontSize: 11, color: '#666', marginTop: -8, marginBottom: 12 }}>
        Min. 8 characters with letter, number & symbol
      </Text>

      {/* Confirm Password */}
      <Text style={styles.subheading2}>Confirm Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Re-enter your password"
        value={confirmpassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />

      {/* Checkbox with disclaimer */}
      <View style={styles.checkboxContainer}>
        <Checkbox
          value={isChecked}
          onValueChange={setChecked}
          color={isChecked ? "#1D3557" : undefined}
        />
        <Text style={styles.checkboxText}>
          By clicking you agree to accept our{" "}
          <Text style={styles.termsText}>
            Terms & Conditions
          </Text>
          ,{"\n"}that you are over 18 and aware of our reporting policies!
        </Text>
      </View>

      {/* reCAPTCHA */}
      <Text style={styles.subheading2}>Security Verification</Text>
      <View style={{ marginBottom: 16 }}>
        <Recaptcha
          ref={recaptchaRef}
          siteKey={RECAPTCHA_SITE_KEY}
          baseUrl="https://alertdavao.com"
          onVerify={handleCaptchaVerify}
          onExpire={handleCaptchaExpire}
          onError={handleCaptchaError}
          size="normal"
          theme="light"
        />
      </View>

      <Button
        title="Register"
        onPress={handleRegister}
        disabled={!isChecked || !captchaToken}
        color="#1D3557"
      />

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
              We've sent a 6-digit code to your phone number
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
                onPress={() => setShowOTPModal(false)}
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
                onPress={verifyOTPAndRegister}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Verify</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{ marginTop: 15, alignItems: 'center' }}
              onPress={sendOTPCode}
            >
              <Text style={{ color: '#1D3557', textDecorationLine: 'underline' }}>
                Resend Code
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Link for users who already have an account */}
      <View style={styles.loginLinkContainer}>
        <Text style={styles.loginLinkText}>I already have an account? </Text>
        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text style={styles.loginLink}>
            Login here
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default Register;