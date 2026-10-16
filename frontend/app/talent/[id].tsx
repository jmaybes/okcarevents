import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Linking,
  Share,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useAuth } from '../../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

const API_URL = Constants.expoConfig?.extra?.apiUrl || 
  process.env.EXPO_PUBLIC_API_URL || 
  process.env.EXPO_PUBLIC_BACKEND_URL || 
  'https://event-hub-okc-1.preview.emergentagent.com';

// Category labels
const CATEGORY_LABELS: { [key: string]: string } = {
  photographer: 'Photographer / Videographer',
  model: 'Model',
  dancer: 'Dancer / Entertainment',
  other: 'Talent',
};

// Availability config
const AVAILABILITY_CONFIG: { [key: string]: { label: string; color: string; bgColor: string } } = {
  available: { label: 'Available for Booking', color: '#4CAF50', bgColor: 'rgba(76, 175, 80, 0.15)' },
  taking_bookings: { label: 'Taking Bookings', color: '#FF9800', bgColor: 'rgba(255, 152, 0, 0.15)' },
  booked: { label: 'Currently Booked', color: '#f44336', bgColor: 'rgba(244, 67, 54, 0.15)' },
};

// Social media icons
const SOCIAL_ICONS: { [key: string]: { icon: string; color: string } } = {
  instagram: { icon: 'logo-instagram', color: '#E4405F' },
  tiktok: { icon: 'logo-tiktok', color: '#000' },
  youtube: { icon: 'logo-youtube', color: '#FF0000' },
  facebook: { icon: 'logo-facebook', color: '#1877F2' },
};

interface TalentProfile {
  id: string;
  userId: string;
  category: string;
  businessName: string;
  displayName: string;
  bio: string;
  serviceTags: string[];
  location: string;
  serviceArea: string;
  availability: string;
  photos: string[];
  videoUrl: string;
  contactEmail: string;
  contactPhone: string;
  externalLink: string;
  socialLinks: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    facebook?: string;
  };
  isVerified: boolean;
  isFeatured: boolean;
  isPinned: boolean;
  isActive: boolean;
  isFavorited?: boolean;
  viewCount?: number;
  createdAt: string;
}

export default function TalentDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [talent, setTalent] = useState<TalentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  
  const isOwner = user?.id && talent?.userId === user.id;

  useEffect(() => {
    fetchTalent();
  }, [id]);

  const fetchTalent = async () => {
    try {
      let url = `${API_URL}/api/talent/${id}`;
      if (user?.id) {
        url += `?user_id=${user.id}&is_owner=${user?.talentProfileId === id}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        setTalent(data);
      }
    } catch (error) {
      console.error('Error fetching talent:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = async () => {
    if (!user?.id || !talent) {
      router.push('/auth/login');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/talent/${talent.id}/favorite?user_id=${user.id}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setTalent(prev => prev ? { ...prev, isFavorited: data.favorited } : null);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleShare = async () => {
    if (!talent) return;
    
    try {
      await Share.share({
        message: `Check out ${talent.displayName} on StreetMotion!\n\n${talent.bio?.slice(0, 100)}...`,
        title: talent.displayName,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleContact = (type: 'email' | 'phone') => {
    if (!talent) return;
    
    if (type === 'email' && talent.contactEmail) {
      Linking.openURL(`mailto:${talent.contactEmail}`);
    } else if (type === 'phone' && talent.contactPhone) {
      Linking.openURL(`tel:${talent.contactPhone}`);
    }
  };

  const handleSocialLink = (platform: string, handle: string) => {
    if (!handle) return;
    
    let url = handle;
    if (!handle.startsWith('http')) {
      const prefixes: { [key: string]: string } = {
        instagram: 'https://instagram.com/',
        tiktok: 'https://tiktok.com/@',
        youtube: 'https://youtube.com/',
        facebook: 'https://facebook.com/',
      };
      url = prefixes[platform] + handle.replace('@', '');
    }
    
    Linking.openURL(url);
  };

  const handleExternalLink = () => {
    if (talent?.externalLink) {
      let url = talent.externalLink;
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }
      Linking.openURL(url);
    }
  };

  const handleMessage = () => {
    if (!user?.id || !talent) {
      router.push('/auth/login');
      return;
    }
    router.push(`/messages/${talent.userId}`);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#FF5500" />
      </View>
    );
  }

  if (!talent) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Ionicons name="alert-circle-outline" size={64} color="#666" />
        <Text style={styles.errorText}>Talent profile not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const availConfig = AVAILABILITY_CONFIG[talent.availability] || AVAILABILITY_CONFIG.available;
  const mainPhoto = talent.photos?.[selectedPhotoIndex] || talent.photos?.[0];

  return (
    <View style={styles.container}>
      {/* Header with main photo */}
      <View style={styles.headerContainer}>
        <TouchableOpacity 
          style={styles.mainPhotoContainer}
          onPress={() => talent.photos?.length > 0 && setShowGallery(true)}
          activeOpacity={0.9}
        >
          {mainPhoto ? (
            <Image source={{ uri: mainPhoto }} style={styles.mainPhoto} />
          ) : (
            <View style={styles.noPhotoContainer}>
              <Ionicons name="person" size={80} color="#444" />
            </View>
          )}
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.photoGradient}
          />
          
          {/* Photo count badge */}
          {talent.photos?.length > 1 && (
            <View style={styles.photoCountBadge}>
              <Ionicons name="images" size={14} color="#fff" />
              <Text style={styles.photoCountText}>{talent.photos.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        
        {/* Navigation buttons */}
        <TouchableOpacity 
          style={[styles.navButton, { top: insets.top + 10, left: 16 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={[styles.headerActions, { top: insets.top + 10 }]}>
          <TouchableOpacity style={styles.navButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={handleFavorite}>
            <Ionicons 
              name={talent.isFavorited ? "heart" : "heart-outline"} 
              size={22} 
              color={talent.isFavorited ? "#FF5500" : "#fff"} 
            />
          </TouchableOpacity>
        </View>
        
        {/* Photo thumbnails */}
        {talent.photos?.length > 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.thumbnailScroll}
            contentContainerStyle={styles.thumbnailContainer}
          >
            {talent.photos.map((photo, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.thumbnail,
                  selectedPhotoIndex === index && styles.thumbnailActive
                ]}
                onPress={() => setSelectedPhotoIndex(index)}
              >
                <Image source={{ uri: photo }} style={styles.thumbnailImage} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
      
      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Name and badges */}
        <View style={styles.titleSection}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{talent.displayName}</Text>
            {talent.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#2196F3" />
              </View>
            )}
          </View>
          
          {talent.businessName && talent.businessName !== talent.displayName ? (
            <Text style={styles.businessName}>{talent.businessName}</Text>
          ) : null}
          
          <View style={styles.categoryRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>
                {CATEGORY_LABELS[talent.category] || 'Talent'}
              </Text>
            </View>
            
            {(talent.isFeatured || talent.isPinned) && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.featuredText}>Featured</Text>
              </View>
            )}
          </View>
          
          {/* Availability */}
          <View style={[styles.availabilityBadge, { backgroundColor: availConfig.bgColor }]}>
            <View style={[styles.availabilityDot, { backgroundColor: availConfig.color }]} />
            <Text style={[styles.availabilityText, { color: availConfig.color }]}>
              {availConfig.label}
            </Text>
          </View>
        </View>
        
        {/* Location */}
        {(talent.location || talent.serviceArea) ? (
          <View style={styles.section}>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={18} color="#FF5500" />
              <View style={styles.locationInfo}>
                {talent.location ? <Text style={styles.locationText}>{talent.location}</Text> : null}
                {talent.serviceArea ? (
                  <Text style={styles.serviceAreaText}>Service Area: {talent.serviceArea}</Text>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}
        
        {/* Bio */}
        {talent.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{talent.bio}</Text>
          </View>
        ) : null}
        
        {/* Service tags */}
        {talent.serviceTags?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>
            <View style={styles.tagsContainer}>
              {talent.serviceTags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* Video */}
        {talent.videoUrl ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Video Showcase</Text>
            <TouchableOpacity 
              style={styles.videoButton}
              onPress={() => Linking.openURL(talent.videoUrl)}
            >
              <Ionicons name="play-circle" size={24} color="#FF5500" />
              <Text style={styles.videoButtonText}>Watch Video Reel</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        
        {/* Social links */}
        {Object.entries(talent.socialLinks || {}).some(([_, v]) => v) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social Media</Text>
            <View style={styles.socialContainer}>
              {Object.entries(talent.socialLinks).map(([platform, handle]) => {
                if (!handle) return null;
                const config = SOCIAL_ICONS[platform];
                return (
                  <TouchableOpacity
                    key={platform}
                    style={styles.socialButton}
                    onPress={() => handleSocialLink(platform, handle)}
                  >
                    <Ionicons name={config?.icon as any || 'link'} size={24} color={config?.color || '#888'} />
                    <Text style={styles.socialText}>@{handle.replace('@', '')}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
        
        {/* External link */}
        {talent.externalLink ? (
          <View style={styles.section}>
            <TouchableOpacity style={styles.externalLinkButton} onPress={handleExternalLink}>
              <Ionicons name="globe-outline" size={20} color="#2196F3" />
              <Text style={styles.externalLinkText}>Visit Website</Text>
              <Ionicons name="open-outline" size={16} color="#2196F3" />
            </TouchableOpacity>
          </View>
        ) : null}
        
        {/* View count for owner */}
        {isOwner && talent.viewCount !== undefined && (
          <View style={styles.statsSection}>
            <Ionicons name="eye-outline" size={20} color="#888" />
            <Text style={styles.statsText}>{talent.viewCount} profile views</Text>
          </View>
        )}
        
        {/* Edit button for owner */}
        {isOwner && (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => router.push('/talent/setup')}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.editButtonText}>Edit My Profile</Text>
          </TouchableOpacity>
        )}
        
        {/* Bottom padding */}
        <View style={{ height: 120 }} />
      </ScrollView>
      
      {/* Contact bar */}
      {!isOwner && (
        <View style={[styles.contactBar, { paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity 
            style={styles.messageButton}
            onPress={handleMessage}
          >
            <Ionicons name="chatbubble" size={20} color="#fff" />
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity>
          
          {talent.contactEmail ? (
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => handleContact('email')}
            >
              <Ionicons name="mail" size={22} color="#FF5500" />
            </TouchableOpacity>
          ) : null}
          
          {talent.contactPhone ? (
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => handleContact('phone')}
            >
              <Ionicons name="call" size={22} color="#4CAF50" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      
      {/* Gallery Modal */}
      <Modal visible={showGallery} transparent animationType="fade">
        <View style={styles.galleryModal}>
          <TouchableOpacity 
            style={[styles.galleryCloseButton, { top: insets.top + 10 }]}
            onPress={() => setShowGallery(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: selectedPhotoIndex * width, y: 0 }}
          >
            {talent.photos?.map((photo, index) => (
              <View key={index} style={styles.galleryImageContainer}>
                <Image 
                  source={{ uri: photo }} 
                  style={styles.galleryImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
          
          <Text style={styles.galleryCounter}>
            {selectedPhotoIndex + 1} / {talent.photos?.length || 0}
          </Text>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#FF5500',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    position: 'relative',
  },
  mainPhotoContainer: {
    width: '100%',
    height: height * 0.45,
    backgroundColor: '#111',
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
  },
  noPhotoContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  photoCountBadge: {
    position: 'absolute',
    bottom: 60,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  photoCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  navButton: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    gap: 10,
  },
  thumbnailScroll: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
  },
  thumbnailContainer: {
    paddingHorizontal: 16,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: '#FF5500',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
  },
  titleSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  verifiedBadge: {
    marginLeft: 8,
  },
  businessName: {
    fontSize: 16,
    color: '#888',
    marginTop: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  categoryBadge: {
    backgroundColor: '#222',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  featuredText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  availabilityText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationInfo: {
    marginLeft: 10,
    flex: 1,
  },
  locationText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  serviceAreaText: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
  bioText: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(255, 85, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 85, 0, 0.3)',
  },
  tagText: {
    color: '#FF5500',
    fontSize: 13,
    fontWeight: '500',
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  videoButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  socialContainer: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 10,
  },
  socialText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 12,
  },
  externalLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  externalLinkText: {
    color: '#2196F3',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
  statsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#111',
  },
  statsText: {
    color: '#888',
    fontSize: 14,
    marginLeft: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5500',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  contactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingTop: 12,
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
    gap: 10,
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5500',
    paddingVertical: 14,
    borderRadius: 10,
  },
  messageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  contactButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  galleryModal: {
    flex: 1,
    backgroundColor: '#000',
  },
  galleryCloseButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryImageContainer: {
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryImage: {
    width: width,
    height: height * 0.8,
  },
  galleryCounter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});
