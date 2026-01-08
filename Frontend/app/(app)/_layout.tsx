// file: app/(app)/_layout.tsx
// ✅ FIX: Hard profile completion guard - user cannot bypass profile setup

import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useUserStore } from '../../store/useUserStore';

export default function AppProtectedLayout() {
  const { isReady } = useAuth();
  const { userProfile } = useUserStore();
  const router = useRouter();
  const segments = useSegments();

  // ✅ HARD RULE: Agar profile complete nahi hai toh sirf allowed screens access ho sakti hain
  useEffect(() => {
    if (!isReady || !userProfile) return;

    const isProfileIncomplete = !userProfile.is_profile_complete;
    // Current route check - safely get screen name inside (app)
    const currentScreen = segments.length > 1 ? segments[1] : '';
    
    // ✅ UPDATED: Allowed screens jab profile incomplete ho (thank-you added for Cal intro)
    const allowedScreensWhenIncomplete = ['profile', 'welcome-video', 'thank-you'];
    const isOnAllowedScreen = allowedScreensWhenIncomplete.includes(currentScreen as string);

    // Agar profile incomplete hai aur user allowed screen par nahi hai
    if (isProfileIncomplete && !isOnAllowedScreen) {
      // Small delay to avoid React navigation race condition
      const timer = setTimeout(() => {
        // ✅ FIX: Check if user has seen Cal's intro (hasSeenWingmanPrompt)
        // If not, send to thank-you first, otherwise send to profile
        const hasSeenIntro = userProfile.hasSeenWingmanPrompt === true;
        
        if (hasSeenIntro) {
          console.log('[AppLayout] Profile incomplete, Cal intro already seen, redirecting to profile screen');
          router.replace('/(app)/profile');
        } else {
          console.log('[AppLayout] Profile incomplete, showing Cal intro first');
          router.replace('/(app)/thank-you');
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isReady, userProfile, segments, router]);

  // Jab tak AuthContext ready nahi hota, loading dikhayein
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  // Jab session ready ho, screens dikhayein
  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
});
