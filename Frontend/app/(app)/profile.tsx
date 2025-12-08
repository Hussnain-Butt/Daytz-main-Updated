// File: app/(app)/profile.tsx
// ✅ COMPLETE AND FINAL UPDATED CODE
// ✅✅✅ FIX 1 & 2: Removed "Cancel" button during Initial Setup to prevent accidental navigation to Calendar.
// ✅✅✅ FIX 3: Added rule ensuring profile must be complete before leaving.
// ✅✅✅ FIX 4: Added Zip Code Validation with "Sad Cal" (Error Popup) and specific copy.

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  StyleSheet,
  Switch,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Platform,
  Text,
  Image,
  Modal,
  Alert,
  KeyboardAvoidingView,
  StatusBar as RNStatusBar,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import {
  Button,
  Avatar,
  Divider,
  Portal,
  Provider as PaperProvider,
  Modal as PaperModal,
  ActivityIndicator as PaperActivityIndicator,
  IconButton,
} from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { MediaTypeOptions } from 'expo-image-picker';
import { useUserStore } from '../../store/useUserStore';
import {
  updateUser,
  uploadHomepageVideo,
  uploadProfilePicture,
  getUserTokenBalance,
  purchaseTokens,
  getPlayableVideoUrl,
} from '../../api/api';
import { User, UpdateUserApiPayload } from '../../types/User';
import { colors } from '../../utils/theme';
import { useAuth } from '../../contexts/AuthContext';
import { Video, ResizeMode, AVPlaybackStatusSuccess } from 'expo-av';

const calcHappyIcon = require('../../assets/calc-happy.png');
const calcErrorIcon = require('../../assets/calc-error.png');

// --- CONSTANTS ---
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BASE_WIDTH = 375;
const scaleSize = (size: number) => (SCREEN_WIDTH / BASE_WIDTH) * size;
const MAX_BIO_VIDEO_DURATION_SECONDS = 30;
const MAX_BIO_VIDEO_DURATION_MS = MAX_BIO_VIDEO_DURATION_SECONDS * 1000;
const DEFAULT_AVATAR = 'https://via.placeholder.com/150/CCCCCC/FFFFFF?text=User';

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
  const isTargetInBottomHalf = hasTarget && targetLayout.y > SCREEN_HEIGHT / 2;

  // Calculate masks precisely
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

        <View
          style={[
            styles.tutorialBubbleContainer,
            isTargetInBottomHalf ? { bottom: undefined, top: 60 } : { top: undefined, bottom: 80 },
          ]}>
          <Image source={calcHappyIcon} style={styles.tutorialCalImage} />
          <View style={styles.tutorialBubble}>
            <Text style={styles.tutorialText}>{text}</Text>
            <TouchableOpacity
              style={styles.tutorialNextButton}
              onPress={isLast ? onFinish : onNext}>
              <Text style={styles.tutorialButtonText}>{isLast ? "Let's Go!" : 'Next'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// --- BUBBLE POPUP COMPONENT ---
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

interface ImagePickerResult {
  uri: string;
  type: string;
  name: string;
  assetId?: string;
  duration?: number;
}

const Profile = () => {
  const { auth0User: authUser, logout } = useAuth();
  const {
    userProfile,
    setUserProfile,
    tokenBalance,
    setTokenBalance,
    hasBeenForcedToProfileEdit,
    setHasBeenForcedToProfileEdit,
    showWelcomeVideo,
  } = useUserStore();
  const router = useRouter();
  const isFocused = useIsFocused();

  // Screen State
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Media State
  const [video, setVideo] = useState<ImagePickerResult | null>(null);
  const [image, setImage] = useState<ImagePickerResult | null>(null);

  // Form State
  const [editedProfile, setEditedProfile] = useState<Partial<User>>({});
  const [referralSource, setReferralSource] = useState('');

  // Logic State
  const [isInitialSetup, setIsInitialSetup] = useState(false);
  const [profileJustCompleted, setProfileJustCompleted] = useState(false);

  // Modal State
  const [isBuyTokensModalVisible, setIsBuyTokensModalVisible] = useState(false);
  const [isPurchasingTokens, setIsPurchasingTokens] = useState(false);

  // Video Player
  const [playableBioVideoUrl, setPlayableBioVideoUrl] = useState<string | null>(null);
  const [isLoadingPlayableUrl, setIsLoadingPlayableUrl] = useState(false);
  const [videoPlaybackError, setVideoPlaybackError] = useState<string | null>(null);
  const videoPlayerRef = useRef<Video>(null);
  const [popupState, setPopupState] = useState({
    visible: false,
    type: 'error' as 'success' | 'error',
    title: '',
    message: '',
  });

  // --- TUTORIAL REFS & STATE ---
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);
  const [elementLayouts, setElementLayouts] = useState<any>({});

  const scrollViewRef = useRef<ScrollView>(null);
  const avatarRef = useRef<View>(null);
  const videoRef = useRef<View>(null);
  const infoRef = useRef<View>(null);
  const saveRef = useRef<View>(null);

  const showPopup = (title: string, message: string, type: 'success' | 'error' = 'error') => {
    setPopupState({ visible: true, title, message, type });
  };

  const fetchTokenBalance = useCallback(async () => {
    if (!userProfile?.userId) return;
    try {
      const response = await getUserTokenBalance();
      setTokenBalance(response.data.tokenBalance ?? null);
    } catch (error) {
      console.error('[ProfilePage] Error fetching token balance:', error);
      setTokenBalance(null);
    }
  }, [userProfile?.userId, setTokenBalance]);

  useFocusEffect(
    useCallback(() => {
      if (tokenBalance === null) fetchTokenBalance();
    }, [tokenBalance, fetchTokenBalance])
  );

  const fetchPlayableVimeoUrl = useCallback(async () => {
    setVideoPlaybackError(null);
    if (!userProfile?.videoUrl) {
      setPlayableBioVideoUrl(null);
      setIsLoadingPlayableUrl(false);
      return;
    }
    if (userProfile.videoUrl.includes('vimeo.com/')) {
      setIsLoadingPlayableUrl(true);
      try {
        const pathSegments = userProfile.videoUrl.split('/');
        const idSegment = pathSegments.find((segment) => /^\d+$/.test(segment.split('?')[0]));
        const videoId = idSegment ? idSegment.split('?')[0] : '';
        if (videoId) {
          const vimeoApiUriForPayload = `videos/${videoId}`;
          const response = await getPlayableVideoUrl({ vimeoUri: vimeoApiUriForPayload });
          if (response.data?.playableUrl) {
            setPlayableBioVideoUrl(response.data.playableUrl);
          } else {
            setVideoPlaybackError((response.data as any)?.message || 'Video not found');
          }
        } else {
          setVideoPlaybackError('Invalid video link format.');
        }
      } catch (error: any) {
        setVideoPlaybackError('Could not load video details.');
      } finally {
        setIsLoadingPlayableUrl(false);
      }
    } else {
      setPlayableBioVideoUrl(userProfile.videoUrl);
    }
  }, [userProfile?.videoUrl]);

  useEffect(() => {
    fetchPlayableVimeoUrl();
  }, [fetchPlayableVimeoUrl]);

  // Initial Check for Profile Completion
  useEffect(() => {
    if (!isFocused || showWelcomeVideo) return;

    if (userProfile) {
      setEditedProfile({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        zipcode: userProfile.zipcode || '',
        enableNotifications: userProfile.enableNotifications ?? true,
      });

      const profileIsIncomplete = !userProfile.is_profile_complete;
      setIsInitialSetup(profileIsIncomplete);

      if (profileIsIncomplete && !hasBeenForcedToProfileEdit) {
        setIsEditMode(true);
        setHasBeenForcedToProfileEdit(true);

        setTimeout(() => {
          if (isFocused && !useUserStore.getState().showWelcomeVideo) {
            setTutorialStep(0);
          }
        }, 1000);
      }
    }
  }, [userProfile, hasBeenForcedToProfileEdit, isFocused, showWelcomeVideo]);

  // --- TUTORIAL LOGIC: MEASUREMENTS ---
  const measureElement = (ref: React.RefObject<View>, key: string) => {
    if (ref.current) {
      ref.current.measureInWindow((x, y, width, height) => {
        if (!isNaN(x) && !isNaN(y) && width > 0 && height > 0) {
          setElementLayouts((prev) => ({ ...prev, [key]: { x, y, width, height } }));
        }
      });
    }
  };

  const measureAllElements = () => {
    measureElement(avatarRef, 'avatar');
    measureElement(videoRef, 'video');
    measureElement(infoRef, 'info');
    measureElement(saveRef, 'save');
  };

  const handleScrollEnd = () => {
    if (tutorialStep !== null && isFocused) {
      measureAllElements();
    }
  };

  useEffect(() => {
    if (isEditMode && tutorialStep !== null && isFocused && !showWelcomeVideo) {
      const timer = setTimeout(() => {
        measureAllElements();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isEditMode, tutorialStep, isFocused, showWelcomeVideo]);

  // --- TUTORIAL STEPS ---
  const TUTORIAL_STEPS = useMemo(() => {
    return [
      {
        text: "Hi! I'm Cal. Your profile is blank! Let's get you set up so you can start meeting people.",
        targetLayout: null,
      },
      {
        text: "First, upload a clear photo. People want to see who they're talking to!",
        targetLayout: elementLayouts.avatar || null,
        targetRef: avatarRef,
      },
      {
        text: "This is the magic! Record a 30s video to show your personality. It's way better than text.",
        targetLayout: elementLayouts.video || null,
        targetRef: videoRef,
      },
      {
        text: 'Fill in your basic details like Name and Zipcode so we can find matches near you.',
        targetLayout: elementLayouts.info || null,
        targetRef: infoRef,
      },
      {
        text: "Once you're done, hit Save to activate your profile!",
        targetLayout: elementLayouts.save || null,
        targetRef: saveRef,
        isLast: true,
      },
    ];
  }, [elementLayouts]);

  const handleNextTutorial = () => {
    if (tutorialStep !== null && tutorialStep < TUTORIAL_STEPS.length - 1) {
      const nextStepIndex = tutorialStep + 1;
      setTutorialStep(nextStepIndex);

      if (scrollViewRef.current) {
        if (nextStepIndex === 1) scrollViewRef.current.scrollTo({ y: 0, animated: true });
        if (nextStepIndex === 2) scrollViewRef.current.scrollTo({ y: 150, animated: true });
        if (nextStepIndex === 3) scrollViewRef.current.scrollTo({ y: 400, animated: true });
        if (nextStepIndex === 4) scrollViewRef.current.scrollToEnd({ animated: true });
      }
    } else {
      setTutorialStep(null);
    }
  };

  // --- MEDIA & SAVING HANDLERS ---
  const handleSelectedMedia = (asset: ImagePicker.ImagePickerAsset, type: 'Images' | 'Videos') => {
    if (type === 'Videos' && asset.duration && asset.duration > MAX_BIO_VIDEO_DURATION_MS) {
      showPopup(
        'Video Too Long',
        `Try a video under ${MAX_BIO_VIDEO_DURATION_SECONDS} seconds.`,
        'error'
      );
      return;
    }
    const mimeType = asset.mimeType || (type === 'Images' ? 'image/jpeg' : 'video/mp4');
    const fileName =
      asset.fileName || `${type.toLowerCase()}_${Date.now()}.${mimeType?.split('/')[1] || 'tmp'}`;
    const resultAsset: ImagePickerResult = {
      uri: asset.uri,
      type: mimeType,
      name: fileName,
      assetId: asset.assetId,
      duration: asset.duration,
    };
    if (type === 'Images') setImage(resultAsset);
    else setVideo(resultAsset);
  };

  const pickMediaFromLibrary = async (type: 'Images' | 'Videos') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showPopup('Permission Required', 'Please grant permission.', 'error');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: type === 'Images' ? MediaTypeOptions.Images : MediaTypeOptions.Videos,
        allowsEditing: type === 'Images',
        aspect: type === 'Images' ? [3, 4] : undefined,
        quality: 0.7,
        videoMaxDuration: type === 'Videos' ? MAX_BIO_VIDEO_DURATION_SECONDS : undefined,
      });
      // ✅ FIX: Logic is safe. If canceled, nothing happens.
      if (!result.canceled && result.assets?.[0]) handleSelectedMedia(result.assets[0], type);
    } catch (e) {
      showPopup('Media Picker Error', (e as Error).message, 'error');
    }
  };

  const recordMediaWithCamera = async (type: 'Images' | 'Videos') => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showPopup('Permission Required', 'Please grant camera permission.', 'error');
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: type === 'Images' ? MediaTypeOptions.Images : MediaTypeOptions.Videos,
        allowsEditing: type === 'Images',
        aspect: type === 'Images' ? [3, 4] : undefined,
        quality: 0.7,
        videoMaxDuration: type === 'Videos' ? MAX_BIO_VIDEO_DURATION_SECONDS : undefined,
      });
      // ✅ FIX: Logic is safe. If canceled, nothing happens.
      if (!result.canceled && result.assets?.[0]) handleSelectedMedia(result.assets[0], type);
    } catch (e) {
      showPopup('Camera Error', (e as Error).message, 'error');
    }
  };

  const handleSave = async () => {
    if (!userProfile || !authUser) {
      showPopup('Error', 'Authentication error.', 'error');
      return;
    }
    const wasInitialProfileIncomplete = !userProfile.is_profile_complete;

    if (!editedProfile.firstName?.trim() || !editedProfile.lastName?.trim()) {
      showPopup('Name Required', 'Enter first & last name.', 'error');
      return;
    }

    // ✅ FIX 4: Zip Code Validation with Sad Cal ('error')
    if (!editedProfile.zipcode?.trim() || !/^\d{5}$/.test(editedProfile.zipcode.trim())) {
      showPopup(
        'Cal says:',
        "That zip code doesn't look right. Please enter a valid 5-digit zip code so I can find matches near you!",
        'error'
      );
      return;
    }

    if (
      wasInitialProfileIncomplete &&
      ((!video && !userProfile.videoUrl) || (!image && !userProfile.profilePictureUrl))
    ) {
      showPopup('Media Required', 'Upload bio video and profile picture.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      let currentVideoUrl = userProfile.videoUrl;
      let currentPicUrl = userProfile.profilePictureUrl;
      if (video) {
        const fd = new FormData();
        fd.append('video', { uri: video.uri, type: video.type, name: video.name } as any);
        const res = await uploadHomepageVideo(fd);
        if (res.data?.videoUrl) currentVideoUrl = res.data.videoUrl;
      }
      if (image) {
        const fd = new FormData();
        fd.append('image', { uri: image.uri, type: image.type, name: image.name } as any);
        const res = await uploadProfilePicture(fd);
        if (res.data?.profilePictureUrl) currentPicUrl = res.data.profilePictureUrl;
      }
      const updatePayload: UpdateUserApiPayload = {
        firstName: editedProfile.firstName?.trim(),
        lastName: editedProfile.lastName?.trim(),
        zipcode: editedProfile.zipcode?.trim(),
        enableNotifications: editedProfile.enableNotifications,
        videoUrl: currentVideoUrl,
        profilePictureUrl: currentPicUrl,
        is_profile_complete: !!(
          editedProfile.firstName?.trim() &&
          editedProfile.lastName?.trim() &&
          editedProfile.zipcode?.trim() &&
          currentVideoUrl &&
          currentPicUrl
        ),
      };
      if (wasInitialProfileIncomplete && referralSource.trim())
        updatePayload.referralSource = referralSource.trim();
      const res = await updateUser(updatePayload);
      if (res.data) {
        setUserProfile(res.data);
        const isSetupComplete = wasInitialProfileIncomplete && res.data.is_profile_complete;
        showPopup(
          isSetupComplete ? 'Alright!' : 'All Set!',
          isSetupComplete
            ? "You're one step closer to getting those butterfly feelings in your stomach while dating again."
            : 'Your profile has been updated successfully.',
          'success'
        );

        if (wasInitialProfileIncomplete && res.data.is_profile_complete)
          setProfileJustCompleted(true);
        setIsEditMode(false);
        setImage(null);
        setVideo(null);
      }
    } catch (e: any) {
      showPopup('Save Failed', e.message || 'An unknown error occurred.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBuyTokens = async () => {
    if (!authUser) {
      showPopup('Error', 'Authentication issue.', 'error');
      return;
    }
    setIsPurchasingTokens(true);
    try {
      const payload = { tokenAmount: 100, description: 'User purchased 100 tokens (profile)' };
      const res = await purchaseTokens(payload);
      setTokenBalance(res.data.newTokenBalance);
      showPopup(
        'Success',
        `${payload.tokenAmount} tokens purchased! New balance: ${res.data.newTokenBalance}`,
        'success'
      );
      setIsBuyTokensModalVisible(false);
    } catch (e: any) {
      showPopup('Purchase Failed', e.message || 'Could not purchase.', 'error');
    } finally {
      setIsPurchasingTokens(false);
    }
  };

  const renderBuyTokensModal = () => (
    <Portal>
      <PaperModal
        visible={isBuyTokensModalVisible}
        onDismiss={() => setIsBuyTokensModalVisible(false)}
        contentContainerStyle={styles.modalContainerStyle}>
        <Text style={styles.modalTitle}>Buy Tokens</Text>
        <Text style={styles.modalText}>Need more tokens? Purchase 100 tokens now!</Text>
        <View style={styles.modalButtonContainer}>
          <Button
            mode="outlined"
            onPress={() => setIsBuyTokensModalVisible(false)}
            style={styles.modalButton}
            disabled={isPurchasingTokens}
            textColor={colors.White}>
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleBuyTokens}
            style={[styles.modalButton, styles.modalConfirmButton]}
            loading={isPurchasingTokens}
            disabled={isPurchasingTokens}>
            Buy 100 Tokens
          </Button>
        </View>
      </PaperModal>
    </Portal>
  );

  const renderEditableUserInfo = () => (
    <KeyboardAvoidingView
      style={styles.flexContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}>
        <View style={styles.userInfoContainer}>
          {isInitialSetup && !profileJustCompleted && (
            <Text style={styles.setupTitle}>Complete Your Profile</Text>
          )}

          {/* AVATAR SECTION */}
          <View ref={avatarRef} collapsable={false} style={{ width: '100%', alignItems: 'center' }}>
            <Avatar.Image
              size={scaleSize(80)}
              source={{ uri: image?.uri || userProfile?.profilePictureUrl || DEFAULT_AVATAR }}
              style={styles.avatar}
            />
            <Button
              icon="camera"
              mode="outlined"
              style={styles.mediaButton}
              onPress={() => pickMediaFromLibrary('Images')}
              disabled={isSaving}>
              {image ? 'Change Pic' : userProfile?.profilePictureUrl ? 'Change Pic' : 'Upload'}
            </Button>
            {(isInitialSetup || !userProfile?.is_profile_complete) &&
              !userProfile?.profilePictureUrl &&
              !image && <Text style={styles.requiredText}>* Pic required</Text>}
          </View>

          <Divider style={styles.divider} />

          {/* VIDEO SECTION */}
          <View ref={videoRef} collapsable={false} style={{ width: '100%', alignItems: 'center' }}>
            <Text style={styles.fieldLabel}>Bio Video (Max {MAX_BIO_VIDEO_DURATION_SECONDS}s)</Text>
            {video ? (
              <Text
                style={styles.videoSelectedText}
                numberOfLines={1}
                ellipsizeMode="middle">{`Selected: ${video.name}`}</Text>
            ) : userProfile?.videoUrl ? (
              <Text style={styles.videoSelectedText}>Current video uploaded</Text>
            ) : (
              <Text style={styles.videoSelectedText}>(No bio video)</Text>
            )}
            <View style={styles.mediaActionsRow}>
              <Button
                icon="record-circle-outline"
                mode="outlined"
                style={[styles.mediaButton, styles.flexButton]}
                onPress={() => recordMediaWithCamera('Videos')}
                disabled={isSaving}>
                Record
              </Button>
              <Button
                icon="video-image"
                mode="outlined"
                style={[styles.mediaButton, styles.flexButton]}
                onPress={() => pickMediaFromLibrary('Videos')}
                disabled={isSaving}>
                {video ? 'Change Lib' : userProfile?.videoUrl ? 'Change Lib' : 'Upload'}
              </Button>
            </View>
            {(isInitialSetup || !userProfile?.is_profile_complete) &&
              !userProfile?.videoUrl &&
              !video && <Text style={styles.requiredText}>* Bio video required</Text>}
          </View>

          <Divider style={styles.divider} />

          {/* INFO SECTION */}
          <View ref={infoRef} collapsable={false} style={{ width: '100%' }}>
            <Text style={styles.fieldLabel}>First Name</Text>
            <TextInput
              style={styles.textInput}
              value={editedProfile.firstName || ''}
              onChangeText={(t) => setEditedProfile((p) => ({ ...p, firstName: t }))}
              placeholder="First Name"
              editable={!isSaving}
              autoCapitalize="words"
              placeholderTextColor={colors.LightGrey}
            />
            {!editedProfile.firstName?.trim() && (
              <Text style={styles.requiredText}>* Required</Text>
            )}
            <Text style={styles.fieldLabel}>Last Name</Text>
            <TextInput
              style={styles.textInput}
              value={editedProfile.lastName || ''}
              onChangeText={(t) => setEditedProfile((p) => ({ ...p, lastName: t }))}
              placeholder="Last Name"
              editable={!isSaving}
              autoCapitalize="words"
              placeholderTextColor={colors.LightGrey}
            />
            {!editedProfile.lastName?.trim() && <Text style={styles.requiredText}>* Required</Text>}
            <Text style={styles.fieldLabel}>Zipcode</Text>
            <TextInput
              style={styles.textInput}
              value={editedProfile.zipcode || ''}
              onChangeText={(t) =>
                setEditedProfile((p) => ({ ...p, zipcode: t.replace(/[^0-9]/g, '') }))
              }
              placeholder="5-Digit Zipcode"
              keyboardType="numeric"
              maxLength={5}
              editable={!isSaving}
              placeholderTextColor={colors.LightGrey}
            />
            {!editedProfile.zipcode?.trim() && <Text style={styles.requiredText}>* Required</Text>}
          </View>

          {isInitialSetup && (
            <>
              <Divider style={styles.divider} />
              <Text style={styles.fieldLabel}>How did you hear about us? (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={referralSource}
                onChangeText={setReferralSource}
                placeholder="e.g., Instagram, Friend, App Store..."
                editable={!isSaving}
                placeholderTextColor={colors.LightGrey}
              />
            </>
          )}

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Notifications:</Text>
            <Switch
              value={editedProfile.enableNotifications ?? true}
              onValueChange={(v) => setEditedProfile((p) => ({ ...p, enableNotifications: v }))}
              disabled={isSaving}
              trackColor={{ false: colors.Grey, true: colors.GoldPrimary }}
              thumbColor={colors.White}
            />
          </View>

          {/* SAVE SECTION */}
          <View ref={saveRef} collapsable={false} style={{ width: '100%' }}>
            <Button
              mode="contained"
              style={styles.saveButton}
              onPress={handleSave}
              loading={isSaving}
              disabled={isSaving}>
              {isSaving
                ? 'Saving...'
                : isInitialSetup && !profileJustCompleted
                  ? 'Save & View Profile'
                  : 'Save Changes'}
            </Button>
          </View>

          {/* ✅ FIX 1, 2 & 3: Hide Cancel button if it's initial setup. This traps the user in edit mode until profile is complete. */}
          {!isInitialSetup && (
            <Button
              mode="text"
              style={styles.cancelButton}
              onPress={() => {
                setIsEditMode(false);
                setProfileJustCompleted(false);
                setImage(null);
                setVideo(null);
                if (userProfile)
                  setEditedProfile({
                    firstName: userProfile.firstName || '',
                    lastName: userProfile.lastName || '',
                    zipcode: userProfile.zipcode || '',
                    enableNotifications: userProfile.enableNotifications ?? true,
                  });
              }}
              disabled={isSaving}
              textColor={colors.LightGrey}>
              Cancel
            </Button>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  const renderUserInfo = () => {
    if (!userProfile)
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading Profile...</Text>
        </View>
      );
    const showMagicBuyButton = tokenBalance !== null && tokenBalance < 10;
    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.userInfoContainer}>
          {profileJustCompleted && <Text style={styles.reviewText}>Review Your Profile</Text>}
          <Avatar.Image
            size={scaleSize(80)}
            source={{ uri: userProfile.profilePictureUrl || DEFAULT_AVATAR }}
            style={styles.avatar}
          />
          <Text style={styles.userName}>
            {`${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() ||
              'Name Not Set'}
          </Text>
          <Divider style={styles.divider} />
          <View style={styles.userInfoRow}>
            <Text style={styles.userInfoLabel}>Token Balance:</Text>
            {tokenBalance === null ? (
              <PaperActivityIndicator animating={true} color={colors.GoldPrimary} size="small" />
            ) : (
              <Text style={styles.userInfoValue}>{tokenBalance}</Text>
            )}
          </View>
          <Button
            mode={showMagicBuyButton ? 'contained' : 'outlined'}
            onPress={() => setIsBuyTokensModalVisible(true)}
            style={[styles.buyTokensButton, showMagicBuyButton && styles.magicButton]}
            icon={showMagicBuyButton ? 'star-circle-outline' : 'cart-plus'}
            disabled={isPurchasingTokens}
            labelStyle={
              showMagicBuyButton ? { color: colors.Black } : { color: colors.GoldPrimary }
            }
            buttonColor={showMagicBuyButton ? colors.GoldPrimary : undefined}
            textColor={showMagicBuyButton ? colors.Black : colors.GoldPrimary}>
            {showMagicBuyButton ? 'Low Tokens! Get More' : 'Buy Tokens'}
          </Button>
          <Divider style={styles.divider} />
          <View style={styles.userInfoRow}>
            <Text style={styles.userInfoLabel}>Zipcode:</Text>
            <Text style={styles.userInfoValue}>{userProfile.zipcode || 'Not set'}</Text>
          </View>
          <View style={styles.userInfoRow}>
            <Text style={styles.userInfoLabel}>Notifications:</Text>
            <Text style={styles.userInfoValue}>
              {userProfile.enableNotifications ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.videoSectionContainer}>
            <Text style={styles.videoSectionTitle}>Bio Video</Text>
            <View style={styles.videoPlayerWrapper}>
              {isLoadingPlayableUrl ? (
                <View style={styles.videoPlaceholder}>
                  <PaperActivityIndicator size="large" color={colors.GoldPrimary} />
                  <Text style={styles.videoStatusText}>Loading Video...</Text>
                </View>
              ) : playableBioVideoUrl && !videoPlaybackError ? (
                <Video
                  ref={videoPlayerRef}
                  source={{ uri: playableBioVideoUrl }}
                  style={styles.bioVideoPlayer}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  isLooping={false}
                  onError={() => setVideoPlaybackError('Video not found')}
                  onLoad={(status) => {
                    if ((status as AVPlaybackStatusSuccess).isLoaded) setVideoPlaybackError(null);
                  }}
                />
              ) : (
                <View style={styles.videoPlaceholder}>
                  <IconButton
                    icon={'alert-circle-outline'}
                    size={scaleSize(48)}
                    iconColor={colors.LightGrey}
                  />
                  <Text style={styles.videoStatusText}>
                    {videoPlaybackError || 'Video not found'}
                  </Text>
                  <Button
                    mode="text"
                    onPress={fetchPlayableVimeoUrl}
                    textColor={colors.GoldPrimary}>
                    Try Again
                  </Button>
                </View>
              )}
            </View>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.userInfoRow}>
            <Text style={styles.userInfoLabel}>Profile Complete:</Text>
            <Text style={styles.userInfoValue}>
              {userProfile.is_profile_complete ? 'Yes' : 'No'}
            </Text>
          </View>
          {profileJustCompleted && userProfile.is_profile_complete && (
            <Button
              mode="contained"
              style={styles.finishProfileButton}
              onPress={() => {
                setProfileJustCompleted(false);
                router.replace('/(app)/calendar');
              }}>
              Finish
            </Button>
          )}
          <Button mode="contained" onPress={() => setIsEditMode(true)} style={styles.editButton}>
            Edit Profile
          </Button>
          {userProfile.is_profile_complete && !profileJustCompleted && (
            <Button
              style={styles.calendarButton}
              mode="contained"
              onPress={() => router.push('/(app)/calendar')}>
              Go to Calendar
            </Button>
          )}
          <Button
            mode="outlined"
            onPress={() =>
              Alert.alert('Confirm Logout', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', onPress: logout, style: 'destructive' },
              ])
            }
            style={styles.logoutButton}
            textColor={colors.GoldPrimary}>
            Logout
          </Button>
        </View>
      </ScrollView>
    );
  };

  return (
    <PaperProvider>
      <SafeAreaView style={styles.container}>
        {isEditMode ? renderEditableUserInfo() : renderUserInfo()}
        {renderBuyTokensModal()}
        <BubblePopup
          visible={popupState.visible}
          type={popupState.type}
          title={popupState.title}
          message={popupState.message}
          buttonText="OK"
          onClose={() => setPopupState((prev) => ({ ...prev, visible: false }))}
        />
        {/* GLOW TUTORIAL OVERLAY */}
        <TutorialGlowOverlay
          visible={isFocused && !showWelcomeVideo && tutorialStep !== null}
          step={tutorialStep !== null ? TUTORIAL_STEPS[tutorialStep] : null}
          onNext={handleNextTutorial}
          onFinish={() => setTutorialStep(null)}
        />
      </SafeAreaView>
    </PaperProvider>
  );
};

// --- STYLES ---
const styles = StyleSheet.create({
  flexContainer: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.Background || '#121212',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.Background || '#121212',
  },
  loadingText: {
    marginTop: scaleSize(10),
    color: colors.White || '#FFFFFF',
    fontSize: scaleSize(16),
  },
  scrollView: { flex: 1, width: '100%' },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: scaleSize(20),
    paddingHorizontal: scaleSize(10),
  },
  userInfoContainer: {
    width: '100%',
    maxWidth: 500,
    padding: scaleSize(20),
    borderRadius: scaleSize(12),
    backgroundColor: colors.GreyDark || '#1E1E1E',
    gap: scaleSize(18),
  },
  avatar: {
    alignSelf: 'center',
    marginBottom: scaleSize(8),
    backgroundColor: colors.GreyMedium || '#333333',
  },
  userName: {
    fontSize: scaleSize(22),
    fontWeight: 'bold',
    color: colors.White || '#FFFFFF',
    alignSelf: 'center',
    marginTop: scaleSize(5),
    marginBottom: scaleSize(12),
  },
  divider: {
    marginVertical: scaleSize(15),
    height: 1,
    backgroundColor: colors.Grey || '#424242',
    width: '100%',
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: scaleSize(5),
    minHeight: scaleSize(40),
  },
  userInfoLabel: {
    fontWeight: '600',
    color: colors.LightGrey || '#B0B0B0',
    fontSize: scaleSize(16),
    marginRight: scaleSize(10),
  },
  userInfoValue: {
    color: colors.White || '#FFFFFF',
    fontSize: scaleSize(16),
    textAlign: 'right',
    flex: 1,
  },
  videoSectionContainer: { width: '100%', alignItems: 'flex-start', marginBottom: scaleSize(10) },
  videoSectionTitle: {
    fontSize: scaleSize(18),
    fontWeight: 'bold',
    color: colors.White || '#FFFFFF',
    marginBottom: scaleSize(12),
    paddingHorizontal: scaleSize(5),
  },
  videoPlayerWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.Black || '#000000',
    borderRadius: scaleSize(10),
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bioVideoPlayer: { width: '100%', height: '100%' },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scaleSize(20),
  },
  videoStatusText: {
    color: colors.LightGrey || '#A0A0A0',
    textAlign: 'center',
    marginTop: scaleSize(10),
    fontSize: scaleSize(14),
    lineHeight: scaleSize(20),
  },
  editButton: {
    marginTop: scaleSize(25),
    backgroundColor: colors.GoldPrimary || '#FFD700',
    paddingVertical: scaleSize(8),
    width: '90%',
    maxWidth: 350,
    alignSelf: 'center',
    borderRadius: scaleSize(25),
  },
  textInput: {
    backgroundColor: colors.GreyMedium || '#333333',
    width: '100%',
    paddingHorizontal: scaleSize(15),
    paddingVertical: scaleSize(12),
    borderRadius: scaleSize(8),
    fontSize: scaleSize(16),
    color: colors.White || '#FFFFFF',
    marginBottom: scaleSize(5),
    borderWidth: 1,
    borderColor: colors.Grey || '#424242',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: scaleSize(10),
    paddingHorizontal: scaleSize(5),
  },
  switchLabel: {
    fontSize: scaleSize(16),
    color: colors.White || '#FFFFFF',
    marginRight: scaleSize(10),
  },
  fieldLabel: {
    fontSize: scaleSize(16),
    color: colors.LightGrey || '#B0B0B0',
    marginBottom: scaleSize(6),
    alignSelf: 'flex-start',
    marginLeft: scaleSize(5),
    fontWeight: '500',
  },
  setupTitle: {
    fontSize: scaleSize(24),
    fontWeight: 'bold',
    color: colors.White || '#FFFFFF',
    textAlign: 'center',
    marginBottom: scaleSize(20),
  },
  reviewText: {
    fontSize: scaleSize(20),
    fontWeight: '600',
    color: colors.GoldPrimary || '#FFD700',
    textAlign: 'center',
    marginBottom: scaleSize(15),
  },
  logoutButton: {
    marginTop: scaleSize(20),
    borderColor: colors.GoldPrimary || '#FFD700',
    borderWidth: 1.5,
    paddingVertical: scaleSize(8),
    width: '90%',
    maxWidth: 350,
    alignSelf: 'center',
    borderRadius: scaleSize(25),
  },
  calendarButton: {
    marginTop: scaleSize(15),
    backgroundColor: colors.GoldSecondary || '#FFA000',
    paddingVertical: scaleSize(8),
    width: '90%',
    maxWidth: 350,
    alignSelf: 'center',
    borderRadius: scaleSize(25),
  },
  mediaButton: {
    marginTop: scaleSize(8),
    marginBottom: scaleSize(8),
    borderColor: colors.GoldPrimary || '#FFD700',
    borderWidth: 1,
    width: '90%',
    maxWidth: 350,
    alignSelf: 'center',
    borderRadius: scaleSize(20),
    paddingVertical: scaleSize(6),
  },
  mediaActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: scaleSize(8),
    gap: scaleSize(10),
  },
  flexButton: { flex: 1, width: undefined, marginHorizontal: 0, maxWidth: undefined },
  saveButton: {
    marginTop: scaleSize(30),
    backgroundColor: colors.GoldPrimary || '#FFD700',
    paddingVertical: scaleSize(10),
    width: '90%',
    maxWidth: 350,
    alignSelf: 'center',
    borderRadius: scaleSize(25),
  },
  cancelButton: { marginTop: scaleSize(12), width: '80%', maxWidth: 300, alignSelf: 'center' },
  requiredText: {
    color: colors.PinkPrimary || '#FF6B6B',
    fontSize: scaleSize(13),
    alignSelf: 'flex-start',
    marginLeft: scaleSize(5),
    marginTop: scaleSize(3),
    marginBottom: scaleSize(8),
  },
  videoSelectedText: {
    color: colors.LightGrey || '#A0A0A0',
    fontSize: scaleSize(14),
    fontStyle: 'italic',
    alignSelf: 'center',
    marginBottom: scaleSize(8),
    paddingHorizontal: scaleSize(10),
    textAlign: 'center',
  },
  finishProfileButton: {
    marginTop: scaleSize(25),
    backgroundColor: colors.Green || '#4CAF50',
    paddingVertical: scaleSize(10),
    width: '90%',
    maxWidth: 350,
    alignSelf: 'center',
    borderRadius: scaleSize(25),
  },
  buyTokensButton: {
    marginTop: scaleSize(15),
    marginBottom: scaleSize(10),
    paddingVertical: scaleSize(6),
    width: '90%',
    maxWidth: 350,
    borderColor: colors.GoldPrimary || '#FFD700',
    borderRadius: scaleSize(25),
    borderWidth: 1.5,
  },
  magicButton: {
    backgroundColor: colors.GoldPrimary || '#FFD700',
    borderColor: colors.GoldPrimary || '#FFD700',
  },
  modalContainerStyle: {
    backgroundColor: colors.GreyDark || '#1E1E1E',
    padding: scaleSize(30),
    marginHorizontal: Dimensions.get('window').width * 0.05,
    borderRadius: scaleSize(20),
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  modalTitle: {
    fontSize: scaleSize(24),
    fontWeight: 'bold',
    color: colors.White || '#FFFFFF',
    marginBottom: scaleSize(20),
    textAlign: 'center',
  },
  modalText: {
    fontSize: scaleSize(17),
    color: colors.LightGrey || '#B0B0B0',
    textAlign: 'center',
    marginBottom: scaleSize(30),
    lineHeight: scaleSize(24),
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: scaleSize(15),
  },
  modalButton: {
    flex: 1,
    marginHorizontal: scaleSize(10),
    paddingVertical: scaleSize(6),
    borderRadius: scaleSize(20),
  },
  modalConfirmButton: { backgroundColor: colors.GoldPrimary || '#FFD700' },
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
  errorButton: { backgroundColor: colors.PinkPrimary || '#FF6B6B' },
  successButton: { backgroundColor: colors.GoldPrimary || '#FFD700' },
  errorButtonText: {
    color: colors.White || '#FFFFFF',
    fontSize: scaleSize(15),
    fontWeight: 'bold',
  },
  successButtonText: {
    color: colors.Black || '#000000',
    fontSize: scaleSize(15),
    fontWeight: 'bold',
  },

  // --- TUTORIAL STYLES ---
  tutorialOverlayContainer: { flex: 1, position: 'relative', backgroundColor: 'transparent' },
  maskPart: { position: 'absolute', backgroundColor: 'rgba(0, 0, 0, 0.85)' },
  maskPartFull: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.85)' },
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

export default Profile;
