// File: app/(app)/index.tsx
// ✅ COMPLETE AND FINAL UPDATED CODE
// ✅✅✅ FIXED: Changed "where" to "when" in Cal's prompt as per the image requirement ✅✅✅
// ✅✅✅ NOTE: Restored the Wingman Prompt logic with the text correction.

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import VideoCalendar from '../../components/calendar';
import { colors } from '../../utils/theme';
import { useUserStore } from '../../store/useUserStore';
import {
  getCalendarDaysByUserId,
  getUnreadNotificationsCount,
  getUpcomingDates,
  addDateFeedback,
  resolveDateConflict,
  markCalendarTutorialAsSeen,
  markWingmanPromptAsSeen,
} from '../../api/api';
import { CalendarDay } from '../../types/CalendarDay';
import { UpcomingDate, DateOutcome } from '../../types/Date';
import { useRouter, useFocusEffect } from 'expo-router';
import { format, isPast, isValid } from 'date-fns';
import { Avatar } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

// Asset Imports
const LOGO_IMAGE = require('../../assets/brand.png');
const calcHappyIcon = require('../../assets/calc-happy.png');
const calcErrorIcon = require('../../assets/calc-error.png');

// --- CONSTANTS ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- CAL'S ROTATING PROMPTS ---
// ✅ FIXED: Changed "where" to "when" in the first prompt
const WHEN_PROMPTS = [
  'Hey hey, so first I need to know when you want to plan this meetup?', // <--- CHANGED FROM "where" TO "when"
  "When should I tell them you're free?",
  "Pick a date, and I'll handle the rest.",
  'Lock in a day to meet someone new.',
  'What date do you have in mind?',
];
let whenPromptIndex = 0;

// ✅ NEW: Wingman Introduction Messages (Multi-step with Next button)
const WINGMAN_INTRO_MESSAGES = [
  {
    title: "Hey there! 👋",
    message: "I'm Cal, your personal wingman on Daytz! I'll be here to guide you through setting up dates and making connections."
  },
  {
    title: "How It Works",
    message: "Post a video story on a day you're free, and others nearby who are also free that day can see it and express interest!"
  },
  {
    title: "Ready to Get Started?",
    message: "Pick a date on the calendar when you're free, and let's find someone great for you to meet!"
  }
];

const parseDateOnlyLocal = (dateStr?: string | null): Date | null => {
  if (!dateStr) return null;
  const s = dateStr.substring(0, 10);
  const [y, m, d] = s.split('-').map((n) => parseInt(n, 10));
  if (!y || isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};
const buildLocalDateTime = (dateStr?: string | null, timeStr?: string | null): Date | null => {
  const base = parseDateOnlyLocal(dateStr);
  if (!base || !timeStr) return base;
  const parts = timeStr.split(':');
  if (parts.length < 2) return base;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return base;
  base.setHours(h, m, 0, 0);
  return base;
};

// --- TUTORIAL GLOW COMPONENT ---
const TutorialGlowOverlay = ({ visible, step, onNext, onFinish }) => {
  if (!visible || !step) return null;
  const { text, targetLayout, isLast } = step;

  // Animation Values
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

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.tutorialOverlayContainer}>
        {hasTarget ? (
          <>
            {/* Masks to darken area around the highlight */}
            <View
              style={[
                styles.maskPart,
                { top: 0, height: Math.max(0, targetLayout.y), width: '100%' },
              ]}
            />
            <View
              style={[
                styles.maskPart,
                {
                  top: targetLayout.y + targetLayout.height,
                  height: Math.max(0, SCREEN_HEIGHT - (targetLayout.y + targetLayout.height)),
                  width: '100%',
                },
              ]}
            />
            <View
              style={[
                styles.maskPart,
                {
                  top: targetLayout.y,
                  height: targetLayout.height,
                  width: targetLayout.x,
                  left: 0,
                },
              ]}
            />
            <View
              style={[
                styles.maskPart,
                {
                  top: targetLayout.y,
                  height: targetLayout.height,
                  width: Math.max(0, SCREEN_WIDTH - (targetLayout.x + targetLayout.width)),
                  left: targetLayout.x + targetLayout.width,
                },
              ]}
            />

            {/* The GLOW Border */}
            <Animated.View
              style={{
                position: 'absolute',
                top: targetLayout.y,
                left: targetLayout.x,
                width: targetLayout.width,
                height: targetLayout.height,
                borderRadius: 20, // Increased radius for better circle look on icons
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

        {/* Cal Bubble */}
        <View
          style={[
            styles.tutorialBubbleContainer,
            hasTarget && targetLayout.y > SCREEN_HEIGHT / 2
              ? { bottom: undefined, top: 80 }
              : { bottom: 80 },
          ]}>
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

// ✅ NEW: Wingman Intro Popup Component (Multi-step with Next button)
const WingmanIntroPopup = ({ visible, currentStep, totalSteps, title, message, onNext, onFinish }) => {
  if (!visible) return null;
  const isLast = currentStep >= totalSteps - 1;
  
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onFinish}>
      <View style={styles.overlay}>
        <View style={styles.wingmanIntroContainer}>
          <Image source={calcHappyIcon} style={styles.wingmanIntroImage} />
          <View style={styles.wingmanIntroBubble}>
            {/* Progress Dots */}
            <View style={styles.progressDotsContainer}>
              {Array.from({ length: totalSteps }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index === currentStep && styles.progressDotActive,
                    index < currentStep && styles.progressDotCompleted,
                  ]}
                />
              ))}
            </View>
            
            <Text style={styles.wingmanIntroTitle}>{title}</Text>
            <Text style={styles.wingmanIntroMessage}>{message}</Text>
            
            <TouchableOpacity
              style={styles.wingmanIntroButton}
              onPress={isLast ? onFinish : onNext}>
              <Text style={styles.wingmanIntroButtonText}>
                {isLast ? "Let's Go!" : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// --- DUMMY DATE FOR TUTORIAL ---
const DEMO_DATE: UpcomingDate = {
  dateId: 99999,
  userFrom: 'demo',
  userTo: 'demo',
  date: format(new Date(), 'yyyy-MM-dd'),
  time: '19:00:00',
  status: 'approved',
  romanticRating: 3,
  sexualRating: 0,
  friendshipRating: 0,
  otherUser: {
    userId: 'demo_partner',
    firstName: 'Sarah',
    lastName: 'Example',
    profilePictureUrl: 'https://via.placeholder.com/150',
  },
  locationMetadata: { name: 'Starbucks Downtown' },
  created_at: new Date().toISOString(),
  is_read: true,
};

// --- Feedback Modal ---
const FeedbackModal = ({ visible, onClose, onSubmit }) => {
  const [selectedOutcome, setSelectedOutcome] = useState<DateOutcome | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const handleSelectOutcome = (outcome: DateOutcome) => {
    setSelectedOutcome(outcome);
  };
  const handleSubmit = async () => {
    if (!selectedOutcome) {
      Alert.alert('Selection Required', 'Please select how your date went.');
      return;
    }
    setIsLoading(true);
    await onSubmit({ outcome: selectedOutcome, notes });
    setIsLoading(false);
  };
  useEffect(() => {
    if (!visible) {
      setSelectedOutcome(null);
      setNotes('');
      setIsLoading(false);
    }
  }, [visible]);
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[styles.modalContainer, { borderTopLeftRadius: 20, borderTopRightRadius: 20 }]}>
          <Text style={styles.modalTitle}>How was your date?</Text>
          <Text style={styles.modalSubtitle}>
            Let us know your experience to improve your matches.
          </Text>
          <View style={styles.feedbackOptionsContainer}>
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                styles.fullWidthButton,
                styles.amazingButton,
                selectedOutcome === 'amazing' && styles.selectedButton,
              ]}
              onPress={() => handleSelectOutcome('amazing')}>
              <Text style={styles.feedbackButtonText}>Date Went Amazing</Text>
            </TouchableOpacity>
            <View style={{ height: 10 }} />
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                styles.fullWidthButton,
                styles.noShowButton,
                selectedOutcome === 'no_show_cancelled' && styles.selectedButton,
              ]}
              onPress={() => handleSelectOutcome('no_show_cancelled')}>
              <Text style={styles.feedbackButtonText}>Stood Up / Cancelled</Text>
            </TouchableOpacity>
            <View style={{ height: 10 }} />
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                styles.fullWidthButton,
                styles.otherButton,
                selectedOutcome === 'other' && styles.selectedButton,
              ]}
              onPress={() => handleSelectOutcome('other')}>
              <Text style={styles.feedbackButtonText}>Other</Text>
            </TouchableOpacity>
          </View>
          {selectedOutcome === 'other' && (
            <TextInput
              style={styles.notesInput}
              placeholder="Tell us more about your date... (max 2500 characters)"
              placeholderTextColor={colors.placeholderTextColor || '#9CA4A4'}
              multiline
              maxLength={2500}
              value={notes}
              onChangeText={setNotes}
            />
          )}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
            <View style={{ width: 10 }} />
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedOutcome || isLoading) && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={!selectedOutcome || isLoading}>
              {isLoading ? (
                <ActivityIndicator color={colors.White} />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// --- General Bubble Popup ---
const BubblePopup = ({ visible, type, title, message, buttonText, onClose }) => {
  if (!visible) return null;
  const isSuccess = type === 'success';
  const imageSource = isSuccess ? calcHappyIcon : calcErrorIcon;
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.popupContainer}>
          <Image source={imageSource} style={styles.popupImage} />
          <View style={styles.bubble}>
            <Text style={styles.popupTitle}>{title}</Text>
            <Text style={styles.popupMessage}>{message}</Text>
            <TouchableOpacity
              style={[styles.popupButton, isSuccess ? styles.successButton : styles.errorButton]}
              onPress={onClose}>
              <Text style={isSuccess ? styles.successButtonText : styles.errorButtonText}>
                {buttonText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ConflictResolutionModal = ({ visible, onClose, onResolve, proposalDate, originalDate }) => {
  if (!visible || !proposalDate || !originalDate) return null;
  const [isSubmitting, setIsSubmitting] = useState('');
  const handleResolve = async (resolution) => {
    setIsSubmitting(resolution);
    await onResolve(resolution);
    setIsSubmitting('');
  };
  const originalDateTime = buildLocalDateTime(originalDate.date, originalDate.time);
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { justifyContent: 'center' }]}>
        <View style={styles.conflictModalContainer}>
          <Ionicons
            name="alert-circle"
            size={48}
            color={colors.GoldPrimary}
            style={{ alignSelf: 'center', marginBottom: 10 }}
          />
          <Text style={styles.modalTitle}>You have a conflict!</Text>
          <Text style={styles.modalSubtitle}>
            You have a confirmed date with{' '}
            <Text style={{ fontWeight: 'bold' }}>{originalDate.otherUser.firstName}</Text> at{' '}
            {isValid(originalDateTime) ? format(originalDateTime, 'p') : 'this time'}.
          </Text>
          <Text style={styles.modalSubtitle}>
            <Text style={{ fontWeight: 'bold' }}>{proposalDate.otherUser.firstName}</Text> would
            also like to meet at the same time.
          </Text>
          <Text style={[styles.modalSubtitle, { marginTop: 15, fontStyle: 'italic' }]}>
            Please choose one to proceed:
          </Text>
          <View style={styles.modalActionsFullWidth}>
            <TouchableOpacity
              style={[styles.modalButton, styles.acceptNewButton]}
              onPress={() => handleResolve('ACCEPT_NEW')}
              disabled={!!isSubmitting}>
              {isSubmitting === 'ACCEPT_NEW' ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.acceptNewButtonText}>Accept New Date</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.keepOriginalButton]}
              onPress={() => handleResolve('KEEP_ORIGINAL')}
              disabled={!!isSubmitting}>
              {isSubmitting === 'KEEP_ORIGINAL' ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.keepOriginalButtonText}>Keep My Original Plan</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getTypeOfAttraction = (r, s, f) => {
  const interest = r + s + f;
  if (interest === 0) return 'Not Specified';
  if (s === 0 && r === 0 && f === 0) return 'No Interest';
  if (r === 0 && f === 0) return 'Hook Up';
  if (r === 0 && s === 0) return 'Friends!';
  if (f === 0 && s === 0) return 'Company';
  if (r === 0) return 'FWB';
  if (s === 0) return 'Platonic Dating';
  if (f === 0) return 'Lovers';
  if (interest < 5) return 'We Could Meet';
  if (interest === 5) return "I'm Into It";
  if (interest === 6) return 'Would Love to Meet';
  return 'My Person!';
};

const UpcomingDateItem = ({ item, onPress, onRatePress, onResolveConflictPress }) => {
  if (!item || !item.otherUser) return null;
  const localDateTime = useMemo(
    () => buildLocalDateTime(item.date, item.time),
    [item.date, item.time]
  );
  const attractionType = getTypeOfAttraction(
    item.romanticRating,
    item.sexualRating,
    item.friendshipRating
  );
  const isDateInPast = !!localDateTime && isPast(localDateTime);
  const hasGivenFeedback = !!item.myOutcome;
  const currentUserId = useUserStore.getState().userProfile?.userId;

  // Check normal pending states
  const isPendingMyResponse =
    item.status === 'pending' &&
    ((item.userFrom === currentUserId && !item.userFromApproved) ||
      (item.userTo === currentUserId && !item.userToApproved));

  // ✅ New Logic: Conflict Handling
  // Only the RECIPIENT of the conflict (userTo) should resolve it.
  const isConflictPending = item.status === 'pending_conflict' && item.userTo === currentUserId;

  // The SENDER (userFrom) should just see "waiting"
  const isConflictWaiting = item.status === 'pending_conflict' && item.userFrom === currentUserId;

  // Check awaiting response
  const isAwaitingTheirResponse =
    (item.status === 'pending' &&
      ((item.userFrom === currentUserId && item.userFromApproved && !item.userToApproved) ||
        (item.userTo === currentUserId && item.userToApproved && !item.userFromApproved))) ||
    isConflictWaiting; // ✅ Treat conflict waiting same as normal waiting

  return (
    <TouchableOpacity style={styles.upcomingItem} onPress={() => onPress(item)}>
      <Avatar.Image size={52} source={{ uri: item.otherUser.profilePictureUrl }} />
      <View style={styles.upcomingItemDetails}>
        <Text style={styles.upcomingItemName} numberOfLines={1}>
          {item.otherUser.firstName}
        </Text>
        <Text style={styles.upcomingItemInfo} numberOfLines={1}>
          {isValid(localDateTime) ? format(localDateTime, 'MMMM dd, yyyy') : 'Invalid Date'} at{' '}
          {item.locationMetadata?.name || 'N/A'}
        </Text>
        <Text style={styles.upcomingItemTime}>
          {isValid(localDateTime) ? format(localDateTime, 'p') : 'Time not set'}
        </Text>
        {(item.romanticRating > 0 || item.sexualRating > 0 || item.friendshipRating > 0) && (
          <View style={styles.attractionTypeContainer}>
            <Ionicons name="heart-circle" size={16} color={colors.PinkPrimary} />
            <Text style={styles.attractionTypeText}>{attractionType}</Text>
          </View>
        )}
      </View>
      <View style={styles.statusSection}>
        {isConflictPending ? (
          <TouchableOpacity
            style={styles.resolveConflictButton}
            onPress={(e) => {
              e.stopPropagation();
              onResolveConflictPress(item);
            }}>
            <Ionicons name="alert-circle-outline" size={16} color="#000" />
            <Text style={styles.resolveConflictButtonText}>Resolve</Text>
          </TouchableOpacity>
        ) : (
          <>
            {item.status === 'approved' && (
              <View style={styles.statusContainer}>
                <Ionicons name="checkmark-circle" size={20} color={colors.Success} />
                <Text style={styles.statusText}>Confirmed</Text>
              </View>
            )}
            {isPendingMyResponse && (
              <View style={styles.pendingStatusContainer}>
                <Ionicons name="hourglass-outline" size={18} color={colors.GoldPrimary} />
                <Text style={styles.pendingStatusText}>Response needed</Text>
              </View>
            )}
            {isAwaitingTheirResponse && (
              <View style={styles.pendingStatusContainer}>
                <Ionicons name="time-outline" size={18} color={colors.LightGrey} />
                <Text style={styles.pendingStatusText}>Awaiting</Text>
              </View>
            )}
            {item.status === 'needs_rescheduling' && (
              <View style={styles.rescheduleStatusContainer}>
                <Ionicons name="repeat" size={16} color={'#FFA500'} />
                <Text style={styles.rescheduleStatusText}>Reschedule</Text>
              </View>
            )}
            {hasGivenFeedback ? (
              <Text style={styles.feedbackSentText}>Feedback Sent</Text>
            ) : isDateInPast ? (
              <TouchableOpacity style={styles.rateButton} onPress={() => onRatePress(item)}>
                <Text style={styles.rateButtonText}>Rate Date</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ height: 28 }} />
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const CalendarHomeScreen = () => {
  const { auth0User, isReady: isAuthReady, isLoading: isAuthLoading } = useAuth();
  const { userProfile, updateUserProfileOptimistic, showThankYouAfterAuth, setShowThankYouAfterAuth, showWelcomeBackPopup, setShowWelcomeBackPopup } = useUserStore();
  const router = useRouter();

  const [isCalendarLoading, setIsCalendarLoading] = useState(true);
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [upcomingDates, setUpcomingDates] = useState<UpcomingDate[]>([]);
  const [isUpcomingLoading, setIsUpcomingLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFeedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedDateForFeedback, setSelectedDateForFeedback] = useState<UpcomingDate | null>(null);
  const [popupState, setPopupState] = useState({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });
  const [isConflictModalVisible, setConflictModalVisible] = useState(false);
  const [selectedDateForConflict, setSelectedDateForConflict] = useState<UpcomingDate | null>(null);

  // Tutorial States
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [layouts, setLayouts] = useState<any>({});
  const scrollViewRef = useRef<ScrollView>(null);
  
  // ✅ Wingman Intro State (Multi-step popup)
  const [wingmanIntroStep, setWingmanIntroStep] = useState<number | null>(null);
  
  // ✅ NEW: Welcome Back Popup State for returning users
  const [welcomeBackPopupVisible, setWelcomeBackPopupVisible] = useState(false);

  // Refs for precise measurement (FIX FOR OVERLAY POSITION)
  const headerRef = useRef<View>(null);
  const notificationRef = useRef<View>(null);
  const calendarRef = useRef<View>(null);
  const bottomNavRef = useRef<View>(null);

  // useEffect for Tutorial Step Changes
  useEffect(() => {
    if (tutorialStep !== null && scrollViewRef.current) {
      const step = TUTORIAL_STEPS[tutorialStep];
      if (step?.scrollTo) {
        scrollViewRef.current.scrollTo({ y: step.scrollTo, animated: true });
      }
    }
  }, [tutorialStep, isCalendarLoading]);

  // ✅ Wingman Prompt for NEW users who just completed profile setup
  const { profileJustCompletedForNav } = useUserStore();
  const [wingmanCheckComplete, setWingmanCheckComplete] = useState(false);
  
  useEffect(() => {
    if (!userProfile) {
      return;
    }
    
    if (userProfile.is_profile_complete === true) {
      setWingmanCheckComplete(true);
      return;
    }
    
    if (userProfile.hasSeenWingmanPrompt === true) {
      setWingmanCheckComplete(true);
      return;
    }
    
    if (!profileJustCompletedForNav) {
      setWingmanCheckComplete(true);
      return;
    }
    
    if (!userProfile?.hasSeenCalendarTutorial) {
      setWingmanCheckComplete(true);
      return;
    }
    
    const timer = setTimeout(() => {
      if (profileJustCompletedForNav && !userProfile.hasSeenWingmanPrompt) {
        setWingmanIntroStep(0);
      }
      setWingmanCheckComplete(true);
    }, 300);
    
    return () => clearTimeout(timer);
    
  }, [profileJustCompletedForNav, userProfile?.hasSeenCalendarTutorial, userProfile?.hasSeenWingmanPrompt, userProfile?.is_profile_complete, userProfile]);

  // ✅ Handler for Wingman Intro Next button
  const handleWingmanIntroNext = () => {
    if (wingmanIntroStep !== null && wingmanIntroStep < WINGMAN_INTRO_MESSAGES.length - 1) {
      setWingmanIntroStep(wingmanIntroStep + 1);
    }
  };

  // ✅ Handler for Wingman Intro Finish
  const handleWingmanIntroFinish = async () => {
    setWingmanIntroStep(null);
    try {
      await markWingmanPromptAsSeen();
      updateUserProfileOptimistic({ hasSeenWingmanPrompt: true });
    } catch (error) {
      console.error('Failed to mark wingman prompt as seen:', error);
    }
  };

  // ✅ NEW: Show Welcome Back popup for returning users (NO routing, NO flash)
  useEffect(() => {
    if (showWelcomeBackPopup && userProfile?.is_profile_complete) {
      console.log('[Calendar] Showing Welcome Back popup for returning user');
      setWelcomeBackPopupVisible(true);
      setShowWelcomeBackPopup(false); // Clear flag immediately
    }
  }, [showWelcomeBackPopup, userProfile, setShowWelcomeBackPopup]);

  // Function to measure layout in absolute window coordinates
  // This solves the issue where highlight is shifted up by header height
  const updateLayouts = () => {
    if (headerRef.current) {
      headerRef.current.measureInWindow((x, y, width, height) => {
        setLayouts((prev) => ({ ...prev, header: { x, y, width, height } }));
      });
    }
    // ✅ MEASURE NOTIFICATION ICON SPECIFICALLY
    if (notificationRef.current) {
      notificationRef.current.measureInWindow((x, y, width, height) => {
        // Adjust padding slightly to make the circle look good
        const padding = 4;
        setLayouts((prev) => ({
          ...prev,
          notification: {
            x: x - padding,
            y: y - padding,
            width: width + padding * 2,
            height: height + padding * 2,
          },
        }));
      });
    }
    if (calendarRef.current) {
      calendarRef.current.measureInWindow((x, y, width, height) => {
        setLayouts((prev) => ({ ...prev, calendar: { x, y, width, height } }));
      });
    }
    if (bottomNavRef.current) {
      bottomNavRef.current.measureInWindow((x, y, width, height) => {
        setLayouts((prev) => ({ ...prev, plans: { x, y, width, height } }));
      });
    }
  };

  // Trigger measurement when tutorial starts or step changes
  useEffect(() => {
    if (tutorialStep !== null) {
      // Small delay to ensure rendering is complete
      setTimeout(updateLayouts, 200);
    }
  }, [tutorialStep, isCalendarLoading]);

  const showPopup = (title: string, message: string, type = 'success') =>
    setPopupState({ visible: true, type, title, message });

  const fetchAllScreenData = useCallback(async () => {
    if (!auth0User?.sub || !userProfile?.userId) return;
    if (!isRefreshing) {
      setIsCalendarLoading(true);
      setIsUpcomingLoading(true);
    }
    try {
      const [calRes, upRes, countRes] = await Promise.all([
        getCalendarDaysByUserId(),
        getUpcomingDates(),
        getUnreadNotificationsCount(),
      ]);
      const validDates = (upRes.data || []).filter((item) => item && item.date && item.otherUser);
      setUnreadCount(countRes.data.unreadCount);
      setCalendarData(calRes.data);
      setUpcomingDates(validDates);
    } catch (error) {
      console.error('Failed to fetch screen data:', error);
      showPopup('Load Failed', 'Could not load your calendar data. Please try again.', 'error');
    } finally {
      setIsCalendarLoading(false);
      setIsUpcomingLoading(false);
      setIsRefreshing(false);
    }
  }, [auth0User, isRefreshing, userProfile]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthReady && !isAuthLoading) {
        fetchAllScreenData();
      }
      // Start Tutorial check
      if (userProfile && userProfile.hasSeenCalendarTutorial === false) {
        const timer = setTimeout(() => {
          // Check again to be safe
          if (useUserStore.getState().userProfile?.hasSeenCalendarTutorial === false) {
            setTutorialStep(0);
          }
        }, 800);
        return () => clearTimeout(timer);
      }
    }, [isAuthReady, isAuthLoading, userProfile])
  );

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    if (isAuthReady) fetchAllScreenData();
    else setIsRefreshing(false);
  }, [isAuthReady, fetchAllScreenData]);

  const handleFeedbackSubmit = async (feedback) => {
    if (!selectedDateForFeedback) return;
    try {
      const res = await addDateFeedback(selectedDateForFeedback.dateId, feedback);
      setUpcomingDates(
        upcomingDates.map((d) =>
          d.dateId === selectedDateForFeedback.dateId
            ? { ...d, myOutcome: res.data.outcome, myNotes: res.data.notes }
            : d
        )
      );
      setFeedbackModalVisible(false);
      setSelectedDateForFeedback(null);
      showPopup('Thank You!', 'Your feedback has been submitted.', 'success');
    } catch {
      showPopup('Submission Failed', 'Could not submit your feedback. Please try again.', 'error');
    }
  };

  const handleDateItemPress = (item) => {
    // Prevent navigation if in tutorial and item is fake
    if (tutorialStep !== null && item.dateId === 99999) {
      return;
    }
    if (item.status === 'pending_conflict') {
      handleResolveConflictPress(item);
      return;
    }
    router.push(`/(app)/dates/${item.dateId}`);
  };
  const handleRatePress = (item) => {
    setSelectedDateForFeedback(item);
    setFeedbackModalVisible(true);
  };
  const handleResolveConflictPress = (item) => {
    setSelectedDateForConflict(item);
    setConflictModalVisible(true);
  };
  const handleResolveConflict = async (resolution) => {
    if (!selectedDateForConflict || !selectedDateForConflict.conflictsWithDateId) return;
    try {
      await resolveDateConflict({
        dateId: selectedDateForConflict.dateId,
        conflictingDateId: selectedDateForConflict.conflictsWithDateId,
        resolution,
      });
      setConflictModalVisible(false);
      showPopup(
        'Success!',
        resolution === 'ACCEPT_NEW'
          ? 'Your new date is confirmed!'
          : 'You kept your original plan.',
        'success'
      );
      fetchAllScreenData();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      showPopup('Error', 'Could not resolve the conflict. Please try again.', 'error');
    } finally {
      setSelectedDateForConflict(null);
    }
  };

  const handleNextTutorialStep = () => {
    if (tutorialStep !== null) {
      setTutorialStep(tutorialStep + 1);
      // If moving to list step, scroll down
      if (tutorialStep === 2 && scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }
  };

  const handleFinishTutorial = async () => {
    setTutorialStep(null);
    try {
      // Mark as seen in backend
      await markCalendarTutorialAsSeen();
      // Optimistically update store
      updateUserProfileOptimistic({ hasSeenCalendarTutorial: true });
    } catch (error) {
      console.error('Failed to mark calendar tutorial as seen:', error);
    }
  };

  const originalDateForConflict = useMemo(() => {
    if (!selectedDateForConflict || !selectedDateForConflict.conflictsWithDateId) return null;
    return upcomingDates.find((d) => d.dateId === selectedDateForConflict.conflictsWithDateId);
  }, [selectedDateForConflict, upcomingDates]);

  // --- TUTORIAL CONFIGURATION ---
  const TUTORIAL_STEPS = useMemo(() => {
    // ✅ NEW: Calculate "Legend" Position based on Calendar Position
    let legendLayout = null;
    if (layouts.calendar) {
      const legendHeight = 70; // Tight fit for legend
      legendLayout = {
        x: layouts.calendar.x,
        y: layouts.calendar.y + layouts.calendar.height - legendHeight,
        width: layouts.calendar.width,
        height: legendHeight,
      };
    }

    const steps = [
      {
        // ✅ UPDATED TEXT to match the user's request about notifications and limits
        text: 'Tap the bell icon to check notifications, view request examples, and see details on your limits.',
        // ✅ TARGETING THE BELL ICON SPECIFICALLY
        targetLayout: layouts.notification || null,
      },
      {
        text: 'This is your Calendar. Tap a day to post a video story or view others!',
        targetLayout: layouts.calendar || null,
      },
      {
        text: 'Keep an eye on these colors to know the status of your plans.',
        targetLayout: legendLayout || null,
      },
      {
        text: 'Here are your Upcoming Plans. Confirmed dates appear here!',
        targetLayout: layouts.plans || null,
      },
    ];
    return steps.map((step, index) => ({
      ...step,
      isLast: index === steps.length - 1,
    }));
  }, [layouts]);

  // Render Logic for Dummy Date during Tutorial
  const datesToRender = useMemo(() => {
    if (tutorialStep === 3 && upcomingDates.length === 0) {
      // If we are on the "Plans" step (index 3) and no real dates, show dummy
      return [DEMO_DATE];
    }
    return upcomingDates;
  }, [tutorialStep, upcomingDates]);

  if (!isAuthReady || isAuthLoading)
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.GoldPrimary} />
        </View>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        style={styles.topHeader}
        ref={headerRef} // ✅ Added ref for window measurement
        onLayout={updateLayouts} // Fallback trigger
      >
        <View style={styles.headerGroupLeft}>
          <Image source={LOGO_IMAGE} style={styles.logoImage} />
        </View>
        <View style={styles.headerGroupRight}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(app)/profile')}>
            <Ionicons name="person-outline" size={26} color={colors.White} />
          </TouchableOpacity>
          <View style={{ width: 20 }} />

          {/* ✅ UPDATED: Added Ref to this TouchableOpacity for the Tutorial Highlight */}
          <TouchableOpacity
            ref={notificationRef}
            onLayout={updateLayouts}
            style={styles.iconButton}
            onPress={() => {
              setUnreadCount(0);
              router.push('/(app)/notifications');
            }}>
            <Ionicons name="notifications-outline" size={26} color={colors.White} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.White}
          />
        }>
        {isCalendarLoading ? (
          <View style={[styles.loadingContainer, { minHeight: 400 }]}>
            <ActivityIndicator size="large" color={colors.GoldPrimary} />
          </View>
        ) : (
          <>
            {/* Calendar Wrapper */}
            <View
              ref={calendarRef} // ✅ Added ref for window measurement
              onLayout={updateLayouts} // Trigger update on layout
              style={{ marginBottom: 10 }}>
              <VideoCalendar
                user={auth0User}
                calendarData={calendarData}
                plannedDates={upcomingDates}
              />
            </View>
          </>
        )}

        <View
          ref={bottomNavRef} // ✅ Added ref for window measurement
          style={styles.upcomingSection}
          onLayout={updateLayouts}>
          <Text style={styles.upcomingTitle}>Upcoming & Past Plans</Text>

          {isUpcomingLoading && upcomingDates.length === 0 ? (
            <ActivityIndicator color={colors.White} style={{ marginTop: 20 }} />
          ) : datesToRender.length > 0 ? (
            <View style={styles.listContainer}>
              {datesToRender.map((item, idx) => (
                <View key={item.dateId}>
                  <UpcomingDateItem
                    item={item}
                    onPress={handleDateItemPress}
                    onRatePress={handleRatePress}
                    onResolveConflictPress={handleResolveConflictPress}
                  />
                  {idx < datesToRender.length - 1 && <View style={styles.separator} />}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noUpcomingText}>No confirmed plans scheduled.</Text>
          )}
        </View>
      </ScrollView>

      <FeedbackModal
        visible={isFeedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
        onSubmit={handleFeedbackSubmit}
      />
      <BubblePopup
        visible={popupState.visible}
        type={popupState.type}
        title={popupState.title}
        message={popupState.message}
        buttonText="OK"
        onClose={() => setPopupState((prev) => ({ ...prev, visible: false }))}
      />
      <ConflictResolutionModal
        visible={isConflictModalVisible}
        onClose={() => setConflictModalVisible(false)}
        onResolve={handleResolveConflict}
        proposalDate={selectedDateForConflict}
        originalDate={originalDateForConflict}
      />

      {/* GLOW TUTORIAL OVERLAY */}
      <TutorialGlowOverlay
        visible={tutorialStep !== null}
        step={tutorialStep !== null ? TUTORIAL_STEPS[tutorialStep] : null}
        onNext={handleNextTutorialStep}
        onFinish={handleFinishTutorial}
      />
      
      {/* ✅ Wingman Intro Popup (Multi-step) */}
      {wingmanCheckComplete && (
        <WingmanIntroPopup
          visible={wingmanIntroStep !== null}
          currentStep={wingmanIntroStep ?? 0}
          totalSteps={WINGMAN_INTRO_MESSAGES.length}
          title={wingmanIntroStep !== null ? WINGMAN_INTRO_MESSAGES[wingmanIntroStep]?.title : ''}
          message={wingmanIntroStep !== null ? WINGMAN_INTRO_MESSAGES[wingmanIntroStep]?.message : ''}
          onNext={handleWingmanIntroNext}
          onFinish={handleWingmanIntroFinish}
        />
      )}

      {/* ✅ NEW: Welcome Back Popup for Returning Users (ON CALENDAR, NO ROUTING) */}
      <BubblePopup
        visible={welcomeBackPopupVisible}
        type="success"
        title="Welcome Back!"
        message="Let's get back to meeting new people and creating new experiences together."
        buttonText="Let's Go!"
        onClose={() => setWelcomeBackPopupVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.Background || '#2D2D2D',
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  headerGroupLeft: { flexDirection: 'row', alignItems: 'center' },
  headerGroupRight: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { width: 100, height: 30, resizeMode: 'contain' },
  iconButton: { position: 'relative' },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#F46A6A',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.GreyDark || '#1E1E1E',
  },
  notificationBadgeText: { color: colors.White || '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  calendarGridContainer: { padding: 15 },
  upcomingSection: { marginTop: 20, paddingHorizontal: 15 },
  upcomingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.White || '#FFFFFF',
    marginBottom: 10,
  },
  listContainer: { backgroundColor: colors.GreyDark || '#1E1E1E', borderRadius: 12, padding: 10 },
  separator: { height: 1, backgroundColor: colors.LightBackground || '#3F3F3F' },
  noUpcomingText: {
    color: colors.GreyBackground || '#AAAAAA',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  upcomingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  upcomingItemDetails: { flex: 1, marginLeft: 12, marginRight: 8 },
  upcomingItemName: { fontSize: 16, fontWeight: '600', color: colors.White || '#FFFFFF' },
  upcomingItemInfo: { fontSize: 13, color: colors.Grey || '#9CA4A4' },
  upcomingItemTime: { fontSize: 13, color: colors.Grey || '#9CA4A4' },
  attractionTypeContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  attractionTypeText: {
    marginLeft: 6,
    fontSize: 13,
    color: colors.PinkPrimary || '#ff149d',
    fontWeight: '600',
  },
  statusSection: { alignItems: 'center', marginLeft: 'auto', width: 110 },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(58, 219, 118, 0.15)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statusText: {
    color: colors.Success || '#3ADB76',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  pendingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 219, 92, 0.15)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  pendingStatusText: {
    color: colors.GoldPrimary || '#FFDB5C',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  rescheduleStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 165, 0, 0.2)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  rescheduleStatusText: { color: '#FFA500', marginLeft: 5, fontSize: 12, fontWeight: 'bold' },
  rateButton: {
    marginTop: 6,
    backgroundColor: colors.PinkPrimary || '#ff149d',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 12,
    width: '100%',
    alignItems: 'center',
  },
  rateButtonText: { color: colors.White || '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  feedbackSentText: {
    marginTop: 8,
    color: colors.GoldPrimary || '#FFDB5C',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupContainer: { alignItems: 'center', width: '100%', maxWidth: 350 },
  popupImage: { width: 220, height: 220, resizeMode: 'contain', marginBottom: -80 },
  bubble: {
    width: '100%',
    backgroundColor: colors.White || '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    paddingTop: 100,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  popupTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.Black || '#000000',
    textAlign: 'center',
    marginBottom: 10,
  },
  popupMessage: {
    fontSize: 16,
    color: colors.LightBlack || '#222B45',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  popupButton: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  errorButton: { backgroundColor: colors.PinkPrimary || '#ff149d' },
  successButton: { backgroundColor: colors.GoldPrimary || '#FFDB5C' },
  errorButtonText: { color: colors.White || '#FFFFFF', fontSize: 15, fontWeight: 'bold' },
  successButtonText: { color: colors.Black || '#000000', fontSize: 15, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: colors.GreyDark || '#1E1E1E', padding: 20 },
  modalTitle: {
    color: colors.White || '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: colors.GreyBackground || '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
  },
  feedbackOptionsContainer: { marginBottom: 20 },
  feedbackButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthButton: { width: '100%' },
  amazingButton: { backgroundColor: colors.TealPrimary || '#00E0FF' },
  noShowButton: { backgroundColor: '#FFA500' },
  otherButton: { backgroundColor: '#FF4500' },
  feedbackButtonText: { color: colors.White || '#FFFFFF', fontWeight: 'bold' },
  selectedButton: { transform: [{ scale: 1.02 }] },
  notesInput: {
    backgroundColor: colors.LightBackground || '#3F3F3F',
    color: colors.White || '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row' },
  closeButton: {
    backgroundColor: '#4A4A4A',
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  closeButtonText: { color: colors.White || '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  submitButton: {
    backgroundColor: colors.PinkPrimary || '#ff149d',
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  submitButtonText: { color: colors.White || '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  disabledButton: { backgroundColor: colors.DarkGrey || '#828282' },
  resolveConflictButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.GoldPrimary,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: '100%',
  },
  resolveConflictButtonText: { color: '#000', marginLeft: 6, fontSize: 12, fontWeight: 'bold' },
  conflictModalContainer: {
    backgroundColor: colors.GreyDark || '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    alignSelf: 'center',
  },
  modalActionsFullWidth: { marginTop: 20, width: '100%' },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 10,
  },
  acceptNewButton: { backgroundColor: colors.GoldPrimary },
  acceptNewButtonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  keepOriginalButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.White },
  keepOriginalButtonText: { color: colors.White, fontWeight: 'bold', fontSize: 16 },

  // --- TUTORIAL STYLES (NEW) ---
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

  // ✅ NEW: Wingman Intro Popup Styles
  wingmanIntroContainer: { 
    alignItems: 'center', 
    width: '100%', 
    maxWidth: 380,
  },
  wingmanIntroImage: { 
    width: 180, 
    height: 180, 
    resizeMode: 'contain', 
    marginBottom: -60,
    zIndex: 1,
  },
  wingmanIntroBubble: {
    width: '100%',
    backgroundColor: colors.White || '#FFFFFF',
    borderRadius: 25,
    padding: 25,
    paddingTop: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  progressDotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.Grey || '#CCCCCC',
    marginHorizontal: 5,
  },
  progressDotActive: {
    backgroundColor: colors.GoldPrimary || '#FFDB5C',
    transform: [{ scale: 1.2 }],
  },
  progressDotCompleted: {
    backgroundColor: colors.TealPrimary || '#00E0FF',
  },
  wingmanIntroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.Black || '#000000',
    textAlign: 'center',
    marginBottom: 12,
  },
  wingmanIntroMessage: {
    fontSize: 16,
    color: colors.LightBlack || '#222B45',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  wingmanIntroButton: {
    backgroundColor: colors.GoldPrimary || '#FFDB5C',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 50,
    alignItems: 'center',
    shadowColor: colors.GoldPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  wingmanIntroButtonText: { 
    color: colors.Black || '#000000', 
    fontSize: 17, 
    fontWeight: 'bold',
  },
});

export default CalendarHomeScreen;
