// File: app/(app)/thank-you.tsx
// ✅ COMPLETE AND FINAL UPDATED CODE
// ✅✅✅ FIXED: Removed Auto-Timer. Added "Continue" Button for user control (5-9s read time issue solved) ✅✅✅
// ✅✅✅ ANIMATION: "Cal" Jumping Animation Preserved ✅✅✅

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '../../store/useUserStore';
import { colors } from '../../utils/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const ThankYouScreen = () => {
  const router = useRouter();
  const {
    userProfile,
    setProfileJustCompletedForNav,
    setShowThankYouAfterAuth,
    showThankYouAfterAuth,
    profileJustCompletedForNav,
  } = useUserStore();

  // --- Animation Logic for Cal Jumping ---
  // Value 0 se start hoga (initial position)
  const bounceValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Cal ko continuously jump karwane ke liye Loop
    Animated.loop(
      Animated.sequence([
        // Step 1: Upar jaana (Jump Up) - 15 pixels upar
        Animated.timing(bounceValue, {
          toValue: -15,
          duration: 500, // 0.5 seconds
          easing: Easing.out(Easing.quad), // Smooth ease out
          useNativeDriver: true,
        }),
        // Step 2: Wapis neeche aana (Land Down)
        Animated.timing(bounceValue, {
          toValue: 0,
          duration: 500,
          easing: Easing.in(Easing.quad), // Smooth ease in
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [bounceValue]);

  // --- Navigation Logic (Manual Button Press) ---
  const handleContinue = () => {
    console.log('ThankYouScreen: User clicked Continue. Resetting flags and navigating.');

    // Reset flags
    if (setProfileJustCompletedForNav) {
      setProfileJustCompletedForNav(false);
    }
    if (setShowThankYouAfterAuth) {
      setShowThankYouAfterAuth(false);
    }

    // Determine Destination
    if (userProfile && !userProfile.is_profile_complete) {
      console.log('ThankYouScreen: Profile still incomplete, navigating to /profile.');
      router.replace('/(app)/profile');
    } else {
      console.log('ThankYouScreen: Profile complete or no profile data, navigating to /calendar.');
      router.replace('/(app)/calendar');
    }
  };

  // --- Text Logic ---
  let titleText = "Hi, I'm Cal...";
  let messageText = "I'm going to be your personal wingman while using the Daytz app.";
  let showSubMessage = false;

  if (showThankYouAfterAuth) {
    // New User / Login State
    titleText = 'Welcome!';
    messageText =
      'You have taken your first step to getting out and meeting new people! Congratulations!';
    showSubMessage = true;
  } else if (profileJustCompletedForNav) {
    // Profile Completion State
    titleText = 'Profile Complete!';
    messageText = 'Thank you for setting up your profile.';
    showSubMessage = true;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.popupContainer}>
        {/* Animated Cal Image (Jumping Effect) */}
        <Animated.Image
          source={require('../../assets/calc-happy.png')}
          style={[
            styles.popupImage,
            { transform: [{ translateY: bounceValue }] }, // Animation applied here
          ]}
        />

        {/* Message Box */}
        <View style={styles.bubble}>
          <Text style={styles.popupTitle}>{titleText}</Text>
          <Text style={styles.popupMessage}>{messageText}</Text>

          {showSubMessage && (
            <Text style={styles.subMessage}>We're getting things ready for you...</Text>
          )}

          {/* ✅ FIXED: Button added instead of Timer so user can read at their own pace */}
          <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.Background || '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupContainer: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
  },
  popupImage: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
    zIndex: 1,
    marginBottom: -80, // Overlap effect maintained
  },
  bubble: {
    width: '90%',
    backgroundColor: '#FFFFFF', // White Bubble
    borderRadius: 25,
    padding: 20,
    paddingTop: 90, // Top padding to accommodate Cal's overlap
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  popupTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 15,
  },
  popupMessage: {
    fontSize: 17,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    paddingHorizontal: 5,
  },
  subMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 20,
  },
  // ✅ NEW STYLES FOR BUTTON
  continueButton: {
    backgroundColor: colors.GoldPrimary || '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  continueButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ThankYouScreen;
