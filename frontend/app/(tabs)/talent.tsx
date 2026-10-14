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
const CARD_WIDTH = (width - 48) / 2;

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

// Availability badge colors
const AVAILABILITY_CONFIG = {
  available: { label: 'Available', color: '#4CAF50', bgColor: 'rgba(76, 175, 80, 0.2)' },
  taking_bookings: { label: 'Taking Bookings', color: '#FF9800', bgColor: 'rgba(255, 152, 0, 0.2)' },
  booked: { label: 'Booked', color: '#f44336', bgColor: 'rgba(244, 67, 54, 0.2)' },
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

// Talent Card Component
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
  const firstPhoto = talent.photos?.[0];
  const availConfig = AVAILABILITY_CONFIG[talent.availability as keyof typeof AVAILABILITY_CONFIG] || AVAILABILITY_CONFIG.available;
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      {/* Photo */}
      <View style={styles.cardImageContainer}>
        {firstPhoto ? (
          <Image source={{ uri: firstPhoto }} style={styles.cardImage} />
        ) : (
          <View style={styles.cardImagePlaceholder}>
            <Ionicons name="person" size={40} color="#666" />
          </View>
        )}
        
        {/* Badges overlay */}
        <View style={styles.badgeContainer}>
          {talent.isPinned && (
            <View style={[styles.badge, styles.pinnedBadge]}>
              <Ionicons name="pin" size={10} color="#fff" />
            </View>
          )}
          {talent.isFeatured && (
            <View style={[styles.badge, styles.featuredBadge]}>
              <Ionicons name="star" size={10} color="#fff" />
            </View>
          )}
          {talent.isVerified && (
            <View style={[styles.badge, styles.verifiedBadge]}>
              <Ionicons name="checkmark-circle" size={10} color="#fff" />
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
            size={20} 
            color={talent.isFavorited ? "#FF5500" : "#fff"} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Info */}
      <View style={styles.cardInfo}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>
            {talent.displayName || talent.businessName}
          </Text>
          {talent.isVerified && (
            <Ionicons name="checkmark-circle" size={14} color="#2196F3" style={{ marginLeft: 4 }} />
          )}
        </View>
        
        {talent.businessName && talent.displayName !== talent.businessName && (
          <Text style={styles.cardBusiness} numberOfLines={1}>{talent.businessName}</Text>
        )}
        
        <View style={styles.cardCategory}>
          <Ionicons 
            name={CATEGORIES.find(c => c.id === talent.category)?.icon as any || 'person'} 
            size={12} 
            color="#aaa" 
          />
          <Text style={styles.cardCategoryText}>
            {CATEGORIES.find(c => c.id === talent.category)?.label || 'Talent'}
          </Text>
        </View>
        
        {talent.location && (
          <View style={styles.cardLocation}>
            <Ionicons name="location-outline" size={12} color="#888" />
            <Text style={styles.cardLocationText} numberOfLines={1}>{talent.location}</Text>
          </View>
        )}
        
        {/* Availability */}
        <View style={[styles.availabilityBadge, { backgroundColor: availConfig.bgColor }]}>
          <View style={[styles.availabilityDot, { backgroundColor: availConfig.color }]} />
          <Text style={[styles.availabilityText, { color: availConfig.color }]}>
            {availConfig.label}
          </Text>
        </View>
      </View>

      {/* Admin actions (if admin) */}
      {isAdmin && onAdminAction && (
        <View style={styles.adminActions}>
          <TouchableOpacity 
            style={[styles.adminBtn, talent.isPinned && styles.adminBtnActive]}
            onPress={() => onAdminAction('pin')}
          >
            <Ionicons name="pin" size={14} color={talent.isPinned ? "#FF5500" : "#666"} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.adminBtn, talent.isFeatured && styles.adminBtnActive]}
            onPress={() => onAdminAction('feature')}
          >
            <Ionicons name="star" size={14} color={talent.isFeatured ? "#FFD700" : "#666"} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.adminBtn, talent.isVerified && styles.adminBtnActive]}
            onPress={() => onAdminAction('verify')}
          >
            <Ionicons name="checkmark-circle" size={14} color={talent.isVerified ? "#2196F3" : "#666"} />
          </TouchableOpacity>
        </View>
      )}
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
        fetchTalent(); // Refresh to get updated state
      }
    } catch (error) {
      console.error('Error performing admin action:', error);
    }
  };

  const pinnedAndFeatured = talent.filter(t => t.isPinned || t.isFeatured);
  const regularTalent = talent.filter(t => !t.isPinned && !t.isFeatured);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <LinearGradient
        colors={['#1a1a1a', '#111']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Image 
            source={require('../../assets/images/streetmotion-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>Talent</Text>
        </View>
        
        {/* Search bar */}
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
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); fetchTalent(); }}>
              <Ionicons name="close-circle" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>
      
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
      
      {/* Sort options */}
      <View style={styles.sortContainer}>
        <TouchableOpacity 
          style={[styles.sortButton, sortBy === 'newest' && styles.sortButtonActive]}
          onPress={() => setSortBy('newest')}
        >
          <Text style={[styles.sortText, sortBy === 'newest' && styles.sortTextActive]}>Newest</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.sortButton, sortBy === 'most_viewed' && styles.sortButtonActive]}
          onPress={() => setSortBy('most_viewed')}
        >
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF5500"
              colors={['#FF5500']}
            />
          }
        >
          {/* Featured/Pinned Section */}
          {pinnedAndFeatured.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="star" size={18} color="#FFD700" />
                <Text style={styles.sectionTitle}>Featured Talent</Text>
              </View>
              <View style={styles.grid}>
                {pinnedAndFeatured.map((t) => (
                  <TalentCard
                    key={t.id}
                    talent={t}
                    onPress={() => router.push(`/talent/${t.id}`)}
                    onFavorite={() => handleFavorite(t.id)}
                    isAdmin={isAdmin}
                    onAdminAction={(action) => handleAdminAction(t.id, action)}
                  />
                ))}
              </View>
            </View>
          )}
          
          {/* All Talent */}
          {regularTalent.length > 0 && (
            <View style={styles.section}>
              {pinnedAndFeatured.length > 0 && (
                <View style={styles.sectionHeader}>
                  <Ionicons name="people" size={18} color="#888" />
                  <Text style={styles.sectionTitle}>All Talent</Text>
                </View>
              )}
              <View style={styles.grid}>
                {regularTalent.map((t) => (
                  <TalentCard
                    key={t.id}
                    talent={t}
                    onPress={() => router.push(`/talent/${t.id}`)}
                    onFavorite={() => handleFavorite(t.id)}
                    isAdmin={isAdmin}
                    onAdminAction={(action) => handleAdminAction(t.id, action)}
                  />
                ))}
              </View>
            </View>
          )}
          
          {/* Empty state */}
          {talent.length === 0 && (
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
          
          {/* Admin: Invite Talent button */}
          {isAdmin && (
            <TouchableOpacity 
              style={styles.adminInviteButton}
              onPress={() => router.push('/admin/talent-invites')}
            >
              <Ionicons name="mail" size={20} color="#fff" />
              <Text style={styles.adminInviteText}>Manage Talent Invites</Text>
            </TouchableOpacity>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logo: {
    width: 100,
    height: 36,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
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
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
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
    backgroundColor: '#222',
  },
  categoryTabActive: {
    backgroundColor: 'rgba(255, 85, 0, 0.2)',
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  sortButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 10,
    borderRadius: 14,
    backgroundColor: '#1a1a1a',
  },
  sortButtonActive: {
    backgroundColor: 'rgba(255, 85, 0, 0.15)',
  },
  sortText: {
    color: '#666',
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
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardImageContainer: {
    position: 'relative',
    height: CARD_WIDTH * 1.1,
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
  badgeContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  pinnedBadge: {
    backgroundColor: '#FF5500',
  },
  featuredBadge: {
    backgroundColor: '#FFD700',
  },
  verifiedBadge: {
    backgroundColor: '#2196F3',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  cardBusiness: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  cardCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  cardCategoryText: {
    color: '#aaa',
    fontSize: 11,
    marginLeft: 4,
  },
  cardLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardLocationText: {
    color: '#888',
    fontSize: 11,
    marginLeft: 4,
    flex: 1,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  adminActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  adminBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#222',
  },
  adminBtnActive: {
    backgroundColor: '#333',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
    paddingHorizontal: 40,
  },
  adminInviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5500',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
  },
  adminInviteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});
