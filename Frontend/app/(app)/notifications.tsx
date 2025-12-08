// File: app/(app)/notifications.tsx
// ✅ COMPLETE AND FINAL UPDATED CODE
// ✅✅✅ FIXED: Added One-Time Tutorial Logic (Persistent) ✅✅✅
// ✅✅✅ FIXED: Tutorial Highlights Refresh Button & List Area ✅✅✅

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar as RNStatusBar,
  RefreshControl,
  Modal,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { colors } from '../../utils/theme';
import { getMyNotifications, markNotificationsAsRead } from '../../api/api';
import { Notification } from '../../types/Notification';
import { getItemAsync, setItemAsync } from 'expo-secure-store'; // ✅ For local tutorial persistence

const BACK_ARROW_ICON = require('../../assets/back_arrow_icon.png');
const NOTIFICATION_BELL_ICON = require('../../assets/notification_bell_icon.png');
const calcHappyIcon = require('../../assets/calc-happy.png');
const calcErrorIcon = require('../../assets/calc-error.png');

// --- CONSTANTS ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TUTORIAL_STORAGE_KEY = 'has_seen_notifications_tutorial_v1';

// --- TUTORIAL GLOW OVERLAY COMPONENT ---
const TutorialGlowOverlay = ({ visible, step, onNext, onFinish }) => {
  if (!visible || !step) return null;
  const { text, targetLayout, isLast } = step;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const hasTarget = targetLayout && targetLayout.width > 0;

  // Calculate masks
  const maskTopHeight = hasTarget ? Math.max(0, targetLayout.y) : 0;
  const maskBottomTop = hasTarget ? targetLayout.y + targetLayout.height : SCREEN_HEIGHT;
  const maskLeftWidth = hasTarget ? targetLayout.x : 0;
  const maskRightLeft = hasTarget ? targetLayout.x + targetLayout.width : SCREEN_WIDTH;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.tutorialOverlayContainer}>
        {hasTarget ? (
          <>
            {/* Top Mask */}
            <View style={[styles.maskPart, { top: 0, height: maskTopHeight, width: '100%' }]} />
            {/* Bottom Mask */}
            <View
              style={[
                styles.maskPart,
                {
                  top: maskBottomTop,
                  height: Math.max(0, SCREEN_HEIGHT - maskBottomTop),
                  width: '100%',
                },
              ]}
            />
            {/* Left Mask */}
            <View
              style={[
                styles.maskPart,
                { top: targetLayout.y, height: targetLayout.height, width: maskLeftWidth, left: 0 },
              ]}
            />
            {/* Right Mask */}
            <View
              style={[
                styles.maskPart,
                {
                  top: targetLayout.y,
                  height: targetLayout.height,
                  width: Math.max(0, SCREEN_WIDTH - maskRightLeft),
                  left: maskRightLeft,
                },
              ]}
            />

            {/* Glowing Border */}
            <Animated.View
              style={{
                position: 'absolute',
                top: targetLayout.y,
                left: targetLayout.x,
                width: targetLayout.width,
                height: targetLayout.height,
                borderRadius: 12,
                borderWidth: 3,
                borderColor: colors.GoldPrimary,
                transform: [{ scale: pulseAnim }],
                shadowColor: colors.GoldPrimary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 10,
                zIndex: 10,
              }}
            />
          </>
        ) : (
          <View style={styles.maskPartFull} />
        )}

        <View style={[styles.tutorialBubbleContainer, { bottom: 80 }]}>
          <Image source={calcHappyIcon} style={styles.tutorialCalImage} />
          <View style={styles.tutorialBubble}>
            <Text style={styles.tutorialText}>{text}</Text>
            <TouchableOpacity
              style={styles.tutorialNextButton}
              onPress={isLast ? onFinish : onNext}>
              <Text style={styles.tutorialButtonText}>{isLast ? 'Got it!' : 'Next'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// --- BUBBLE POPUP COMPONENT ---
const BubblePopup = ({ visible, type, title, message, buttonText, onClose }) => {
  if (!visible) {
    return null;
  }
  const isSuccess = type === 'success';
  const imageSource = isSuccess ? calcHappyIcon : calcErrorIcon;
  const buttonStyle = isSuccess ? styles.successButton : styles.errorButton;
  const buttonTextStyle = isSuccess ? styles.successButtonText : styles.errorButtonText;
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.popupContainer}>
          <Image source={imageSource} style={styles.popupImage} />
          <View style={styles.bubble}>
            <Text style={styles.popupTitle}>{title}</Text>
            <Text style={styles.popupMessage}>{message}</Text>
            <TouchableOpacity style={[styles.popupButton, buttonStyle]} onPress={onClose}>
              <Text style={buttonTextStyle}>{buttonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getNotificationIcon = (notificationType: string) => {
  if (notificationType === 'MATCH_PROPOSAL' || notificationType.startsWith('DATE_APPROVED')) {
    return calcHappyIcon;
  }
  if (notificationType === 'DATE_DECLINED' || notificationType === 'DATE_CANCELLED') {
    return calcErrorIcon;
  }
  return calcHappyIcon;
};

const NotificationItem = ({
  item,
  onPress,
}: {
  item: Notification;
  onPress: (item: Notification) => void;
}) => (
  <TouchableOpacity
    style={[styles.notificationItem, item.status === 'unread' && styles.unreadItem]}
    onPress={() => onPress(item)}>
    <Image source={getNotificationIcon(item.type)} style={styles.notificationIcon} />
    <View style={styles.notificationContent}>
      <Text style={styles.notificationMessage}>{item.message}</Text>
      <Text style={styles.notificationTimestamp}>
        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
      </Text>
    </View>
    {item.status === 'unread' && <View style={styles.unreadDot} />}
  </TouchableOpacity>
);

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [popupState, setPopupState] = useState({
    visible: false,
    type: 'error' as 'success' | 'error',
    title: '',
    message: '',
  });

  // --- TUTORIAL STATE ---
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [layouts, setLayouts] = useState<any>({});

  // Refs for highlighting
  const refreshButtonRef = useRef<View>(null);
  const listAreaRef = useRef<View>(null);

  const showPopup = (title: string, message: string, type: 'success' | 'error' = 'error') => {
    setPopupState({ visible: true, title, message, type });
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await getMyNotifications();
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      showPopup('Load Failed', 'Could not load notifications. Please try again.', 'error');
    }
  }, []);

  // Check Tutorial Status on Mount
  useEffect(() => {
    const checkTutorial = async () => {
      try {
        const hasSeen = await getItemAsync(TUTORIAL_STORAGE_KEY);
        if (!hasSeen) {
          // Slight delay to ensure UI renders
          setTimeout(() => {
            setTutorialStep(0);
          }, 500);
        }
      } catch (e) {
        console.log('Error checking tutorial status:', e);
      }
    };

    setIsLoading(true);
    fetchNotifications().finally(() => {
      setIsLoading(false);
      checkTutorial();
    });
  }, [fetchNotifications]);

  useFocusEffect(
    useCallback(() => {
      console.log('Notifications screen focused. Marking notifications as read.');
      markNotificationsAsRead().catch((err) => {
        console.error('Failed to mark notifications as read:', err);
      });
      fetchNotifications();
    }, [fetchNotifications])
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
  }, [fetchNotifications]);

  const handleNotificationPress = (item: Notification) => {
    switch (item.type) {
      case 'ATTRACTION_PROPOSAL':
        if (item.related_entity_id) {
          router.push({
            pathname: '/(app)/stories',
            params: { date: item.related_entity_id },
          });
        } else {
          router.push('/(app)/calendar');
        }
        break;
      case 'MATCH_PROPOSAL':
        if (item.related_entity_id && item.proposing_user_id) {
          router.push({
            pathname: '/(app)/propose-date',
            params: {
              userToId: String(item.proposing_user_id),
              dateForProposal: String(item.related_entity_id),
            },
          });
        }
        break;
      case 'DATE_CONFLICT':
        router.push('/(app)/calendar');
        break;
      case 'DATE_NEEDS_RESCHEDULING':
      case 'DATE_PROPOSAL':
      case 'DATE_APPROVED':
      case 'DATE_DECLINED':
      case 'DATE_RESCHEDULED':
      case 'DATE_CANCELLED':
        if (item.related_entity_id) {
          router.push(`/(app)/dates/${String(item.related_entity_id)}`);
        }
        break;
      default:
        console.log('No specific navigation action for this notification type:', item.type);
        break;
    }
  };

  // --- TUTORIAL LOGIC ---
  const updateLayouts = () => {
    if (refreshButtonRef.current) {
      refreshButtonRef.current.measureInWindow((x, y, width, height) => {
        setLayouts((prev) => ({ ...prev, refresh: { x, y, width, height } }));
      });
    }
    if (listAreaRef.current) {
      listAreaRef.current.measureInWindow((x, y, width, height) => {
        setLayouts((prev) => ({ ...prev, list: { x, y, width, height } }));
      });
    }
  };

  useEffect(() => {
    if (tutorialStep !== null) {
      setTimeout(updateLayouts, 200);
    }
  }, [tutorialStep]);

  const TUTORIAL_STEPS = useMemo(
    () => [
      {
        text: 'Stay in the loop! This is your Notification Hub where new matches and date updates appear.',
        targetLayout: layouts.list || null,
      },
      {
        text: "Don't miss out—tap Refresh here anytime to make sure you have the latest updates.",
        targetLayout: layouts.refresh || null,
        isLast: true,
      },
    ],
    [layouts]
  );

  const handleNextTutorial = () => {
    if (tutorialStep !== null) setTutorialStep(tutorialStep + 1);
  };

  const handleFinishTutorial = async () => {
    setTutorialStep(null);
    try {
      await setItemAsync(TUTORIAL_STORAGE_KEY, 'true');
    } catch (e) {
      console.error('Failed to save tutorial status', e);
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Image source={NOTIFICATION_BELL_ICON} style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No New Notifications</Text>
      <Text style={styles.emptySubtitle}>
        When you get new matches or date proposals, they will appear here.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Image source={BACK_ARROW_ICON} style={styles.headerIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>

        {/* ✅ Refresh Button Targeted for Tutorial */}
        <View ref={refreshButtonRef} collapsable={false}>
          <TouchableOpacity style={styles.headerButton} onPress={onRefresh} disabled={isRefreshing}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ✅ List Area Targeted for Tutorial */}
      <View style={{ flex: 1 }} ref={listAreaRef} collapsable={false}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.GoldPrimary} />
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={({ item }) => (
              <NotificationItem item={item} onPress={handleNotificationPress} />
            )}
            keyExtractor={(item) => String(item.notification_id)}
            ListEmptyComponent={renderEmptyState}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={colors.White}
              />
            }
          />
        )}
      </View>

      <BubblePopup
        visible={popupState.visible}
        type={popupState.type}
        title={popupState.title}
        message={popupState.message}
        buttonText="OK"
        onClose={() => setPopupState((prev) => ({ ...prev, visible: false }))}
      />

      {/* ✅ TUTORIAL OVERLAY */}
      <TutorialGlowOverlay
        visible={tutorialStep !== null}
        step={tutorialStep !== null ? TUTORIAL_STEPS[tutorialStep] : null}
        onNext={handleNextTutorial}
        onFinish={handleFinishTutorial}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.Background || '#121212',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.DarkGrey || '#333',
  },
  headerButton: { padding: 8 },
  headerIcon: { width: 24, height: 24 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.White || '#FFFFFF' },
  refreshButtonText: {
    color: colors.White || '#FFFFFF',
    fontSize: 16,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.Background || '#121212',
  },
  notificationIcon: { width: 50, height: 50, resizeMode: 'contain', marginRight: 15 },
  unreadItem: { backgroundColor: colors.DarkGrey || '#1E1E1E' },
  notificationContent: { flex: 1 },
  notificationMessage: { fontSize: 16, color: colors.White || '#FFFFFF' },
  notificationTimestamp: { fontSize: 13, color: colors.LightGrey || '#B0B0B0', marginTop: 4 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.TealPrimary || '#00BCD4',
    marginLeft: 15,
  },
  separator: { height: 1, backgroundColor: colors.DarkGrey || '#333', marginLeft: 85 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: '30%',
  },
  emptyIcon: { width: 80, height: 80, tintColor: colors.Grey || '#888', marginBottom: 20 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.White || '#FFFFFF',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: colors.LightGrey || '#B0B0B0',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  popupContainer: { alignItems: 'center', width: '100%', maxWidth: 350 },
  popupImage: { width: 220, height: 220, resizeMode: 'contain', zIndex: 1, marginBottom: -80 },
  bubble: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 20,
    paddingTop: 90,
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
    marginBottom: 25,
    lineHeight: 24,
  },
  popupButton: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  errorButton: { backgroundColor: colors.PinkPrimary || '#FF6B6B' },
  successButton: { backgroundColor: colors.GoldPrimary || '#FFD700' },
  errorButtonText: { color: colors.White || '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  successButtonText: { color: colors.Black || '#000000', fontSize: 15, fontWeight: 'bold' },

  // --- TUTORIAL OVERLAY STYLES ---
  tutorialOverlayContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  maskPart: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  maskPartFull: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  tutorialBubbleContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 20,
  },
  tutorialCalImage: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: -50,
    zIndex: 22,
  },
  tutorialBubble: {
    width: '100%',
    backgroundColor: colors.White || '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
    zIndex: 21,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  tutorialText: {
    fontSize: 16,
    color: colors.LightBlack || '#222B45',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  tutorialNextButton: {
    backgroundColor: colors.GoldPrimary || '#FFDB5C',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  tutorialButtonText: { color: colors.Black || '#000000', fontSize: 15, fontWeight: 'bold' },
});
