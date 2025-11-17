// ✅ COMPLETE AND FINAL UPDATED CODE
// (app)/dates/[dateId].tsx
// ✅✅✅ RESPONSIVE DESIGN KE LIYE UPDATE KIYA GAYA VERSION ✅✅✅

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  Modal,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions, // ✅ RESPONSIVENESS KE LIYE IMPORT KIYA GAYA
} from 'react-native';
import { Avatar } from 'react-native-paper';
import { format, isValid, isWithinInterval, addMinutes, subMinutes } from 'date-fns';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getDateById,
  getUserById,
  updateDate,
  cancelDate,
  getPlayableVideoUrl,
  isAuthTokenApiError,
  getUpcomingDates,
} from '../../../api/api';
import { DetailedDateObject, UpcomingDate } from '../../../types/Date';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

// Assets
const BACK_ARROW_ICON = require('../../../assets/back_arrow_icon.png');
const BRAND_LOGO = require('../../../assets/brand.png');
const calcHappyIcon = require('../../../assets/calc-happy.png');
const calcErrorIcon = require('../../../assets/calc-error.png');

// Google Places API Key
const GOOGLE_PLACES_API_KEY = 'AIzaSyBwOm3P6Ji4Bleg3bLsT2TiumWAQF57uBM';

// screenColors
const screenColors = {
  background: '#121212',
  textPrimary: '#FFFFFF',
  textSecondary: '#EBEBF599',
  cardBackground: '#1C1C1E',
  inputBackground: '#3F3F3F',
  inputBorder: '#555555',
  acceptButton: '#28a745',
  declineButton: '#dc3545',
  rescheduleButton: '#FFD700',
  cancelModalButton: '#4A4A4A',
  submitModalButton: '#ff149d',
  buttonText: '#FFFFFF',
  avatarBorder: '#A020F0',
  PinkPrimary: '#ff149d',
  GoldPrimary: '#FFD700',
  Black: '#000000',
  White: '#FFFFFF',
};

// --- RESPONSIVE SCALING HELPER ---
// ✅✅✅ UI ELEMENTS KO RESPONSIVE BANANE KE LIYE HELPER FUNCTION ✅✅✅
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 375;
const scaleSize = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;

// ---- TZ-SAFE HELPERS ----
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

// BubblePopup Component
const BubblePopup = ({ visible, type, title, message, buttonText, onClose }) => {
  if (!visible) return null;
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

// RescheduleModal Component
const RescheduleModal = ({
  visible,
  onClose,
  onSubmit,
  currentDateDetails,
  upcomingDates,
  userLocation,
}) => {
  const [newDateTime, setNewDateTime] = useState(new Date());
  const [newVenue, setNewVenue] = useState(currentDateDetails?.locationMetadata?.name || '');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const [predictions, setPredictions] = useState<any[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const venueInputRef = useRef<TextInput>(null);
  const [venueInputLayout, setVenueInputLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    if (visible && currentDateDetails?.localDate) {
      setNewDateTime(currentDateDetails.localDate);
      setNewVenue(currentDateDetails.locationMetadata?.name || '');
    } else if (visible) {
      setNewDateTime(new Date());
    }
  }, [visible, currentDateDetails]);

  useEffect(() => {
    if (!newDateTime || !upcomingDates) {
      setConflictError(null);
      return;
    }

    for (const existingDate of upcomingDates) {
      if (existingDate.dateId === currentDateDetails?.dateId) {
        continue;
      }

      const existingDateTime = buildLocalDateTime(existingDate.date, existingDate.time);
      if (existingDateTime) {
        const blockStart = subMinutes(existingDateTime, 30);
        const blockEnd = addMinutes(existingDateTime, 90);

        if (isWithinInterval(newDateTime, { start: blockStart, end: blockEnd })) {
          setConflictError(
            `This conflicts with your date with ${
              existingDate.otherUser.firstName
            } at ${format(existingDateTime, 'p')}.`
          );
          return;
        }
      }
    }

    setConflictError(null);
  }, [newDateTime, upcomingDates, currentDateDetails?.dateId]);

  const fetchPredictions = useCallback(
    (input: string) => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = setTimeout(async () => {
        if (input.length < 3) {
          setPredictions([]);
          return;
        }
        try {
          let apiUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            input
          )}&key=${GOOGLE_PLACES_API_KEY}`;
          if (userLocation) {
            apiUrl += `&location=${userLocation.lat},${userLocation.lng}&radius=50000`;
          }

          const response = await fetch(apiUrl);
          const json = await response.json();
          setPredictions(json.predictions || []);
          setShowPredictions(!!json.predictions?.length);
        } catch (e) {
          console.error('Error fetching place predictions:', e);
          setPredictions([]);
          setShowPredictions(false);
        }
      }, 300);
    },
    [userLocation]
  );

  const handleVenueChangeText = (text: string) => {
    setNewVenue(text);
    fetchPredictions(text);
  };

  const handlePredictionPress = (prediction: any) => {
    setNewVenue(prediction.description);
    setPredictions([]);
    setShowPredictions(false);
    Keyboard.dismiss();
  };

  const onTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setNewDateTime(selectedDate);
    }
  };

  const handleReschedule = () => {
    if (conflictError) {
      Alert.alert('Time Conflict', conflictError);
      return;
    }
    Keyboard.dismiss();
    setShowPredictions(false);
    if (!newVenue.trim()) {
      Alert.alert('Venue Required', 'Please enter a venue for the date.');
      return;
    }
    onSubmit({
      date: format(newDateTime, 'yyyy-MM-dd'),
      time: format(newDateTime, 'HH:mm:ss'),
      locationMetadata: { name: newVenue },
    });
  };

  return (
    <>
      <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reschedule Details</Text>

            <View style={styles.fixedDateContainer}>
              <Text style={styles.fixedDateLabel}>Date:</Text>
              <Text style={styles.fixedDateValue}>
                {isValid(newDateTime) ? format(newDateTime, 'MMMM dd, yyyy') : 'Not available'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.timePickerButton}
              onPress={() => setShowTimePicker(true)}>
              <Text style={styles.timePickerButtonText}>
                {isValid(newDateTime) ? format(newDateTime, 'p') : 'Select Time'}
              </Text>
            </TouchableOpacity>

            {showTimePicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={newDateTime}
                mode="time"
                is24Hour={false}
                display="default"
                onChange={onTimeChange}
              />
            )}

            <TextInput
              ref={venueInputRef}
              style={styles.modalInput}
              placeholder="New Venue"
              value={newVenue}
              onChangeText={handleVenueChangeText}
              placeholderTextColor={screenColors.textSecondary}
              onFocus={() => {
                if (newVenue.length >= 3) setShowPredictions(true);
              }}
              onLayout={() => {
                venueInputRef.current?.measureInWindow((fx, fy, fwidth, fheight) => {
                  setVenueInputLayout({ x: fx, y: fy, width: fwidth, height: fheight });
                });
              }}
            />
            {conflictError && <Text style={styles.conflictErrorText}>{conflictError}</Text>}

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={onClose}>
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.submitModalButton,
                  !!conflictError && styles.disabledButton,
                ]}
                onPress={handleReschedule}
                disabled={!!conflictError}>
                <Text style={styles.actionButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        transparent
        visible={showPredictions && predictions.length > 0}
        onRequestClose={() => setShowPredictions(false)}
        animationType="fade">
        <TouchableOpacity
          style={styles.predictionsModalOverlay}
          activeOpacity={1}
          onPress={() => setShowPredictions(false)}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.predictionsModalContainer,
                {
                  top: venueInputLayout.y + venueInputLayout.height,
                  left: venueInputLayout.x,
                  width: venueInputLayout.width,
                },
              ]}>
              <FlatList
                data={predictions}
                keyExtractor={(item) => item.place_id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.predictionItem}
                    onPress={() => handlePredictionPress(item)}>
                    <Text style={styles.predictionText}>{item.description}</Text>
                  </TouchableOpacity>
                )}
                style={styles.predictionsListModal}
                keyboardShouldPersistTaps="always"
              />
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const DateDetailScreen = () => {
  const router = useRouter();
  const { dateId } = useLocalSearchParams<{ dateId: string }>();
  const { auth0User, logout } = useAuth();

  const [dateDetails, setDateDetails] = useState<DetailedDateObject | null>(null);
  const [playableVideoUrl, setPlayableVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const videoRef = useRef<Video>(null);
  const [videoStatus, setVideoStatus] = useState<any>({});
  const [popupState, setPopupState] = useState({
    visible: false,
    type: 'error' as 'success' | 'error',
    title: '',
    message: '',
    onCloseCallback: undefined as undefined | (() => void),
  });
  const [isRescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [myUpcomingDates, setMyUpcomingDates] = useState<UpcomingDate[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const localDate = useMemo(() => {
    return buildLocalDateTime(dateDetails?.date, dateDetails?.time);
  }, [dateDetails]);

  useEffect(() => {
    const geocodeZip = async (zip: string) => {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            zip
          )}&key=${GOOGLE_PLACES_API_KEY}`
        );
        const json = await response.json();
        if (json.results && json.results.length > 0) {
          const location = json.results[0].geometry.location;
          setUserLocation(location);
        }
      } catch (e) {
        console.error('Error geocoding zip code:', e);
      }
    };
    const zipCode = auth0User?.['https://daytz.net/user_metadata']?.zip_code;
    if (zipCode) {
      geocodeZip(zipCode);
    }
  }, [auth0User]);

  const showPopup = (
    title: string,
    message: string,
    type: 'success' | 'error' = 'error',
    onCloseCallback = undefined
  ) => {
    setPopupState({ visible: true, title, message, type, onCloseCallback });
  };

  const fetchDateDetails = useCallback(async () => {
    if (!dateId || !auth0User) {
      return;
    }
    setIsLoading(true);
    setError(null);
    setPlayableVideoUrl(null);
    try {
      const [response, upcomingDatesResponse] = await Promise.all([
        getDateById(dateId),
        getUpcomingDates(),
      ]);

      const dateData = response.data;
      setDateDetails(dateData);

      if (upcomingDatesResponse.data) {
        setMyUpcomingDates(upcomingDatesResponse.data.filter((d) => d.status === 'approved'));
      }

      if (dateData) {
        const otherUserSummary =
          auth0User.sub === dateData.userFrom.userId ? dateData.userTo : dateData.userFrom;
        if (otherUserSummary?.userId) {
          const fullUserResponse = await getUserById(otherUserSummary.userId);
          const fullUserData = fullUserResponse.data;
          if (fullUserData?.videoUrl) {
            const videoResponse = await getPlayableVideoUrl({
              vimeoUri: fullUserData.videoUrl,
            });
            setPlayableVideoUrl(videoResponse.data.playableUrl);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch screen data:', error);
      setError('Failed to load date details. Please try again.');
      if (isAuthTokenApiError(error)) logout?.();
    } finally {
      setIsLoading(false);
    }
  }, [dateId, logout, auth0User]);

  useEffect(() => {
    if (auth0User) {
      fetchDateDetails();
    }
  }, [auth0User, fetchDateDetails]);

  const handleUpdateStatus = async (status: 'approved' | 'declined') => {
    if (!dateId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await updateDate(dateId, { status });
      await fetchDateDetails();
      if (status === 'approved') {
        showPopup('Date Confirmed!', 'The date details have been confirmed.', 'success');
      } else {
        showPopup('Date Declined', 'You have declined the proposed date details.', 'success', () =>
          router.back()
        );
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'An error occurred.';
      showPopup('Error', errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelDate = () => {
    Alert.alert('Cancel Date', 'Are you sure you want to cancel this date entirely?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          if (!dateId || isSubmitting) return;
          setIsSubmitting(true);
          try {
            await cancelDate(dateId);
            showPopup(
              'Date Cancelled',
              'The date has been successfully cancelled.',
              'success',
              () => router.back()
            );
          } catch (error: any) {
            showPopup('Error', error.response?.data?.message || 'Failed to cancel date.', 'error');
          } finally {
            setIsSubmitting(false);
          }
        },
      },
    ]);
  };

  const handleRescheduleSubmit = async (newDetails: {
    date: string;
    time: string;
    locationMetadata: any;
  }) => {
    if (!dateId || isSubmitting || !dateDetails) return;
    setIsSubmitting(true);
    setRescheduleModalVisible(false);
    const displayUser =
      auth0User?.sub === dateDetails.userFrom.userId ? dateDetails.userTo : dateDetails.userFrom;
    try {
      await updateDate(dateId, newDetails);
      showPopup(
        'Request Sent!',
        `Your reschedule request has been sent to ${displayUser.firstName || 'them'}.`,
        'success',
        fetchDateDetails
      );
    } catch (error: any) {
      showPopup(
        'Error',
        error.response?.data?.message || 'Failed to send reschedule request.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFooter = () => {
    if (!dateDetails || !auth0User) return null;
    const currentUserIsUserFrom = auth0User.sub === dateDetails.userFrom.userId;
    const currentUserIsUserTo = auth0User.sub === dateDetails.userTo.userId;

    if (dateDetails.status === 'approved' || dateDetails.status === 'needs_rescheduling') {
      return (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.rescheduleButton]}
            onPress={() => setRescheduleModalVisible(true)}
            disabled={isSubmitting}>
            <Text style={styles.actionButtonText}>Reschedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={handleCancelDate}
            disabled={isSubmitting}>
            <Text style={styles.actionButtonText}>Cancel Date</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (dateDetails.status === 'pending') {
      const myTurnToRespond =
        (currentUserIsUserFrom && !dateDetails.userFromApproved) ||
        (currentUserIsUserTo && !dateDetails.userToApproved);
      if (myTurnToRespond) {
        return (
          <View style={styles.actionContainerThreeButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleUpdateStatus('approved')}
              disabled={isSubmitting}>
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.actionButtonText}>Accept</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rescheduleButton]}
              onPress={() => setRescheduleModalVisible(true)}
              disabled={isSubmitting}>
              <Text style={styles.actionButtonText}>Reschedule</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleUpdateStatus('declined')}
              disabled={isSubmitting}>
              <Text style={styles.actionButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        );
      } else {
        const otherUser = currentUserIsUserFrom ? dateDetails.userTo : dateDetails.userFrom;
        return (
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxText}>Waiting for {otherUser.firstName} to respond...</Text>
          </View>
        );
      }
    }

    return (
      <View style={styles.infoBox}>
        <Text style={styles.infoBoxText}>
          Status:{' '}
          {dateDetails.status.replace('_', ' ').charAt(0).toUpperCase() +
            dateDetails.status.replace('_', ' ').slice(1)}
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={screenColors.GoldPrimary} />
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Image source={BACK_ARROW_ICON} style={styles.backIcon} />
          </TouchableOpacity>
        </View>
        <View style={styles.centeredContent}>
          <Text style={styles.title}>{error}</Text>
          <TouchableOpacity style={styles.bigBackButton} onPress={fetchDateDetails}>
            <Text style={styles.bigBackButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!dateDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Image source={BACK_ARROW_ICON} style={styles.backIcon} />
          </TouchableOpacity>
        </View>
        <View style={styles.centeredContent}>
          <Text style={styles.title}>Date Not Found</Text>
          <Text style={styles.subtitle}>
            This date may have been cancelled or no longer exists.
          </Text>
          <TouchableOpacity style={styles.bigBackButton} onPress={() => router.back()}>
            <Text style={styles.bigBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const displayUser =
    auth0User?.sub === dateDetails.userFrom.userId ? dateDetails.userTo : dateDetails.userFrom;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Image source={BACK_ARROW_ICON} style={styles.backIcon} />
          </TouchableOpacity>
          <Image source={BRAND_LOGO} style={styles.brandLogo} />
          <View style={{ width: scaleSize(40) }} />
        </View>

        <Text style={styles.title}>Date with {displayUser.firstName || 'User'}</Text>
        <View style={styles.userInfoContainer}>
          <Avatar.Image
            size={scaleSize(64)}
            source={{ uri: displayUser.profilePictureUrl }}
            style={styles.avatar}
          />
          <Text style={styles.userName}>{displayUser.firstName || 'User'}</Text>
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Date:</Text>
          <Text style={styles.detailValue}>
            {localDate ? format(localDate, 'MMMM dd, yyyy') : 'Not set'}
          </Text>
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Time:</Text>
          <Text style={styles.detailValue}>{localDate ? format(localDate, 'p') : 'Not set'}</Text>
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Venue:</Text>
          <Text style={styles.detailValue}>{dateDetails.locationMetadata?.name || 'N/A'}</Text>
        </View>

        {playableVideoUrl && (
          <View>
            <Text style={styles.videoLabel}>Bio Video from {displayUser.firstName}</Text>
            <View style={styles.videoContainer}>
              <Video
                ref={videoRef}
                style={styles.video}
                source={{ uri: playableVideoUrl }}
                useNativeControls={false}
                resizeMode={ResizeMode.COVER}
                isLooping
                onPlaybackStatusUpdate={(status) => setVideoStatus(() => status)}
              />
              <TouchableOpacity
                style={styles.playButton}
                onPress={() =>
                  videoStatus.isPlaying
                    ? videoRef.current?.pauseAsync()
                    : videoRef.current?.playAsync()
                }>
                <Ionicons
                  name={videoStatus.isPlaying ? 'pause' : 'play'}
                  size={scaleSize(32)}
                  color="white"
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>{renderFooter()}</View>

      <BubblePopup
        visible={popupState.visible}
        type={popupState.type}
        title={popupState.title}
        message={popupState.message}
        buttonText="OK"
        onClose={() => {
          const cb = popupState.onCloseCallback;
          setPopupState((p) => ({ ...p, visible: false, onCloseCallback: undefined }));
          if (cb) cb();
        }}
      />
      {dateDetails && (
        <RescheduleModal
          visible={isRescheduleModalVisible}
          onClose={() => setRescheduleModalVisible(false)}
          onSubmit={handleRescheduleSubmit}
          upcomingDates={myUpcomingDates}
          currentDateDetails={{
            ...dateDetails,
            localDate: localDate,
          }}
          userLocation={userLocation}
        />
      )}
    </SafeAreaView>
  );
};

// --- STYLES ---
// ✅✅✅ RESPONSIVE STYLING KE LIYE UPDATE KIYA GAYA ✅✅✅
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: screenColors.background },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: screenColors.background,
  },
  scrollContent: {
    paddingBottom: scaleSize(120),
    paddingHorizontal: scaleSize(20),
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleSize(10),
    height: scaleSize(60),
  },
  backButton: { padding: scaleSize(8) },
  backIcon: { width: scaleSize(32), height: scaleSize(32) },
  brandLogo: { width: scaleSize(100), height: scaleSize(40), resizeMode: 'contain' },
  title: {
    fontSize: scaleSize(24),
    fontWeight: 'bold',
    color: screenColors.textPrimary,
    textAlign: 'center',
    marginVertical: scaleSize(15),
  },
  subtitle: {
    fontSize: scaleSize(16),
    color: screenColors.textSecondary,
    textAlign: 'center',
    marginBottom: scaleSize(25),
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scaleSize(16),
    backgroundColor: screenColors.cardBackground,
    borderRadius: scaleSize(15),
    marginBottom: scaleSize(20),
  },
  avatar: { borderWidth: 2, borderColor: screenColors.avatarBorder },
  userName: {
    fontSize: scaleSize(20),
    fontWeight: '600',
    color: screenColors.textPrimary,
    marginLeft: scaleSize(16),
  },
  detailCard: {
    backgroundColor: screenColors.cardBackground,
    borderRadius: scaleSize(15),
    padding: scaleSize(16),
    marginBottom: scaleSize(10),
  },
  detailLabel: {
    fontSize: scaleSize(14),
    color: screenColors.textSecondary,
    marginBottom: scaleSize(4),
  },
  detailValue: {
    fontSize: scaleSize(18),
    color: screenColors.textPrimary,
    fontWeight: '500',
  },
  videoLabel: {
    fontSize: scaleSize(18),
    fontWeight: 'bold',
    color: screenColors.textPrimary,
    marginTop: scaleSize(20),
    marginBottom: scaleSize(12),
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#000',
    borderRadius: scaleSize(15),
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0 },
  playButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: scaleSize(60),
    height: scaleSize(60),
    borderRadius: scaleSize(30),
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: scaleSize(20),
    paddingTop: scaleSize(10),
    backgroundColor: screenColors.background,
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingBottom: Platform.OS === 'ios' ? scaleSize(34) : scaleSize(20),
  },
  actionContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  actionContainerThreeButtons: { flexDirection: 'row', justifyContent: 'space-around' },
  actionButton: {
    flex: 1,
    borderRadius: scaleSize(12),
    paddingVertical: scaleSize(16),
    alignItems: 'center',
    marginHorizontal: scaleSize(5),
  },
  acceptButton: { backgroundColor: screenColors.acceptButton },
  declineButton: { backgroundColor: screenColors.declineButton },
  rescheduleButton: { backgroundColor: screenColors.rescheduleButton },
  actionButtonText: {
    fontSize: scaleSize(18),
    fontWeight: 'bold',
    color: screenColors.buttonText,
  },
  infoBox: {
    backgroundColor: screenColors.cardBackground,
    borderRadius: scaleSize(12),
    padding: scaleSize(16),
    alignItems: 'center',
  },
  infoBoxText: {
    fontSize: scaleSize(18),
    fontWeight: 'bold',
    color: screenColors.textPrimary,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleSize(20),
  },
  popupContainer: { alignItems: 'center', width: '100%', maxWidth: 350 },
  popupImage: {
    width: scaleSize(220),
    height: scaleSize(220),
    resizeMode: 'contain',
    zIndex: 1,
    marginBottom: scaleSize(-80),
  },
  bubble: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: scaleSize(25),
    padding: scaleSize(20),
    paddingTop: scaleSize(90),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  popupTitle: {
    fontSize: scaleSize(28),
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: scaleSize(15),
  },
  popupMessage: {
    fontSize: scaleSize(17),
    color: '#333333',
    textAlign: 'center',
    marginBottom: scaleSize(25),
    lineHeight: scaleSize(24),
  },
  popupButton: {
    borderRadius: scaleSize(20),
    paddingVertical: scaleSize(10),
    paddingHorizontal: scaleSize(40),
    alignItems: 'center',
  },
  errorButton: { backgroundColor: screenColors.PinkPrimary },
  successButton: { backgroundColor: screenColors.GoldPrimary },
  errorButtonText: {
    color: screenColors.White,
    fontSize: scaleSize(15),
    fontWeight: 'bold',
  },
  successButtonText: {
    color: screenColors.Black,
    fontSize: scaleSize(15),
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: screenColors.cardBackground,
    borderRadius: scaleSize(15),
    padding: scaleSize(25),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  modalTitle: {
    fontSize: scaleSize(22),
    fontWeight: 'bold',
    color: screenColors.textPrimary,
    marginBottom: scaleSize(25),
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: screenColors.inputBackground,
    color: screenColors.textPrimary,
    borderRadius: scaleSize(10),
    paddingVertical: scaleSize(12),
    paddingHorizontal: scaleSize(15),
    marginBottom: scaleSize(15),
    fontSize: scaleSize(16),
    borderWidth: 1,
    borderColor: screenColors.inputBorder,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: scaleSize(15),
  },
  modalButton: {
    flex: 1,
    paddingVertical: scaleSize(14),
    borderRadius: scaleSize(10),
    alignItems: 'center',
    marginHorizontal: scaleSize(8),
  },
  cancelModalButton: { backgroundColor: screenColors.cancelModalButton },
  submitModalButton: { backgroundColor: screenColors.submitModalButton },
  disabledButton: { backgroundColor: '#555' },
  fixedDateContainer: {
    backgroundColor: screenColors.inputBackground,
    borderRadius: scaleSize(10),
    paddingVertical: scaleSize(14),
    paddingHorizontal: scaleSize(15),
    marginBottom: scaleSize(15),
    borderWidth: 1,
    borderColor: screenColors.inputBorder,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fixedDateLabel: {
    fontSize: scaleSize(16),
    color: screenColors.textSecondary,
    marginRight: scaleSize(8),
  },
  fixedDateValue: {
    fontSize: scaleSize(16),
    color: screenColors.textPrimary,
    fontWeight: '600',
  },
  timePickerButton: {
    backgroundColor: screenColors.inputBackground,
    borderRadius: scaleSize(10),
    paddingVertical: scaleSize(14),
    paddingHorizontal: scaleSize(15),
    marginBottom: scaleSize(15),
    borderWidth: 1,
    borderColor: screenColors.inputBorder,
    alignItems: 'center',
  },
  timePickerButtonText: {
    color: screenColors.textPrimary,
    fontSize: scaleSize(16),
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleSize(20),
  },
  bigBackButton: {
    marginTop: scaleSize(20),
    backgroundColor: screenColors.GoldPrimary,
    paddingVertical: scaleSize(14),
    paddingHorizontal: scaleSize(40),
    borderRadius: scaleSize(30),
  },
  bigBackButtonText: {
    color: screenColors.Black,
    fontSize: scaleSize(18),
    fontWeight: 'bold',
  },
  predictionsModalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  predictionsModalContainer: {
    position: 'absolute',
    backgroundColor: screenColors.inputBackground,
    borderRadius: scaleSize(12),
    maxHeight: scaleSize(200),
    borderWidth: 1,
    borderColor: '#48484A',
    overflow: 'hidden',
  },
  predictionsListModal: {
    flexGrow: 1,
  },
  predictionItem: {
    padding: scaleSize(16),
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3C',
  },
  predictionText: {
    color: screenColors.textPrimary,
    fontSize: scaleSize(16),
  },
  conflictErrorText: {
    color: screenColors.declineButton,
    fontSize: scaleSize(14),
    textAlign: 'center',
    marginBottom: scaleSize(15),
    marginTop: scaleSize(-5),
  },
});

export default DateDetailScreen;
