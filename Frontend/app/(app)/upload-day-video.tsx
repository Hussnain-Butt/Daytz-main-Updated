// File: app/(app)/upload-day-video.tsx
// ✅ COMPLETE AND FINAL UPDATED CODE
// ✅✅✅ FIXED: Video PAUSES and MUTES automatically when uploading starts ✅✅✅
// ✅✅✅ FIXED: Prevents audio from playing while progress bar is active ✅✅✅
// ✅✅✅ INCLUDES: Previous "Quiet out here" / Sad Cal fix preserved ✅✅✅

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Image,
  Modal,
  StatusBar as RNStatusBar,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { uploadCalendarVideo, getStoriesByDate } from '../../api/api';
import { parse, format } from 'date-fns';
import { Video, ResizeMode, Audio } from 'expo-av';

// Type definition for ImagePicker
type ImagePickerAsset = ImagePicker.ImagePickerAsset;

// Constants
const MAX_VIDEO_DURATION_SECONDS = 60;
const MAX_VIDEO_DURATION_MS = MAX_VIDEO_DURATION_SECONDS * 1000;

// Image assets (Ensure these paths are correct in your project)
const ERROR_IMAGE = require('../../assets/calc-error.png'); // Sad Cal
const HAPPY_IMAGE = require('../../assets/calc-happy.png'); // Happy Cal
const BACK_ARROW_ICON = require('../../assets/back_arrow_icon.png');
const BRAND_LOGO = require('../../assets/brand.png');

// --- CAL'S CONVERSATIONAL PROMPTS ---
const CONVERSATION_STARTERS = [
  'Hey, tell me what you got planned and would some company for?',
  "What's the move? Pitch it to me, I'll pass it on.",
  'Record a quick clip: What are you up to today?',
  'Show them what a fun date looks like with you.',
  "Help me help you. What's the vibe for this date?",
];
let promptIndex = 0;

// --- BUBBLE POPUP COMPONENT (Animated with Speech Tail) ---
const BubblePopup = ({ visible, type, title, message, buttonText, onClose }) => {
  const scaleValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleValue.setValue(0);
      Animated.spring(scaleValue, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  // Logic: 'success' = Happy Cal, Anything else (error/neutral) = Sad Cal
  const isSuccess = type === 'success';
  const imageSource = isSuccess ? HAPPY_IMAGE : ERROR_IMAGE;

  // Style: 'success' = Teal Button, Else = Gold/Yellow Button
  const buttonStyle = isSuccess ? styles.successButton : styles.errorButton;
  const buttonTextStyle = isSuccess ? styles.successButtonText : styles.errorButtonText;
  const bubbleBgColor = styles.bubbleLight;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.popupContainer}>
          {/* Animated Character */}
          <Animated.Image
            source={imageSource}
            style={[styles.popupImage, { transform: [{ scale: scaleValue }] }]}
          />

          <View style={[styles.bubble, bubbleBgColor]}>
            {/* Speech Bubble Tail */}
            <View style={styles.bubbleTail} />

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

const UploadDayVideo = () => {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date: string }>();
  const { auth0User: authUser } = useAuth();
  const [videoAsset, setVideoAsset] = useState<ImagePickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const videoPlayerRef = useRef<Video>(null);

  // Popup State Management
  const [popupState, setPopupState] = useState({
    visible: false,
    type: 'error' as 'success' | 'error' | 'neutral',
    title: '',
    message: '',
    buttonText: 'Got It',
    onClose: () => {},
  });

  const showPopup = (type, title, message, buttonText = 'Got It', onCloseCallback = null) => {
    setPopupState({
      visible: true,
      type,
      title,
      message,
      buttonText,
      onClose: () => {
        setPopupState({ ...popupState, visible: false });
        if (onCloseCallback) {
          onCloseCallback();
        }
      },
    });
  };

  // ✅ INITIAL CONVERSATION TRIGGER
  useEffect(() => {
    const currentPrompt = CONVERSATION_STARTERS[promptIndex];
    promptIndex = (promptIndex + 1) % CONVERSATION_STARTERS.length;
    showPopup('success', 'Cal says:', currentPrompt, "Let's do it!");
  }, []);

  const handleSelectedVideo = (asset: ImagePickerAsset) => {
    if (asset.duration && asset.duration > MAX_VIDEO_DURATION_MS) {
      const errorMessage = `Please select or record a video shorter than ${MAX_VIDEO_DURATION_SECONDS} seconds. This video is ${Math.round(
        asset.duration / 1000
      )} seconds.`;
      showPopup('error', 'Video Too Long', errorMessage);
      setVideoAsset(null);
      videoPlayerRef.current?.unloadAsync();
      return;
    }
    setVideoAsset(asset);
    setUploadProgress(0);
  };

  // ✅ AUDIO CLEANUP: Stop all background audio/video before recording
  const cleanupAudioBeforeRecording = async () => {
    try {
      // Set audio mode for recording - this stops background playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Error cleaning up audio before recording:', error);
      // Don't block recording if audio cleanup fails
    }
  };

  const pickVideoFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showPopup(
        'error',
        'Permission Denied',
        'Sorry, we need camera roll permissions to upload videos.'
      );
      return;
    }
    
    // ✅ CRITICAL FIX: Cleanup audio before opening library picker
    await cleanupAudioBeforeRecording();
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.7,
        allowsEditing: true,
        videoMaxDuration: MAX_VIDEO_DURATION_SECONDS,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        handleSelectedVideo(result.assets[0]);
      }
    } catch (error) {
      console.error('ImagePicker Library Error: ', error);
      showPopup('error', 'Error', 'There was an error picking the video from the library.');
    }
  };

  const recordVideoWithCamera = async () => {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraStatus.status !== 'granted') {
      showPopup(
        'error',
        'Permission Denied',
        'Sorry, we need camera permissions to record videos.'
      );
      return;
    }
    
    // ✅ CRITICAL FIX: Cleanup audio before launching camera
    await cleanupAudioBeforeRecording();
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.7,
        videoMaxDuration: MAX_VIDEO_DURATION_SECONDS,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        handleSelectedVideo(result.assets[0]);
      }
    } catch (error) {
      console.error('ImagePicker Camera Error: ', error);
      showPopup('error', 'Error', 'There was an error recording the video.');
    }
  };

  const dataUriToBlob = (dataUri: string): Blob | null => {
    if (typeof atob === 'undefined') {
      return null;
    }
    try {
      const byteString = atob(dataUri.split(',')[1]);
      const mimeString = dataUri.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new Blob([ab], { type: mimeString });
    } catch (e) {
      return null;
    }
  };

  const handleUpload = async () => {
    if (!videoAsset || !date || !authUser) {
      showPopup('error', 'Error', 'Missing video, date, or authentication. Please try again.');
      return;
    }

    // ✅ State update here triggers re-render, pausing video immediately
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      const uri = videoAsset.uri;
      const fileName = videoAsset.fileName || uri.split('/').pop() || `video_${Date.now()}.mp4`;
      let mimeType = videoAsset.mimeType;

      if (!mimeType) {
        const extension = fileName.split('.').pop()?.toLowerCase();
        if (extension === 'mp4') mimeType = 'video/mp4';
        else if (extension === 'mov') mimeType = 'video/quicktime';
        else mimeType = 'application/octet-stream';
      }

      if (Platform.OS === 'web' && uri.startsWith('data:')) {
        const blob = dataUriToBlob(uri);
        if (blob) {
          formData.append('video', blob, fileName);
        } else {
          throw new Error('Failed to convert video data URI to Blob.');
        }
      } else {
        formData.append('video', {
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          name: fileName,
          type: mimeType,
        } as any);
      }

      formData.append('date', date);

      await uploadCalendarVideo(formData, (progressEvent) => {
        if (progressEvent && progressEvent.total && progressEvent.total > 0) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(Math.min(percentCompleted, 100));
        }
      });

      // ✅ CHECK IF STORIES EXIST - Route accordingly
      try {
        const storiesResponse = await getStoriesByDate(date);
        const stories = storiesResponse.data || [];
        
        if (stories.length > 0) {
          // Stories from other users exist - route to stories feed
          router.replace({
            pathname: '/(app)/stories',
            params: { date }
          });
        } else {
          // No stories from other users - route back to calendar
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(app)/calendar');
          }
        }
      } catch (checkError) {
        // If checking stories fails, default to routing back to calendar
        console.error('Error checking stories:', checkError);
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(app)/calendar');
        }
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Could not upload video.';
      showPopup('error', 'Upload Failed', errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Image source={BACK_ARROW_ICON} style={styles.headerIcon} />
        </TouchableOpacity>
        <Image source={BRAND_LOGO} style={styles.headerLogo} />
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.dateText}>
            For Date: {date ? format(parse(date, 'yyyy-MM-dd', new Date()), 'MMMM do, yyyy') : ''}
          </Text>

          <View style={styles.previewWrapper}>
            {videoAsset ? (
              <Video
                ref={videoPlayerRef}
                source={{ uri: videoAsset.uri }}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                isLooping
                // ✅ CRITICAL FIX: Only play if NOT uploading.
                shouldPlay={!isUploading}
                // ✅ CRITICAL FIX: Mute audio if uploading.
                isMuted={isUploading}
                style={styles.videoPreview}
              />
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>Pick or record a video</Text>
                <Text style={styles.placeholderSubText}>
                  (Max {MAX_VIDEO_DURATION_SECONDS} seconds)
                </Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.actionButton,
                styles.recordButton,
                isUploading && styles.buttonDisabled,
              ]}
              onPress={recordVideoWithCamera}
              disabled={isUploading}>
              <Text style={styles.buttonText}>Record</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.actionButton,
                styles.pickButton,
                isUploading && styles.buttonDisabled,
              ]}
              onPress={pickVideoFromLibrary}
              disabled={isUploading}>
              <Text style={styles.buttonText}>{videoAsset ? 'Change' : 'Upload'}</Text>
            </TouchableOpacity>
          </View>

          {videoAsset && (
            <TouchableOpacity
              style={[styles.button, styles.uploadButton, isUploading && styles.buttonDisabled]}
              onPress={handleUpload}
              disabled={isUploading}>
              {isUploading ? (
                <View style={styles.loadingIndicatorContainer}>
                  <ActivityIndicator size="small" color="#000000" />
                  <Text style={styles.uploadingText}>
                    Uploading... {uploadProgress > 0 ? `${uploadProgress}%` : ''}
                  </Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Post Story</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => router.back()}
            disabled={isUploading}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Reusable Animated Bubble Popup */}
      <BubblePopup
        visible={popupState.visible}
        type={popupState.type}
        title={popupState.title}
        message={popupState.message}
        buttonText={popupState.buttonText}
        onClose={popupState.onClose}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2D2D2D',
    paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2D2D2D',
  },
  headerButton: { padding: 5 },
  headerIcon: { width: 28, height: 28, resizeMode: 'contain' },
  headerLogo: { width: 100, height: 35, resizeMode: 'contain' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  container: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  dateText: {
    fontSize: 18,
    color: '#E0E0E0',
    marginBottom: 25,
    textAlign: 'center',
    marginTop: 10,
  },
  previewWrapper: {
    width: '90%',
    aspectRatio: 16 / 9,
    backgroundColor: '#1a1a1a',
    marginBottom: 25,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  videoPreview: { width: '100%', height: '100%' },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    padding: 10,
  },
  placeholderText: { color: '#888', fontSize: 16, textAlign: 'center' },
  placeholderSubText: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 5 },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    flexDirection: 'row',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginBottom: 15,
  },
  actionButton: { flex: 1, marginHorizontal: 5, width: undefined },
  buttonText: { color: '#000000', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  recordButton: { backgroundColor: '#FF6B6B' },
  pickButton: { backgroundColor: '#3cd9d6' },
  uploadButton: { backgroundColor: '#FFDB5C', width: '90%' },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#777',
    width: '90%',
  },
  cancelButtonText: { color: '#CCC', fontSize: 16, fontWeight: 'bold' },
  buttonDisabled: { opacity: 0.6 },
  loadingIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: { color: '#000000', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },

  // --- POPUP STYLES ---
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    zIndex: 2,
    marginBottom: -85,
  },
  bubble: {
    position: 'relative',
    borderRadius: 25,
    padding: 20,
    paddingTop: 80,
    width: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1,
  },
  bubbleTail: {
    position: 'absolute',
    top: -15,
    left: '50%',
    marginLeft: -10,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
  },
  bubbleLight: {
    backgroundColor: '#FFFFFF',
  },
  popupTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  popupMessage: {
    fontSize: 15,
    color: '#333333',
    marginBottom: 25,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 5,
  },
  popupButton: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  errorButton: {
    backgroundColor: '#FFDB5C', // Gold
  },
  successButton: {
    backgroundColor: '#3cd9d6', // Teal
  },
  errorButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  successButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

export default UploadDayVideo;
