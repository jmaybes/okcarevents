import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Linking,
  Alert,
  Pressable,
  Modal,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, { 
  FadeInDown, 
  FadeIn,
  FadeInLeft,
  FadeInRight,
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  SlideInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../../../contexts/AuthContext';

import { API_URL } from '../../../utils/api';
import PageHeader from '../../../components/PageHeader';
import NotificationModal from '../../../components/NotificationModal';
import { useNotifications } from '../../../hooks/useNotifications';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  address: string;
  city: string;
  organizer: string;
  entryFee: string;
  carTypes: string[];
  eventType: string;
  attendeeCount: number;
  contactInfo: string;
  website: string;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  rating?: number;
  createdAt: string;
}

// Format date string for display (handles both "2025-06-15" and "2025-06-15T00:00:00")
const formatEventDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const cleanDate = dateStr.split('T')[0];
    const [year, month, day] = cleanDate.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const date = new Date(year, month - 1, day);
    return `${days[date.getDay()]}, ${months[month - 1]} ${day}, ${year}`;
  } catch {
    return dateStr.split('T')[0];
  }
};

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const notif = useNotifications(user?.id);
  const [event, setEvent] = useState<Event | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRSVPed, setIsRSVPed] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [flyerModalVisible, setFlyerModalVisible] = useState(false);
  const [flyerLoading, setFlyerLoading] = useState(false);
  const [flyerUri, setFlyerUri] = useState<string | null>(null);

  useEffect(() => {
    fetchEventDetails();
    fetchComments();
    if (isAuthenticated && user) {
      checkRSVPStatus();
    }
    if (user?.id) notif.fetchNotifications();
  }, [id, isAuthenticated, user]);

  const fetchEventDetails = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/events/${id}`);
      setEvent(response.data);
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/comments/event/${id}`);
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const checkRSVPStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/rsvp/check/${user?.id}/${id}`);
      setIsRSVPed(response.data.hasRsvp);
    } catch (error) {
      console.error('Error checking RSVP status:', error);
    }
  };

  const handleRSVP = async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to RSVP to events', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }

    setRsvpLoading(true);
    try {
      if (isRSVPed) {
        // Cancel RSVP
        await axios.delete(`${API_URL}/api/rsvp/${user?.id}/${id}`);
        setIsRSVPed(false);
        if (event) {
          setEvent({ ...event, attendeeCount: event.attendeeCount - 1 });
        }
        Alert.alert('RSVP Cancelled', 'You have cancelled your RSVP for this event.');
      } else {
        // Create RSVP
        await axios.post(`${API_URL}/api/rsvp`, {
          userId: user?.id,
          eventId: id,
        });
        setIsRSVPed(true);
        if (event) {
          setEvent({ ...event, attendeeCount: event.attendeeCount + 1 });
        }
        Alert.alert(
          'RSVP Confirmed!',
          "You're going! We'll send you a reminder notification 24 hours before the event.",
          [{ text: 'Great!' }]
        );
      }
    } catch (error: any) {
      console.error('Error RSVP:', error);
      const message = error.response?.data?.detail || 'Failed to process RSVP';
      Alert.alert('Error', message);
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      Alert.alert('Login Required', 'Please login to save favorites', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }

    try {
      await axios.post(`${API_URL}/api/favorites`, {
        userId: user?.id,
        eventId: id,
      });
      setIsFavorited(true);
      Alert.alert('Success', 'Added to favorites!');
    } catch (error) {
      console.error('Error adding favorite:', error);
    }
  };

  const handleShare = async () => {
    if (!event) return;
    
    try {
      await Share.share({
        message: `Check out this event: ${event.title}\n${formatEventDate(event.date)} at ${event.time}\n${event.city}`,
        title: event.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleViewFlyer = useCallback(async () => {
    if (!id) return;
    setFlyerLoading(true);
    setFlyerModalVisible(true);

    try {
      const flyerUrl = `${API_URL}/api/events/${id}/flyer`;
      const fileUri = `${FileSystem.cacheDirectory}flyer-${id}.jpg`;

      const downloadResult = await FileSystem.downloadAsync(flyerUrl, fileUri);

      if (downloadResult.status === 200) {
        setFlyerUri(downloadResult.uri);
      } else {
        Alert.alert('Error', 'Failed to generate flyer. Please try again.');
        setFlyerModalVisible(false);
      }
    } catch (error) {
      console.error('Error generating flyer:', error);
      Alert.alert('Error', 'Failed to generate flyer. Please try again.');
      setFlyerModalVisible(false);
    } finally {
      setFlyerLoading(false);
    }
  }, [id]);

  const handleShareFlyer = useCallback(async () => {
    if (!flyerUri) return;

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(flyerUri, {
          mimeType: 'image/jpeg',
          dialogTitle: `${event?.title || 'Event'} Flyer`,
          UTI: 'public.jpeg',
        });
      } else {
        // Fallback: share text
        await Share.share({
          message: `Check out this event: ${event?.title}\n${formatEventDate(event?.date || '')} at ${event?.time}\n${event?.city}`,
          title: event?.title,
        });
      }
    } catch (error) {
      console.error('Error sharing flyer:', error);
    }
  }, [flyerUri, event]);

  const openWebsite = (url: string) => {
    Linking.openURL(url).catch((err) =>
      console.error('Error opening URL:', err)
    );
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color="#FF5500" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PageHeader
        title="Event Details"
        showBackButton={true}
        showNotificationBell={true}
        unreadCount={notif.unreadCount}
        onNotificationPress={() => notif.setShowModal(true)}
        rightComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {user?.isAdmin && (
              <>
                <TouchableOpacity 
                  onPress={() => router.push(`/admin/edit-event/${id}`)}
                  style={styles.editButton}
                >
                  <Ionicons name="create-outline" size={20} color="#FF5500" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    Alert.alert(
                      'Delete Event',
                      'Are you sure you want to delete this event? This cannot be undone.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => {
                            axios.delete(`${API_URL}/api/events/${id}`)
                              .then(() => {
                                Alert.alert('Deleted', 'Event has been removed.');
                                router.back();
                              })
                              .catch(() => Alert.alert('Error', 'Failed to delete event.'));
                          },
                        },
                      ]
                    );
                  }}
                  style={styles.editButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={handleShare}>
              <Ionicons name="share-social" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView style={styles.scrollView}>
        <Animated.View 
          entering={FadeInDown.delay(100).springify()}
          style={styles.header}
        >
          <View style={styles.typeTag}>
            <Ionicons name="car-sport" size={16} color="#FF5500" />
            <Text style={styles.typeText}>{event.eventType}</Text>
          </View>
          <Text style={styles.title}>{event.title}</Text>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(200).springify()}
          style={styles.infoSection}
        >
          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={24} color="#FF5500" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoText}>{formatEventDate(event.date)}</Text>
              <Text style={styles.infoText}>{event.time}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location" size={24} color="#FF5500" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoText}>{event.location || 'TBD'}</Text>
              <Text style={styles.infoText}>{event.address}</Text>
              <Text style={styles.infoText}>{event.city}</Text>
            </View>
          </View>

          {event.organizer && (
            <View style={styles.infoRow}>
              <Ionicons name="person" size={24} color="#FF5500" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Organizer</Text>
                <Text style={styles.infoText}>{event.organizer}</Text>
              </View>
            </View>
          )}

          {event.entryFee && (
            <View style={styles.infoRow}>
              <Ionicons name="cash" size={24} color="#FF5500" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Entry Fee</Text>
                <Text style={styles.infoText}>{event.entryFee}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="people" size={24} color="#FF5500" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Attendees</Text>
              <Text style={styles.infoText}>{event.attendeeCount} going</Text>
            </View>
          </View>
        </Animated.View>

        {event.description && (
          <Animated.View 
            entering={FadeInDown.delay(300).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{event.description}</Text>
          </Animated.View>
        )}

        {event.carTypes.length > 0 && (
          <Animated.View 
            entering={FadeInDown.delay(400).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Car Types Expected</Text>
            <View style={styles.tagContainer}>
              {event.carTypes.map((type, index) => (
                <Animated.View 
                  key={index} 
                  entering={FadeInRight.delay(400 + index * 50).springify()}
                  style={styles.tag}
                >
                  <Text style={styles.tagText}>{type}</Text>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {event.contactInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact</Text>
            <Text style={styles.contactText}>{event.contactInfo}</Text>
          </View>
        )}

        {event.website && (
          <TouchableOpacity
            style={styles.websiteButton}
            onPress={() => openWebsite(event.website)}
          >
            <Ionicons name="globe" size={20} color="#2196F3" />
            <Text style={styles.websiteButtonText}>Visit Website</Text>
          </TouchableOpacity>
        )}

        {/* Photo Gallery Link */}
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={() => router.push(`/event/${id}/gallery`)}
        >
          <View style={styles.galleryButtonContent}>
            <View style={styles.galleryIconContainer}>
              <Ionicons name="images" size={24} color="#fff" />
            </View>
            <View style={styles.galleryButtonText}>
              <Text style={styles.galleryTitle}>Photo Gallery</Text>
              <Text style={styles.gallerySubtitle}>View & share event photos</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </View>
        </TouchableOpacity>

        {/* View Flyer Button */}
        <TouchableOpacity
          style={styles.flyerButton}
          onPress={handleViewFlyer}
        >
          <View style={styles.galleryButtonContent}>
            <View style={[styles.galleryIconContainer, { backgroundColor: '#E91E63' }]}>
              <Ionicons name="document-text" size={24} color="#fff" />
            </View>
            <View style={styles.galleryButtonText}>
              <Text style={styles.galleryTitle}>Event Flyer</Text>
              <Text style={styles.gallerySubtitle}>View & share auto-generated flyer</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </View>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comments ({comments.length})</Text>
          {comments.length === 0 ? (
            <Text style={styles.noComments}>No comments yet</Text>
          ) : (
            comments.map((comment) => (
              <View key={comment.id} style={styles.comment}>
                <Text style={styles.commentUser}>{comment.userName}</Text>
                <Text style={styles.commentText}>{comment.text}</Text>
                <Text style={styles.commentDate}>
                  {new Date(comment.createdAt).toLocaleDateString()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom || 8 }]}>
        <TouchableOpacity
          style={[styles.actionButton, styles.favoriteButton]}
          onPress={handleFavorite}
        >
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={24}
            color="#FF5500"
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.rsvpButton,
            isRSVPed && styles.rsvpButtonActive
          ]}
          onPress={handleRSVP}
          disabled={rsvpLoading}
        >
          {rsvpLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name={isRSVPed ? 'checkmark-circle' : 'calendar'}
                size={20}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.rsvpButtonText}>
                {isRSVPed ? "You're Going!" : 'RSVP'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Flyer Modal */}
      <Modal
        visible={flyerModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setFlyerModalVisible(false)}
      >
        <View style={styles.flyerModalOverlay}>
          <View style={[styles.flyerModalContainer, { paddingTop: insets.top }]}>
            {/* Modal Header */}
            <View style={styles.flyerModalHeader}>
              <TouchableOpacity
                style={styles.flyerModalCloseBtn}
                onPress={() => {
                  setFlyerModalVisible(false);
                  setFlyerUri(null);
                }}
              >
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.flyerModalTitle}>Event Flyer</Text>
              {flyerUri && (
                <TouchableOpacity
                  style={styles.flyerShareBtn}
                  onPress={handleShareFlyer}
                >
                  <Ionicons name="share-outline" size={24} color="#FF5500" />
                  <Text style={styles.flyerShareText}>Share</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Flyer Content */}
            <View style={styles.flyerContentContainer}>
              {flyerLoading ? (
                <View style={styles.flyerLoadingContainer}>
                  <ActivityIndicator size="large" color="#FF5500" />
                  <Text style={styles.flyerLoadingText}>Generating flyer...</Text>
                </View>
              ) : flyerUri ? (
                <ScrollView
                  contentContainerStyle={styles.flyerScrollContent}
                  maximumZoomScale={3}
                  minimumZoomScale={0.5}
                  showsVerticalScrollIndicator={false}
                >
                  <Image
                    source={{ uri: flyerUri }}
                    style={styles.flyerImage}
                    resizeMode="contain"
                  />
                </ScrollView>
              ) : (
                <View style={styles.flyerLoadingContainer}>
                  <Ionicons name="alert-circle" size={48} color="#666" />
                  <Text style={styles.flyerLoadingText}>Failed to load flyer</Text>
                </View>
              )}
            </View>

            {/* Bottom action bar */}
            {flyerUri && (
              <View style={[styles.flyerBottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                  style={styles.flyerActionBtn}
                  onPress={handleShareFlyer}
                >
                  <Ionicons name="share-social" size={22} color="#fff" />
                  <Text style={styles.flyerActionText}>Share Flyer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <NotificationModal
        visible={notif.showModal}
        onClose={() => notif.setShowModal(false)}
        notifications={notif.notifications}
        onTapNotification={notif.handleTap}
        onClearAll={notif.markAllRead}
        getIcon={notif.getIcon}
        getColor={notif.getColor}
        getTimeAgo={notif.getTimeAgo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0c0c0c',
  },
  editButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 0,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  typeText: {
    color: '#FF5500',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 36,
  },
  infoSection: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 15,
    color: '#fff',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#aaa',
    lineHeight: 24,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    color: '#FF5500',
    fontSize: 13,
  },
  contactText: {
    fontSize: 15,
    color: '#aaa',
  },
  websiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  websiteButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  galleryButton: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  galleryButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  galleryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FF5500',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryButtonText: {
    flex: 1,
    marginLeft: 14,
  },
  galleryTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  gallerySubtitle: {
    color: '#888',
    fontSize: 13,
    marginTop: 2,
  },
  comment: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 4,
  },
  commentDate: {
    fontSize: 11,
    color: '#666',
  },
  noComments: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 8,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
  },
  actionButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButton: {
    backgroundColor: '#1a1a1a',
    width: 56,
  },
  rsvpButton: {
    backgroundColor: '#FF5500',
    flex: 1,
    flexDirection: 'row',
  },
  rsvpButtonActive: {
    backgroundColor: '#4CAF50',
  },
  rsvpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
  },
  flyerButton: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  flyerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  flyerModalContainer: {
    flex: 1,
  },
  flyerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  flyerModalCloseBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flyerModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  flyerShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    gap: 6,
  },
  flyerShareText: {
    color: '#FF5500',
    fontSize: 14,
    fontWeight: '600',
  },
  flyerContentContainer: {
    flex: 1,
  },
  flyerScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  flyerImage: {
    width: SCREEN_WIDTH - 32,
    height: (SCREEN_WIDTH - 32) * 1.25,
    borderRadius: 12,
  },
  flyerLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  flyerLoadingText: {
    color: '#888',
    fontSize: 16,
  },
  flyerBottomBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  flyerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5500',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  flyerActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
