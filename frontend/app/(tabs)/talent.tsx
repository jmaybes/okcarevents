import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

const API_URL = Constants.expoConfig?.extra?.apiUrl || 
  process.env.EXPO_PUBLIC_API_URL || 
  process.env.EXPO_PUBLIC_BACKEND_URL || 
  'https://event-hub-okc-1.preview.emergentagent.com';

// Category configuration
const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'grid' },
  { id: 'photographer', label: 'Photo/Video', icon: 'camera' },
  { id: 'model', label: 'Models', icon: 'person' },
  { id: 'dancer', label: 'Entertainment', icon: 'musical-notes' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

// Category labels for display
const CATEGORY_LABELS: { [key: string]: string } = {
  photographer: 'Photographer / Videographer',
  model: 'Model',
  dancer: 'Dancer / Entertainment',
  other: 'Talent',
};

// Availability badge colors
const AVAILABILITY_CONFIG: { [key: string]: { label: string; color: string; bgColor: string } } = {
  available: { label: 'Available', color: '#4CAF50', bgColor: 'rgba(76, 175, 80, 0.15)' },
  taking_bookings: { label: 'Taking Bookings', color: '#FF9800', bgColor: 'rgba(255, 152, 0, 0.15)' },
  booked: { label: 'Booked', color: '#f44336', bgColor: 'rgba(244, 67, 54, 0.15)' },
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
  createdAt: string;
}

// Full-Width Talent Card Component (Event-style)
const TalentCard = ({ 
  talent, 
  onPress, 
  onFavorite,
  isAdmin,
  onAdminAction,
}: { 
  talent: TalentProfile; 
  onPress: () => void;
  onFavorite: () => void;
  isAdmin: boolean;
  onAdminAction?: (action: string) => void;
}) => {
  const mainPhoto = talent.photos?.[0];
  const availConfig = AVAILABILITY_CONFIG[talent.availability] || AVAILABILITY_CONFIG.available;
  const hasSocials = Object.values(talent.socialLinks || {}).some(v => v);
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.95}>
      {/* Main Image */}
      <View style={styles.cardImageContainer}>
        {mainPhoto ? (
          <Image source={{ uri: mainPhoto }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="person" size={60} color="#444" />
          </View>
        )}
        
        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.imageGradient}
        />
        
        {/* Top badges */}
        <View style={styles.topBadges}>
          {talent.isPinned && (
            <View style={[styles.badge, styles.pinnedBadge]}>
              <Ionicons name="pin" size={12} color="#fff" />
              <Text style={styles.badgeText}>Pinned</Text>
            </View>
          )}
          {talent.isFeatured && !talent.isPinned && (
            <View style={[styles.badge, styles.featuredBadge]}>
              <Ionicons name="star" size={12} color="#000" />
              <Text style={[styles.badgeText, { color: '#000' }]}>Featured</Text>
            </View>
          )}
        </View>
        
        {/* Favorite button */}
        <TouchableOpacity 
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            onFavorite();
          }}
        >
          <Ionicons 
            name={talent.isFavorited ? "heart" : "heart-outline"} 
            size={24} 
            color={talent.isFavorited ? "#FF5500" : "#fff"} 
          />
        </TouchableOpacity>
        
        {/* Category badge on image */}
        <View style={styles.categoryBadgeOnImage}>
          <Ionicons 
            name={CATEGORIES.find(c => c.id === talent.category)?.icon as any || 'person'} 
            size={14} 
            color="#fff" 
          />
          <Text style={styles.categoryBadgeText}>
            {CATEGORY_LABELS[talent.category] || 'Talent'}
          </Text>
        </View>
      </View>
      
      {/* Card Content */}
      <View style={styles.cardContent}>
        {/* Name and verification */}
        <View style={styles.nameRow}>
          <Text style={styles.displayName} numberOfLines={1}>
            {talent.displayName}
          </Text>
          {talent.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#2196F3" />
            </View>
          )}
        </View>
        
        {/* Business name if different */}
        {talent.businessName && talent.businessName !== talent.displayName && (
          <Text style={styles.businessName} numberOfLines={1}>{talent.businessName}</Text>
        )}
        
        {/* Location */}
        {talent.location && (
          <View style={styles.infoRow}>
            <Ionicons name="location" size={14} color="#FF5500" />
            <Text style={styles.infoText} numberOfLines={1}>{talent.location}</Text>
            {talent.serviceArea && (
              <Text style={styles.serviceArea}>• {talent.serviceArea}</Text>
            )}
          </View>
        )}
        
        {/* Bio preview */}
        {talent.bio && (
          <Text style={styles.bioPreview} numberOfLines={2}>{talent.bio}</Text>
        )}
        
        {/* Tags */}
        {talent.serviceTags?.length > 0 && (
          <View style={styles.tagsRow}>
            {talent.serviceTags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
            {talent.serviceTags.length > 3 && (
              <Text style={styles.moreTagsText}>+{talent.serviceTags.length - 3}</Text>
            )}
          </View>
        )}
        
        {/* Bottom row: Availability + Social icons */}
        <View style={styles.bottomRow}>
          <View style={[styles.availabilityBadge, { backgroundColor: availConfig.bgColor }]}>
            <View style={[styles.availabilityDot, { backgroundColor: availConfig.color }]} />
            <Text style={[styles.availabilityText, { color: availConfig.color }]}>
              {availConfig.label}
            </Text>
          </View>
          
          {/* Social icons preview */}
          {hasSocials && (
            <View style={styles.socialIconsRow}>
              {talent.socialLinks?.instagram && (
                <Ionicons name="logo-instagram" size={16} color="#E4405F" style={styles.socialIcon} />
              )}
              {talent.socialLinks?.tiktok && (
                <Ionicons name="logo-tiktok" size={16} color="#fff" style={styles.socialIcon} />
              )}
              {talent.socialLinks?.youtube && (
                <Ionicons name="logo-youtube" size={16} color="#FF0000" style={styles.socialIcon} />
              )}
              {talent.socialLinks?.facebook && (
                <Ionicons name="logo-facebook" size={16} color="#1877F2" style={styles.socialIcon} />
              )}
            </View>
          )}
        </View>
        
        {/* Admin controls */}
        {isAdmin && onAdminAction && (
          <View style={styles.adminControls}>
            <TouchableOpacity 
              style={[styles.adminBtn, talent.isPinned && styles.adminBtnActive]}
              onPress={() => onAdminAction('pin')}
            >
              <Ionicons name="pin" size={16} color={talent.isPinned ? "#FF5500" : "#888"} />
              <Text style={[styles.adminBtnText, talent.isPinned && styles.adminBtnTextActive]}>
                {talent.isPinned ? 'Unpin' : 'Pin'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.adminBtn, talent.isFeatured && styles.adminBtnActive]}
              onPress={() => onAdminAction('feature')}
            >
              <Ionicons name="star" size={16} color={talent.isFeatured ? "#FFD700" : "#888"} />
              <Text style={[styles.adminBtnText, talent.isFeatured && { color: '#FFD700' }]}>
                {talent.isFeatured ? 'Unfeature' : 'Feature'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.adminBtn, talent.isVerified && styles.adminBtnActive]}
              onPress={() => onAdminAction('verify')}
            >
              <Ionicons name="checkmark-circle" size={16} color={talent.isVerified ? "#2196F3" : "#888"} />
              <Text style={[styles.adminBtnText, talent.isVerified && { color: '#2196F3' }]}>
                {talent.isVerified ? 'Unverify' : 'Verify'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function TalentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [talent, setTalent] = useState<TalentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showSearch, setShowSearch] = useState(false);
  
  const isAdmin = user?.isAdmin || false;

  const fetchTalent = useCallback(async () => {
    try {
      let url = `${API_URL}/api/talent?sort_by=${sortBy}`;
      
      if (selectedCategory !== 'all') {
        url += `&category=${selectedCategory}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      if (user?.id) {
        url += `&user_id=${user.id}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.talent) {
        setTalent(data.talent);
      }
    } catch (error) {
      console.error('Error fetching talent:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, searchQuery, sortBy, user?.id]);

  useEffect(() => {
    fetchTalent();
  }, [fetchTalent]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTalent();
  };

  const handleFavorite = async (talentId: string) => {
    if (!user?.id) {
      router.push('/auth/login');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/talent/${talentId}/favorite?user_id=${user.id}`, {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setTalent(prev => prev.map(t => 
          t.id === talentId ? { ...t, isFavorited: data.favorited } : t
        ));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleAdminAction = async (talentId: string, action: string) => {
    if (!isAdmin || !user?.id) return;
    
    try {
      const response = await fetch(`${API_URL}/api/admin/talent/${talentId}/${action}?admin_id=${user.id}`, {
        method: 'PUT',
      });
      
      if (response.ok) {
        fetchTalent();
      }
    } catch (error) {
      console.error('Error performing admin action:', error);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Image 
              source={require('../../assets/images/streetmotion-logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.headerTitle}>Talent</Text>
          </View>
          
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerBtn}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Ionicons name={showSearch ? "close" : "search"} size={22} color="#fff" />
            </TouchableOpacity>
            
            {isAdmin && (
              <TouchableOpacity 
                style={styles.headerBtn}
                onPress={() => router.push('/admin/talent-invites')}
              >
                <Ionicons name="mail" size={22} color="#FF5500" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Search bar */}
        {showSearch && (
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color="#888" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search talent..."
              placeholderTextColor="#666"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={fetchTalent}
              returnKeyType="search"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setSearchQuery(''); fetchTalent(); }}>
                <Ionicons name="close-circle" size={18} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      
      {/* Category tabs */}
      <View style={styles.categoryContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryTab,
                selectedCategory === cat.id && styles.categoryTabActive
              ]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Ionicons 
                name={cat.icon as any} 
                size={16} 
                color={selectedCategory === cat.id ? '#FF5500' : '#888'} 
              />
              <Text style={[
                styles.categoryText,
                selectedCategory === cat.id && styles.categoryTextActive
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Sort buttons */}
      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <TouchableOpacity 
          style={[styles.sortButton, sortBy === 'newest' && styles.sortButtonActive]}
          onPress={() => setSortBy('newest')}
        >
          <Ionicons name="time-outline" size={14} color={sortBy === 'newest' ? '#FF5500' : '#888'} />
          <Text style={[styles.sortText, sortBy === 'newest' && styles.sortTextActive]}>Newest</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.sortButton, sortBy === 'most_viewed' && styles.sortButtonActive]}
          onPress={() => setSortBy('most_viewed')}
        >
          <Ionicons name="eye-outline" size={14} color={sortBy === 'most_viewed' ? '#FF5500' : '#888'} />
          <Text style={[styles.sortText, sortBy === 'most_viewed' && styles.sortTextActive]}>Most Viewed</Text>
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5500" />
          <Text style={styles.loadingText}>Loading talent...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF5500"
              colors={['#FF5500']}
            />
          }
        >
          {/* Talent Feed */}
          {talent.length > 0 ? (
            talent.map((t) => (
              <React.Fragment key={t.id}>
                <TalentCard
                  talent={t}
                  onPress={() => router.push(`/talent/${t.id}`)}
                  onFavorite={() => handleFavorite(t.id)}
                  isAdmin={isAdmin}
                  onAdminAction={(action) => handleAdminAction(t.id, action)}
                />
                <View style={styles.cardSeparator} />
              </React.Fragment>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#444" />
              <Text style={styles.emptyTitle}>No Talent Found</Text>
              <Text style={styles.emptyText}>
                {searchQuery 
                  ? `No results for "${searchQuery}"`
                  : 'Talent profiles will appear here when available.'
                }
              </Text>
            </View>
          )}
          
          {/* Bottom padding */}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    backgroundColor: '#111',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 90,
    height: 32,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginTop: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  categoryContainer: {
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  categoryScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
  },
  categoryTabActive: {
    backgroundColor: 'rgba(255, 85, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#FF5500',
  },
  categoryText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  categoryTextActive: {
    color: '#FF5500',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    gap: 8,
  },
  sortLabel: {
    color: '#666',
    fontSize: 13,
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
    gap: 4,
  },
  sortButtonActive: {
    backgroundColor: 'rgba(255, 85, 0, 0.15)',
  },
  sortText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  sortTextActive: {
    color: '#FF5500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 12,
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  
  // Full-width Card Styles
  card: {
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
  },
  cardSeparator: {
    height: 8,
    backgroundColor: '#000',
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  topBadges: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  pinnedBadge: {
    backgroundColor: '#FF5500',
  },
  featuredBadge: {
    backgroundColor: '#FFD700',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadgeOnImage: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
  },
  categoryBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  verifiedBadge: {
    marginLeft: 6,
  },
  businessName: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  infoText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 6,
  },
  serviceArea: {
    color: '#888',
    fontSize: 13,
    marginLeft: 6,
  },
  bioPreview: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: 'rgba(255, 85, 0, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: '#FF5500',
    fontSize: 12,
    fontWeight: '500',
  },
  moreTagsText: {
    color: '#888',
    fontSize: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  socialIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  socialIcon: {
    marginLeft: 10,
  },
  adminControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#222',
    gap: 4,
  },
  adminBtnActive: {
    backgroundColor: '#333',
  },
  adminBtnText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  adminBtnTextActive: {
    color: '#FF5500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
