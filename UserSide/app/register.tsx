import React, { useState, useEffect } from "react";
import { View, Text, Button, TextInput, ScrollView, TouchableOpacity, Alert } from "react-native";
import Checkbox from "expo-checkbox";
import styles from "./(tabs)/styles";
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOptimalBackendUrl } from '../config/backend';
import { useLoading } from '../contexts/LoadingContext';

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmpassword, setConfirmPassword] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [contact, setContact] = useState("");
  const [isChecked, setChecked] = useState(false);
  const { showLoading, hideLoading } = useLoading();
  const router = useRouter();

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

    showLoading('Creating your account...');
    try {
      // Get the optimal backend URL automatically
      const backendUrl = await getOptimalBackendUrl();
      console.log('Using backend URL:', backendUrl);
      
      const response = await fetch(`${backendUrl}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // ✅ ensures JSON body is parsed
        },
        body: JSON.stringify({
          firstname,
          lastname,
          email,
          contact,
          password,
        }),
      });

      const data = await response.json();
      console.log("Response from backend:", data);

      if (response.ok) {
        // Show verification message
        Alert.alert(
          "Verification Email Sent",
          "If the email you provided exists, a verification link has been sent to your inbox. Please check your email and click the confirmation link to activate your account before logging in.\n\nThe verification link will expire in 24 hours.",
          [
            {
              text: "OK",
              onPress: () => router.replace('/login')
            }
          ]
        );
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      alert("Failed to connect to server. Please ensure the backend is running and you're on the same network.");
    } finally {
      hideLoading();
    }
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
      <TextInput
        style={styles.input}
        placeholder="Enter your contact number"
        value={contact}
        onChangeText={setContact}
        keyboardType="phone-pad"
        maxLength={11}
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

      <Button
        title="Register"
        onPress={handleRegister}
        disabled={!isChecked}
        color="#1D3557"
      />

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