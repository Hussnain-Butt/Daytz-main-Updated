// File: app/(app)/welcome-video.tsx
// ✅ COMPLETE AND FINAL CODE
// ✅✅✅ Video removed, Replaced with "Cal" Image ✅✅✅
// ✅✅✅ Fixed Import Paths for (app) folder structure ✅✅✅

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  Image,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
// ERROR FIX: Changed "../" to "../../" because file is inside app/(app)/
import { useUserStore } from '../../store/useUserStore';
import { colors } from '../../utils/theme';

// ERROR FIX: Changed "../" to "../../" for assets as well
const CAL_IMAGE = require('../../assets/calc-happy.png');

const { width } = Dimensions.get('window');

export default function WelcomeVideoScreen() {
  const router = useRouter();
  const { setShowWelcomeVideo } = useUserStore();

  const handleContinue = () => {
    // Mark welcome "video" as seen so it doesn't show again
    setShowWelcomeVideo(false);
    // Navigate to the thank-you screen (or wherever the flow was going before)
    router.replace('/(app)/thank-you');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* StatusBar settings to match the dark theme */}
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={styles.contentContainer}>
        <Text style={styles.titleText}>Welcome to Daytz!</Text>

        <View style={styles.imageContainer}>
          <Image source={CAL_IMAGE} style={styles.calImage} resizeMode="contain" />
        </View>

        <Text style={styles.subtitleText}>Let's help you find your perfect date story.</Text>

        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Black background
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 30,
  },
  titleText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 40,
    textAlign: 'center',
  },
  imageContainer: {
    marginBottom: 40,
    justifyContent: 'center',
    alignItems: 'center',
    // Adding a subtle glow effect behind Cal
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  calImage: {
    width: width * 0.7, // 70% of screen width
    height: width * 0.7,
  },
  subtitleText: {
    fontSize: 18,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 60,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#FFD700', // Gold Primary Color
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
