// File: app/(app)/welcome-video.tsx
// ✅ COMPLETE UPDATED CODE - SMOOTH ANIMATIONS & PERFORMANCE FIXES

import React, { useEffect, useRef } from 'react';
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
  Animated,
  Easing,
  InteractionManager, // ✅ Added for smoother start
} from 'react-native';
import { useRouter } from 'expo-router';
import { useUserStore } from '../../store/useUserStore';

const CAL_IMAGE = require('../../assets/calc-happy.png');

const { width, height } = Dimensions.get('window');

export default function WelcomeVideoScreen() {
  const router = useRouter();
  const { setShowWelcomeVideo } = useUserStore();

  // --- Animation Values ---

  // 1. Title Animations
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleScale = useRef(new Animated.Value(0.8)).current;

  // 2. Cal Animation (Starts off-screen to the RIGHT)
  const calTranslateX = useRef(new Animated.Value(width)).current;

  // 3. Bottom Content Animation
  const bottomContentOpacity = useRef(new Animated.Value(0)).current;
  const bottomContentTranslateY = useRef(new Animated.Value(20)).current; // Slight slide up for bottom content

  useEffect(() => {
    // ✅ FIX: InteractionManager ensures animations start AFTER the screen transition finishes
    // This prevents the "stuck" or "laggy" feeling on entry.
    const interactionPromise = InteractionManager.runAfterInteractions(() => {
      Animated.sequence([
        // STEP 1: Title Appears (Smooth Ease Out)
        Animated.parallel([
          Animated.timing(titleOpacity, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.quad), // Smoother fade
            useNativeDriver: true,
          }),
          Animated.timing(titleScale, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.back(1.5)), // Slight bounce effect for title
            useNativeDriver: true,
          }),
        ]),

        // Small delay
        Animated.delay(100),

        // STEP 2: Cal Slides in (Skateboard Style - Smoother Physics)
        Animated.spring(calTranslateX, {
          toValue: 0,
          stiffness: 90, // Controls speed (lower is softer)
          damping: 12, // Controls "bounciness" (lower = more bounce)
          mass: 1, // Weight of the object
          useNativeDriver: true,
        }),

        // STEP 3: EXACTLY 2 SECONDS DELAY
        Animated.delay(2000),

        // STEP 4: Bottom Content Fades In & Slides Up
        Animated.parallel([
          Animated.timing(bottomContentOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(bottomContentTranslateY, {
            toValue: 0,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });

    // Cleanup subscription
    return () => {
      interactionPromise.cancel();
    };
  }, []);

  const handleContinue = () => {
    // Navigate smoothly
    setShowWelcomeVideo(false);
    router.replace('/(app)/thank-you');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <View style={styles.contentContainer}>
        {/* --- Top Section: Title --- */}
        <Animated.View
          style={{
            opacity: titleOpacity,
            transform: [{ scale: titleScale }],
            width: '100%',
            alignItems: 'center',
            marginTop: 40,
          }}>
          <Text style={styles.titleText}>Welcome to Daytz!</Text>
        </Animated.View>

        {/* --- Middle Section: Cal Character --- */}
        <Animated.View
          // ✅ renderToHardwareTextureAndroid helps performance on Android
          renderToHardwareTextureAndroid={true}
          style={[styles.imageContainer, { transform: [{ translateX: calTranslateX }] }]}>
          <Image
            source={CAL_IMAGE}
            style={styles.calImage}
            resizeMode="contain"
            fadeDuration={0} // Prevents default image fade from clashing with animation
          />
        </Animated.View>

        {/* --- Bottom Section: Subtitle & Button --- */}
        <Animated.View
          style={{
            opacity: bottomContentOpacity,
            transform: [{ translateY: bottomContentTranslateY }], // Added slight slide-up
            width: '100%',
            alignItems: 'center',
            marginBottom: 20,
          }}>
          <Text style={styles.subtitleText}>Let’s get some sparks flying over here!</Text>

          <TouchableOpacity style={styles.button} onPress={handleContinue} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  titleText: {
    fontSize: 38,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    flex: 1,
  },
  calImage: {
    width: width * 0.8,
    height: width * 0.8,
  },
  subtitleText: {
    fontSize: 18,
    color: '#DDDDDD',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 26,
    paddingHorizontal: 10,
  },
  button: {
    backgroundColor: '#FFD700',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#000000',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
