import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import axios from 'axios';

import { API_URL } from '../../utils/api';
import NotificationBell from '../../components/NotificationBell';
import {
  CarShowcase,
  CarEditModal,
  FeedbackModal,
  ProfileNotificationsModal,
} from '../../components/profile';

interface Modification {
  category: string;
  name: string;
  brand?: string;
  description?: string;
}

interface UserCar {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: string;
  color: string;
  trim: string;
  engine: string;
  horsepower?: number;
  torque?: number;
  transmission: string;
  drivetrain: string;
  description: string;
  photos: string[];
  videos: string[];
  modifications: Modification[];
  modificationNotes: string;
  isPublic: boolean;
  instagramHandle: string;
  youtubeChannel: string;
}

export default function ProfileScreen() {
  const { user, isAuthenticated, logout, login } = useAuth();
  const insets = useSafeAreaInsets();
  const [userCar, setUserCar] = useState<UserCar | null>(null);
  const [userCars, setUserCars] = useState<UserCar[]>([]);
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [loadingCar, setLoadingCar] = useState(false);
  const [showCarModal, setShowCarModal] = useState(false);
  const [savingCar, setSavingCar] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState('');
  const [photoUploadCount, setPhotoUploadCount] = useState(0);
  const [carPhotos, setCarPhotos] = useState<string[]>([]);
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0);
  const [garagePublic, setGaragePublic] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [carForm, setCarForm] = useState({
    make: '',
    model: '',
    year: '',
    color: '',
    trim: '',
    engine: '',
    horsepower: '',
    torque: '',
    transmission: '',
    drivetrain: '',
    description: '',
    modificationNotes: '',
    instagramHandle: '',
    youtubeChannel: '',
  });
  
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');

  // Feedback states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    type: 'bug',
    subject: '',
    message: '',
  });

  // Notifications state
  const [garageNotifications, setGarageNotifications] = useState<any[]>([]);
  const [allNotifications, setAllNotifications] = useState<any[]>([]);
  const [showNotifModal, setShowNotifModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserCar(true);
      fetchGarageNotifications();
    }
  }, [isAuthenticated, user]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchUserCar(true),
        fetchGarageNotifications(),
      ]);
    } catch (e) {
      console.log('Refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchUserCar = async (includeAllPhotos = false) => {
    try {
      setLoadingCar(true);
      const url = includeAllPhotos 
        ? `${API_URL}/api/user-cars/user/${user?.id}?include_photos=true`
        : `${API_URL}/api/user-cars/user/${user?.id}`;
      const response = await axios.get(url);
      if (response.data) {
        setUserCar(response.data);
        setEditingCarId(response.data.id);
        setCarForm({
          make: response.data.make || '',
          model: response.data.model || '',
          year: response.data.year || '',
          color: response.data.color || '',
          trim: response.data.trim || '',
          engine: response.data.engine || '',
          horsepower: response.data.horsepower?.toString() || '',
          torque: response.data.torque?.toString() || '',
          transmission: response.data.transmission || '',
          drivetrain: response.data.drivetrain || '',
          description: response.data.description || '',
          modificationNotes: response.data.modificationNotes || '',
          instagramHandle: response.data.instagramHandle || '',
          youtubeChannel: response.data.youtubeChannel || '',
        });
        setCarPhotos(response.data.photos || []);
        setMainPhotoIndex(response.data.mainPhotoIndex || 0);
        setVideoUrls(response.data.videos || []);
        setGaragePublic(response.data.isPublic !== false);
      }
      // Also fetch all cars for the car switcher
      const allCarsRes = await axios.get(`${API_URL}/api/user-cars/user/${user?.id}/all`);
      if (allCarsRes.data && Array.isArray(allCarsRes.data)) {
        setUserCars(allCarsRes.data);
      }
    } catch (error) {
      console.error('Error fetching user car:', error);
    } finally {
      setLoadingCar(false);
    }
  };

  const handleSetActiveCar = async (carId: string) => {
    try {
      await axios.put(`${API_URL}/api/user-cars/${carId}/set-active`);
      fetchUserCar(true);
      Alert.alert('Success', 'Active car switched!');
    } catch (error) {
      console.error('Error switching active car:', error);
      Alert.alert('Error', 'Failed to switch active car');
    }
  };

  const handleAddSecondCar = () => {
    // Reset form for new car creation
    setEditingCarId(null);
    setCarForm({
      make: '', model: '', year: '', color: '', trim: '',
      engine: '', horsepower: '', torque: '', transmission: '',
      drivetrain: '', description: '', modificationNotes: '',
      instagramHandle: '', youtubeChannel: '',
    });
    setCarPhotos([]);
    setMainPhotoIndex(0);
    setVideoUrls([]);
    setGaragePublic(true);
    setShowCarModal(true);
  };

  const handleEditCar = (car: any) => {
    setEditingCarId(car.id);
    setCarForm({
      make: car.make || '', model: car.model || '', year: car.year || '',
      color: car.color || '', trim: car.trim || '', engine: car.engine || '',
      horsepower: car.horsepower?.toString() || '', torque: car.torque?.toString() || '',
      transmission: car.transmission || '', drivetrain: car.drivetrain || '',
      description: car.description || '', modificationNotes: car.modificationNotes || '',
      instagramHandle: car.instagramHandle || '', youtubeChannel: car.youtubeChannel || '',
    });
    setCarPhotos(car.photos || []);
    setMainPhotoIndex(car.mainPhotoIndex || 0);
    setVideoUrls(car.videos || []);
    setGaragePublic(car.isPublic !== false);
    fetchUserCar(true); // Reload with photos for current active
    setShowCarModal(true);
  };

  const fetchGarageNotifications = async () => {
    try {
      if (!user?.id) return;
      const response = await axios.get(`${API_URL}/api/notifications/${user.id}`);
      const allNotifs = response.data;
      const garageNotifs = allNotifs.filter((n: any) => n.type === 'garage_comment');
      setGarageNotifications(garageNotifs);
      setAllNotifications(allNotifs.filter((n: any) => !n.isRead));
    } catch (error) {
      console.log('Failed to fetch garage notifications:', error);
    }
  };

  const markNotificationRead = async (notifId: string) => {
    try {
      await axios.put(`${API_URL}/api/notifications/${notifId}/read`);
      setGarageNotifications(prev => prev.filter(n => n.id !== notifId));
      setAllNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (error) {
      console.log('Failed to mark notification as read:', error);
    }
  };

  const markAllNotificationsRead = async () => {
    try {
      if (!user?.id) return;
      await axios.put(`${API_URL}/api/notifications/user/${user.id}/read-all`);
      setGarageNotifications([]);
      setAllNotifications([]);
    } catch (error) {
      console.log('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationTap = async (notif: any) => {
    await markNotificationRead(notif.id);
    setShowNotifModal(false);
    
    try {
      if (notif.type === 'garage_comment' && notif.carId) {
        router.push(`/garage/${notif.carId}`);
      } else if ((notif.type === 'rsvp_confirmation' || notif.type === 'rsvp_reminder' || notif.type === 'event_reminder') && notif.eventId) {
        router.push(`/event/${notif.eventId}`);
      } else if (notif.type === 'popup_event' && notif.eventId) {
        router.push(`/event/${notif.eventId}`);
      } else if (notif.type === 'message') {
        router.push('/messages');
      } else if (notif.type === 'meetup_invite') {
        router.push('/(tabs)/nearby');
      } else if (notif.type === 'feedback_response') {
        // Stay on profile - the feedback info is in the notification itself
        Alert.alert(notif.title, notif.message);
      } else if (notif.type === 'admin_feedback' || notif.type === 'admin_alert') {
        // Admin notifications - show the full message
        Alert.alert(notif.title, notif.message);
      } else {
        // For unknown types, just show the message
        Alert.alert(notif.title, notif.message);
      }
    } catch (e) {
      console.log('Navigation from notification failed:', e);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'garage_comment': return 'chatbubble';
      case 'rsvp_confirmation': return 'checkmark-circle';
      case 'rsvp_reminder': return 'calendar';
      case 'event_reminder': return 'alarm';
      case 'popup_event': return 'flash';
      case 'message': return 'mail';
      case 'meetup_invite': return 'people';
      case 'feedback_response': return 'megaphone';
      case 'admin_feedback': return 'bug';
      case 'admin_alert': return 'alert-circle';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'garage_comment': return '#4FC3F7';
      case 'rsvp_confirmation': return '#69F0AE';
      case 'rsvp_reminder': return '#ffffff';
      case 'event_reminder': return '#FFD740';
      case 'popup_event': return '#ffffff';
      case 'message': return '#69F0AE';
      case 'meetup_invite': return '#CE93D8';
      case 'feedback_response': return '#FFB74D';
      case 'admin_feedback': return '#EF5350';
      case 'admin_alert': return '#42A5F5';
      default: return '#90A4AE';
    }
  };

  const getTimeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };


  const toggleGaragePublic = async (value: boolean) => {
    setGaragePublic(value);
    
    if (userCar?.id) {
      try {
        await axios.put(`${API_URL}/api/user-cars/${userCar.id}`, {
          isPublic: value,
        });
        Alert.alert(
          'Success',
          value 
            ? 'Your garage is now public! Others can see your build.' 
            : 'Your garage is now private.'
        );
      } catch (error) {
        console.error('Error updating garage privacy:', error);
        setGaragePublic(!value); // Revert on error
        Alert.alert('Error', 'Failed to update privacy setting');
      }
    }
  };

  const handleNotificationToggle = async (value: boolean) => {
    if (!value) {
      Alert.alert(
        'Disable Notifications?',
        'You will not receive notifications about Pop Up events and other important updates. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await updateNotificationPreference(value);
            },
          },
        ]
      );
    } else {
      await updateNotificationPreference(value);
    }
  };

  const updateNotificationPreference = async (enabled: boolean) => {
    try {
      const response = await axios.put(`${API_URL}/api/users/${user?.id}`, {
        notificationsEnabled: enabled,
      });
      await login(response.data);
      Alert.alert(
        'Success',
        enabled
          ? 'Notifications enabled! You\'ll receive Pop Up event alerts.'
          : 'Notifications disabled.'
      );
    } catch (error) {
      console.error('Error updating notification preference:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleLocationToggle = async (value: boolean) => {
    if (!value) {
      Alert.alert(
        'Disable Location Sharing?',
        'Others will not be able to see your location at events. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: async () => {
              await updateLocationPreference(value);
            },
          },
        ]
      );
    } else {
      await updateLocationPreference(value);
    }
  };

  const updateLocationPreference = async (enabled: boolean) => {
    try {
      const response = await axios.put(`${API_URL}/api/users/${user?.id}`, {
        locationSharingEnabled: enabled,
      });
      await login(response.data);
      Alert.alert(
        'Success',
        enabled
          ? 'Location sharing enabled! Others can see your location at events.'
          : 'Location sharing disabled.'
      );
    } catch (error) {
      console.error('Error updating location preference:', error);
      Alert.alert('Error', 'Failed to update location settings');
    }
  };

  const pickCarPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to upload images!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.5,
      base64: false,
    });

    if (!result.canceled && result.assets) {
      if (carPhotos.length + result.assets.length > 10) {
        Alert.alert('Limit Reached', 'You can upload a maximum of 10 images');
        return;
      }

      // Compress and resize each image aggressively for reliable uploads
      const compressedImages: string[] = [];
      for (const asset of result.assets) {
        try {
          const manipulated = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 800 } }],
            { compress: 0.35, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          if (manipulated.base64) {
            compressedImages.push(`data:image/jpeg;base64,${manipulated.base64}`);
          }
        } catch (err) {
          console.error('Image compression error:', err);
        }
      }

      setCarPhotos([...carPhotos, ...compressedImages]);
    }
  };

  const removeCarPhoto = (index: number) => {
    setCarPhotos(carPhotos.filter((_, i) => i !== index));
    // Adjust mainPhotoIndex if needed
    if (index === mainPhotoIndex) {
      setMainPhotoIndex(0);
    } else if (index < mainPhotoIndex) {
      setMainPhotoIndex(mainPhotoIndex - 1);
    }
  };

  const addVideoUrl = () => {
    if (!newVideoUrl.trim()) {
      Alert.alert('Error', 'Please enter a video URL');
      return;
    }
    
    // Basic URL validation
    if (!newVideoUrl.match(/^https?:\/\/.+/i)) {
      Alert.alert('Invalid URL', 'Please enter a valid URL starting with http:// or https://');
      return;
    }
    
    if (videoUrls.length >= 5) {
      Alert.alert('Limit Reached', 'You can add up to 5 video links');
      return;
    }
    
    setVideoUrls([...videoUrls, newVideoUrl.trim()]);
    setNewVideoUrl('');
  };

  const removeVideoUrl = (index: number) => {
    setVideoUrls(videoUrls.filter((_, i) => i !== index));
  };

  const saveCar = async () => {
    if (!carForm.make || !carForm.model || !carForm.year) {
      Alert.alert('Error', 'Please fill in Make, Model, and Year');
      return;
    }

    setSavingCar(true);
    setPhotoUploadProgress('');
    setPhotoUploadCount(0);
    try {
      // Step 1: Save car metadata WITHOUT photos (small payload, always works)
      const metadataPayload = {
        userId: user?.id,
        make: carForm.make,
        model: carForm.model,
        year: carForm.year,
        color: carForm.color,
        trim: carForm.trim,
        engine: carForm.engine,
        horsepower: carForm.horsepower ? parseInt(carForm.horsepower) : null,
        torque: carForm.torque ? parseInt(carForm.torque) : null,
        transmission: carForm.transmission,
        drivetrain: carForm.drivetrain,
        description: carForm.description,
        photos: [],  // Photos uploaded separately
        videos: videoUrls,
        modifications: [],
        modificationNotes: carForm.modificationNotes,
        isPublic: garagePublic,
        instagramHandle: carForm.instagramHandle,
        youtubeChannel: carForm.youtubeChannel,
        mainPhotoIndex: Math.min(mainPhotoIndex, Math.max(0, carPhotos.length - 1)),
        carId: editingCarId || undefined,  // Pass carId when editing existing car
      };

      setPhotoUploadProgress('Saving car info...');
      let carResponse;
      try {
        carResponse = await axios.post(`${API_URL}/api/user-cars/create-or-update-metadata`, metadataPayload);
      } catch (metaError: any) {
        console.error('Metadata save error:', metaError);
        throw new Error('Failed to save car details. Please try again.');
      }

      const savedCarId = carResponse.data?.id;
      if (!savedCarId) {
        throw new Error('Failed to get car ID after save');
      }

      // Step 2: Figure out which photos need to be uploaded
      // HTTP URLs = already stored on server (don't re-upload)
      // Base64/data URIs = new photos from camera/gallery (need upload)
      const newPhotos = carPhotos.filter(p => p && p.length > 0);
      const isHttpUrl = (p: string) => p.startsWith('http://') || p.startsWith('https://');
      const actualNewPhotos = newPhotos.filter(p => !isHttpUrl(p));
      const existingServerPhotos = newPhotos.filter(p => isHttpUrl(p));
      
      if (actualNewPhotos.length > 0) {
        // We have genuinely new photos to upload
        setPhotoUploadProgress('Preparing photos...');
        
        if (existingServerPhotos.length === 0) {
          // ALL photos are new — clear existing and upload fresh
          try {
            await axios.put(`${API_URL}/api/user-cars/${savedCarId}`, {
              photos: [],
            });
          } catch (clearErr) {
            console.log('Note: Could not clear old photos, continuing with upload');
          }
        }
        // If there are existing server photos, DON'T clear — just append new ones

        // Step 3: Upload each NEW photo individually (chunked - bypasses proxy limits)
        let uploadedCount = 0;
        let failedCount = 0;
        for (let i = 0; i < actualNewPhotos.length; i++) {
          setPhotoUploadProgress(`Uploading photo ${i + 1} of ${actualNewPhotos.length}...`);
          setPhotoUploadCount(i + 1);
          try {
            await axios.post(
              `${API_URL}/api/user-cars/${savedCarId}/photos/upload?user_id=${user?.id}`,
              { photo: actualNewPhotos[i] },
              { timeout: 30000 }
            );
            uploadedCount++;
          } catch (photoErr: any) {
            failedCount++;
            console.error(`Failed to upload photo ${i + 1}:`, photoErr?.response?.status, photoErr?.message);
            // Continue uploading remaining photos
          }
        }

        // Step 4: Set the main photo index (use total photo count, not just new uploads)
        if (uploadedCount > 0) {
          try {
            const totalPhotos = existingServerPhotos.length + uploadedCount;
            const adjustedIndex = Math.min(mainPhotoIndex, Math.max(0, totalPhotos - 1));
            await axios.put(`${API_URL}/api/user-cars/${savedCarId}`, {
              mainPhotoIndex: adjustedIndex,
            });
          } catch (idxErr) {
            console.log('Note: Could not set main photo index');
          }
        }

        if (failedCount > 0 && uploadedCount === 0) {
          throw new Error(`All ${failedCount} photos failed to upload. Your car info was saved but photos could not be uploaded. This may be due to image size limits.`);
        } else if (failedCount > 0) {
          Alert.alert(
            'Partially Saved',
            `Car saved! ${uploadedCount} of ${actualNewPhotos.length} photos uploaded successfully. ${failedCount} photo(s) were too large and skipped.`
          );
        }
      }

      setPhotoUploadProgress('');
      // Refresh car data
      const refreshed = await axios.get(`${API_URL}/api/user-cars/user/${user?.id}?include_photos=true`);
      setUserCar(refreshed.data);
      setShowCarModal(false);
      if (!newPhotos.length || carPhotos.length === 0) {
        Alert.alert('Success', 'Your car has been saved to your garage!');
      } else {
        Alert.alert('Success', 'Your car and photos have been saved!');
      }
    } catch (error: any) {
      console.error('Error saving car:', error);
      let errorMsg = error?.message || 'Failed to save car. Please try again.';
      if (error?.response?.status === 413) {
        errorMsg = 'Data too large. Try removing some photos or using lower resolution images.';
      } else if (error?.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error?.message?.includes?.('Network')) {
        errorMsg = 'Network error. Please check your connection and try again.';
      } else if (error?.message?.includes?.('timeout')) {
        errorMsg = 'Upload timed out. Try with fewer or smaller photos.';
      }
      Alert.alert('Error Saving Garage', errorMsg);
    } finally {
      setSavingCar(false);
      setPhotoUploadProgress('');
      setPhotoUploadCount(0);
    }
  };

  const submitFeedback = async () => {
    if (!feedbackForm.subject.trim() || !feedbackForm.message.trim()) {
      Alert.alert('Error', 'Please fill in both subject and message');
      return;
    }

    setSendingFeedback(true);
    try {
      await axios.post(`${API_URL}/api/feedback`, {
        userId: user?.id,
        userName: user?.name,
        userEmail: user?.email,
        type: feedbackForm.type,
        subject: feedbackForm.subject,
        message: feedbackForm.message,
      });

      Alert.alert(
        'Thank You!',
        'Your feedback has been sent to the admin team. We appreciate your input!',
        [{ text: 'OK', onPress: () => {
          setShowFeedbackModal(false);
          setFeedbackForm({ type: 'bug', subject: '', message: '' });
        }}]
      );
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#C0C0C0', '#1a1a1a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', opacity: 0.9, width: 60, fontFamily: 'RobotoCondensed-Regular' }}>Garage</Text>
            <Image
              source={require('../../assets/images/streetmotion-logo.png')}
              style={{ width: 126, height: 45 }}
              resizeMode="contain"
            />
            <View style={{ width: 60 }} />
          </View>
        </LinearGradient>
        
        <View style={styles.guestContainer}>
          <Image
            source={require('../../assets/images/streetmotion-logo.png')}
            style={{ width: 126, height: 45 }}
            resizeMode="contain"
          />
          <Text style={styles.guestTitle}>Guest Mode</Text>
          <Text style={styles.guestText}>
            Login to create your garage, save favorites, RSVP to events, and more
          </Text>
          
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/auth/register')}
          >
            <Text style={styles.registerButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={['#ffffff']}
          />
        }
      >
        <LinearGradient
          colors={['#C0C0C0', '#1a1a1a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
        >
          <View style={styles.headerRow}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', opacity: 0.9, width: 60, fontFamily: 'RobotoCondensed-Regular' }}>Garage</Text>
            <Image
              source={require('../../assets/images/streetmotion-logo.png')}
              style={{ width: 126, height: 45 }}
              resizeMode="contain"
            />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: 60, justifyContent: 'flex-end' }}>
              <NotificationBell
                unreadCount={allNotifications.length}
                onPress={() => setShowNotifModal(true)}
                size={20}
              />
              <TouchableOpacity onPress={() => { fetchUserCar(true); setShowCarModal(true); }}>
                <Ionicons name="settings-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
        
        {/* Car Showcase */}
        <CarShowcase
          loading={loadingCar}
          userCar={userCar}
          userCars={userCars}
          onEditCar={() => { 
            if (userCar) {
              setEditingCarId(userCar.id); 
              fetchUserCar(true); 
              setShowCarModal(true); 
            }
          }}
          onAddSecondCar={handleAddSecondCar}
          onSetActiveCar={handleSetActiveCar}
          onOpenModal={() => setShowCarModal(true)}
        />

        {/* Browse Public Garages - prominent placement */}
        <TouchableOpacity
          style={styles.publicGarageButton}
          onPress={() => router.push('/garage')}
          activeOpacity={0.7}
        >
          <View style={styles.publicGarageIconCircle}>
            <Ionicons name="car-sport" size={22} color="#4CAF50" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.publicGarageTitle}>Browse Public Garages</Text>
            <Text style={styles.publicGarageSub}>See what others are driving</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#666" />
        </TouchableOpacity>

        {/* ===== EVENTS & RSVPs ===== */}
        <View style={styles.menuSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar" size={20} color="#ffffff" />
            <Text style={styles.sectionHeaderText}>Events & RSVPs</Text>
          </View>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/my-rsvps')}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <Text style={styles.menuItemText}>My RSVPs</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/my-events')}>
            <Ionicons name="create" size={24} color="#ffffff" />
            <Text style={styles.menuItemText}>My Created Events</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/my-favorites')}>
            <Ionicons name="heart" size={24} color="#E91E63" />
            <Text style={styles.menuItemText}>My Favorite Events</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/instant-add-event')}>
            <Ionicons name="camera" size={24} color="#9C27B0" />
            <Text style={styles.menuItemText}>Instant Add Event</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* ===== COMMUNITY ===== */}
        <View style={styles.menuSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="people" size={20} color="#ffffff" />
            <Text style={styles.sectionHeaderText}>Community</Text>
          </View>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/messages')}>
            <Ionicons name="chatbubbles" size={24} color="#2196F3" />
            <Text style={styles.menuItemText}>Messages</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/feeds')}>
            <Ionicons name="newspaper" size={24} color="#FF9800" />
            <Text style={styles.menuItemText}>Community Lounge</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/clubs')}>
            <Ionicons name="people-circle" size={24} color="#4CAF50" />
            <Text style={styles.menuItemText}>Clubs</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/crews')}>
            <Ionicons name="shield" size={24} color="#FFE707" />
            <Text style={styles.menuItemText}>My Crews</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/crews/create')}>
            <Ionicons name="add-circle" size={24} color="#FFE707" />
            <Text style={styles.menuItemText}>Create a Crew</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/garage/tagged-photos')}>
            <Ionicons name="images" size={24} color="#9C27B0" />
            <Text style={styles.menuItemText}>Tagged Photos</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* ===== PERFORMANCE ===== */}
        <View style={styles.menuSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="speedometer" size={20} color="#ffffff" />
            <Text style={styles.sectionHeaderText}>Performance</Text>
          </View>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/timer')}>
            <Ionicons name="timer" size={24} color="#E91E63" />
            <Text style={styles.menuItemText}>Performance Timer</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/timer/my-runs')}>
            <Ionicons name="analytics" size={24} color="#ffffff" />
            <Text style={styles.menuItemText}>My Performance Runs</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/timer/leaderboard')}>
            <Ionicons name="trophy" size={24} color="#ffffff" />
            <Text style={styles.menuItemText}>Area Leaderboards</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {user?.isAdmin && (
          <View style={styles.menuSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#ffffff" />
              <Text style={styles.sectionHeaderText}>Admin</Text>
            </View>
            <TouchableOpacity 
              style={[styles.menuItem, styles.adminMenuItem]} 
              onPress={() => router.push('/admin/pending')}
            >
              <Ionicons name="time" size={24} color="#ffffff" />
              <Text style={styles.menuItemText}>Pending Events</Text>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.menuItem, styles.adminMenuItem]} 
              onPress={() => router.push('/admin/pending-clubs')}
            >
              <Ionicons name="people" size={24} color="#9C27B0" />
              <Text style={styles.menuItemText}>Pending Clubs</Text>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.menuItem, styles.adminMenuItem]} 
              onPress={() => router.push('/admin/feedback')}
            >
              <Ionicons name="chatbubble-ellipses" size={24} color="#2196F3" />
              <Text style={styles.menuItemText}>Manage Feedback</Text>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.menuItem, styles.adminMenuItem]} 
              onPress={() => router.push('/admin/event-search')}
            >
              <Ionicons name="search" size={24} color="#4CAF50" />
              <Text style={styles.menuItemText}>Event Search</Text>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.menuItem, styles.adminMenuItem]} 
              onPress={() => router.push('/admin/broadcast')}
            >
              <Ionicons name="megaphone" size={24} color="#FF9800" />
              <Text style={styles.menuItemText}>Broadcast Message</Text>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.menuItem, styles.adminMenuItem]} 
              onPress={() => router.push('/admin/facebook-import')}
            >
              <Ionicons name="logo-facebook" size={24} color="#1877F2" />
              <Text style={styles.menuItemText}>Facebook Import</Text>
              <Ionicons name="chevron-forward" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.menuSection}>
          <Text style={styles.settingsSectionTitle}>Settings</Text>
          
          {/* Debug: Server connection info */}
          <TouchableOpacity 
            style={[styles.menuItem, { backgroundColor: '#1a1a2e' }]}
            onPress={() => Alert.alert('Server Info', `Connected to:\n${API_URL || 'NOT SET'}`)}
          >
            <Ionicons name="server" size={24} color="#ffffff" />
            <Text style={[styles.menuItemText, { fontSize: 11, color: '#888' }]}>
              Server: {API_URL ? API_URL.replace('https://', '').split('.')[0] : 'NOT SET'}
            </Text>
          </TouchableOpacity>

          <View style={styles.menuItem}>
            <Ionicons name="notifications" size={24} color={user?.notificationsEnabled !== false ? '#4CAF50' : '#F44336'} />
            <Text style={styles.menuItemText}>Notifications</Text>
            <Switch
              value={user?.notificationsEnabled !== false}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: '#F44336', true: '#4CAF50' }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.menuItem}>
            <Ionicons name="location" size={24} color={user?.locationSharingEnabled !== false ? '#4CAF50' : '#F44336'} />
            <Text style={styles.menuItemText}>Location Sharing</Text>
            <Switch
              value={user?.locationSharingEnabled !== false}
              onValueChange={handleLocationToggle}
              trackColor={{ false: '#F44336', true: '#4CAF50' }}
              thumbColor="#fff"
            />
          </View>
          <Text style={styles.settingsHint}>
            Location sharing allows others to see your location at events
          </Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={async () => {
              Alert.alert(
                'Clear Saved Login',
                'This will remove your saved login credentials from this device. You will need to enter them again next time.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await SecureStore.deleteItemAsync('rememberMe');
                        await SecureStore.deleteItemAsync('savedEmail');
                        await SecureStore.deleteItemAsync('savedPassword');
                        Alert.alert('Success', 'Saved login credentials have been cleared.');
                      } catch (error) {
                        console.error('Error clearing credentials:', error);
                        Alert.alert('Error', 'Failed to clear saved credentials.');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="key" size={24} color="#ffffff" />
            <Text style={styles.menuItemText}>Clear Saved Login</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.settingsHint}>
            Remove saved login credentials from this device
          </Text>
        </View>

        {/* Route Planning Section */}
        <View style={styles.menuSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="map" size={20} color="#ffffff" />
            <Text style={styles.sectionHeaderText}>Route Planning</Text>
          </View>
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => router.push('/routes')}
          >
            <Ionicons name="navigate" size={24} color="#4CAF50" />
            <Text style={styles.menuItemText}>My Scenic Routes</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => router.push('/routes/create')}
          >
            <Ionicons name="add-circle" size={24} color="#2196F3" />
            <Text style={styles.menuItemText}>Create New Route</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => router.push('/routes?tab=discover')}
          >
            <Ionicons name="compass" size={24} color="#9C27B0" />
            <Text style={styles.menuItemText}>Discover Routes</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Garage Visibility Section */}
        <View style={styles.menuSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="eye" size={20} color="#ffffff" />
            <Text style={styles.sectionHeaderText}>Garage Visibility</Text>
          </View>
          <View style={[
            styles.visibilityToggleCard,
            { borderColor: garagePublic ? '#4CAF50' : '#ffffff', borderWidth: 1.5 }
          ]}>
            <View style={styles.visibilityStatusRow}>
              <View style={[
                styles.visibilityBadge,
                { backgroundColor: garagePublic ? 'rgba(76,175,80,0.15)' : 'rgba(255,82,82,0.15)' }
              ]}>
                <Ionicons 
                  name={garagePublic ? "globe-outline" : "lock-closed"} 
                  size={20} 
                  color={garagePublic ? "#4CAF50" : "#ffffff"} 
                />
                <Text style={[
                  styles.visibilityBadgeText,
                  { color: garagePublic ? '#4CAF50' : '#ffffff' }
                ]}>
                  {garagePublic ? 'PUBLIC' : 'PRIVATE'}
                </Text>
              </View>
              <Switch
                value={garagePublic}
                onValueChange={toggleGaragePublic}
                trackColor={{ false: '#ffffff', true: '#4CAF50' }}
                thumbColor="#fff"
              />
            </View>
            <Text style={styles.visibilityDescription}>
              {garagePublic 
                ? 'Your garage is visible to everyone in Community Garages. Other users can browse, view, and like your build.'
                : 'Your garage is hidden. Only you can see it. Turn on to share your build with the community.'}
            </Text>
          </View>
        </View>

        {/* Report Suggestions & Bugs Section */}
        <View style={styles.menuSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="chatbubble-ellipses" size={20} color="#ffffff" />
            <Text style={styles.sectionHeaderText}>Feedback</Text>
          </View>
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => setShowFeedbackModal(true)}
          >
            <Ionicons name="bug" size={24} color="#F44336" />
            <Text style={styles.menuItemText}>Report Bug</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => {
              setFeedbackForm({ ...feedbackForm, type: 'suggestion' });
              setShowFeedbackModal(true);
            }}
          >
            <Ionicons name="bulb" size={24} color="#ffffff" />
            <Text style={styles.menuItemText}>Suggest a Feature</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => {
              setFeedbackForm({ ...feedbackForm, type: 'other' });
              setShowFeedbackModal(true);
            }}
          >
            <Ionicons name="mail" size={24} color="#2196F3" />
            <Text style={styles.menuItemText}>Contact Admin</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => router.push('/feedback/history')}
          >
            <Ionicons name="time" size={24} color="#9C27B0" />
            <Text style={styles.menuItemText}>My Feedback History</Text>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => router.push('/account-settings')}>
          <Ionicons name="settings-outline" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>Log Out or Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Car Edit Modal */}
      <CarEditModal
        visible={showCarModal}
        onClose={() => setShowCarModal(false)}
        userCar={userCar}
        carForm={carForm}
        setCarForm={setCarForm}
        carPhotos={carPhotos}
        mainPhotoIndex={mainPhotoIndex}
        setMainPhotoIndex={setMainPhotoIndex}
        videoUrls={videoUrls}
        newVideoUrl={newVideoUrl}
        setNewVideoUrl={setNewVideoUrl}
        garagePublic={garagePublic}
        setGaragePublic={setGaragePublic}
        savingCar={savingCar}
        photoUploadProgress={photoUploadProgress}
        onPickPhoto={pickCarPhoto}
        onRemovePhoto={removeCarPhoto}
        onAddVideo={addVideoUrl}
        onRemoveVideo={removeVideoUrl}
        onSave={saveCar}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        user={user}
        feedbackForm={feedbackForm}
        setFeedbackForm={setFeedbackForm}
        sendingFeedback={sendingFeedback}
        onSubmit={submitFeedback}
      />

      {/* Notifications Modal */}
      <ProfileNotificationsModal
        visible={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        notifications={allNotifications}
        onTapNotification={handleNotificationTap}
        onClearAll={markAllNotificationsRead}
        getNotificationIcon={getNotificationIcon}
        getNotificationColor={getNotificationColor}
        getTimeAgo={getTimeAgo}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  headerGradient: {
    paddingBottom: 0,
    paddingHorizontal: 20,
    overflow: 'hidden',
    boxShadow: 'inset 2px 6px 19px 8px #000000',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
    textShadow: '0px 3px 4px #000000cc',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(65, 59, 59, 0.9)',
    marginTop: -5,
    marginBottom: 5,
  },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  guestText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  loginButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 32,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  registerButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  carShowcaseSection: {
    paddingTop: 5,
    paddingBottom: 20,
    paddingHorizontal: 0,
  },
  carCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 0,
    overflow: 'hidden',
    width: '100%',
  },
  carPhotosScroll: {
    height: 220,
  },
  carPhoto: {
    width: 300,
    height: 200,
    marginRight: 8,
  },
  carMainPhotoContainer: {
    height: 220,
    position: 'relative',
    backgroundColor: '#111',
    overflow: 'hidden',
  },
  carMainPhoto: {
    width: '100%',
    height: '100%',
    ...Platform.select({
      web: {
        objectFit: 'cover' as any,
      },
    }),
  },
  carPhotoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  carPhotoCountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  carPhotoCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  viewPicsButton: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  viewPicsText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  noPhotoContainer: {
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
  },
  noPhotoText: {
    color: '#666',
    marginTop: 8,
  },
  carInfo: {
    padding: 16,
  },
  carTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  carTrim: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 12,
  },
  carStatsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  carDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  carDetailText: {
    color: '#aaa',
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  carDescription: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  garageActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  editCarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 12,
    flex: 1,
  },
  editCarButtonText: {
    color: '#ffffff',
    marginLeft: 8,
    fontWeight: '600',
  },
  addCarInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 4,
    borderLeftWidth: 1,
    borderLeftColor: '#333',
  },
  addCarInlineText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  // Garage Notifications
  garageNotifsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },

  publicGarageLink: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  publicGarageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#4CAF5033',
  },
  publicGarageIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF5018',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  publicGarageTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  publicGarageSub: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  publicGarageLinkGradient: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  publicGarageLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  publicGarageLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  publicGarageLinkTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  publicGarageLinkSub: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  addCarCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    borderStyle: 'dashed',
  },
  nudgeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 14,
  },
  nudgeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  addCarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  addCarSubtitle: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  nudgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
    marginTop: 18,
  },
  nudgeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  menuSection: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  adminMenuItem: {
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  menuItemBadge: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 8,
    marginTop: -10,
  },
  menuItemBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  settingsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#fff',
  },
  settingHintSmall: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    marginTop: 12,
    marginBottom: 40,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalContent: {
    padding: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    marginTop: 16,
  },
  modalHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
  },
  modalTextArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  drivetrainOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  drivetrainButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  drivetrainButtonActive: {
    backgroundColor: '#ffffff',
  },
  drivetrainText: {
    color: '#888',
    fontWeight: '600',
  },
  drivetrainTextActive: {
    color: '#fff',
  },
  uploadButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  photoHint: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  photosPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  photoContainer: {
    position: 'relative',
    overflow: 'visible',
  },
  photoContainerMain: {
    borderWidth: 2,
    borderColor: '#FFD700',
    borderRadius: 14,
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    paddingVertical: 2,
    alignItems: 'center',
    zIndex: 5,
    ...Platform.select({
      android: { elevation: 3 },
    }),
  },
  coverBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  setCoverButton: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#444',
    zIndex: 10,
    ...Platform.select({
      android: { elevation: 5 },
    }),
  },
  setCoverButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    borderColor: '#FFD700',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#0c0c0c',
    borderRadius: 12,
    zIndex: 10,
    ...Platform.select({
      android: { elevation: 5 },
    }),
  },
  videoInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  addVideoButton: {
    backgroundColor: '#ffffff',
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoList: {
    marginTop: 12,
    gap: 8,
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  videoUrl: {
    flex: 1,
    color: '#aaa',
    fontSize: 13,
  },
  publicToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  publicToggleInfo: {
    flex: 1,
    gap: 8,
    marginRight: 12,
  },
  publicToggleTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  publicToggleHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  visibilityToggleCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 4,
  },
  visibilityStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  visibilityBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  visibilityDescription: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 18,
  },
  saveButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  feedbackDescription: {
    color: '#888',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  feedbackTypeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  feedbackTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  feedbackTypeButtonActive: {
    backgroundColor: '#ffffff',
  },
  feedbackTypeText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  feedbackTypeTextActive: {
    color: '#fff',
  },
  feedbackTextArea: {
    height: 150,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  feedbackFromSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  feedbackFromText: {
    color: '#888',
    fontSize: 13,
  },
});
