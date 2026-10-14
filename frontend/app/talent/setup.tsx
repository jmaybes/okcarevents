import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

const API_URL = Constants.expoConfig?.extra?.apiUrl || 
  process.env.EXPO_PUBLIC_API_URL || 
  process.env.EXPO_PUBLIC_BACKEND_URL || 
  'https://event-hub-okc-1.preview.emergentagent.com';

const MAX_PHOTOS = 6;

const CATEGORIES = [
  { id: 'photographer', label: 'Photographer / Videographer', icon: 'camera' },
  { id: 'model', label: 'Model', icon: 'person' },
  { id: 'dancer', label: 'Dancer / Entertainment', icon: 'musical-notes' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

const AVAILABILITY_OPTIONS = [
  { id: 'available', label: 'Available for Booking', color: '#4CAF50' },
  { id: 'taking_bookings', label: 'Taking Bookings', color: '#FF9800' },
  { id: 'booked', label: 'Currently Booked', color: '#f44336' },
];

const PRESET_COLORS = [
  '#FF5500', '#FF0000', '#FF6B6B', '#E91E63', '#9C27B0', 
  '#673AB7', '#3F51B5', '#2196F3', '#00BCD4', '#009688',
  '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107',
  '#FF9800', '#795548', '#9E9E9E', '#607D8B', '#000000',
];

const PHOTO_STYLES = [
  { id: 'carousel', label: 'Carousel', icon: 'images' },
  { id: 'grid', label: 'Grid', icon: 'grid' },
  { id: 'stacked', label: 'Stacked', icon: 'layers' },
];

const HEADER_STYLES = [
  { id: 'banner', label: 'Full Banner' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'centered', label: 'Centered' },
];

const TABS = [
  { id: 'basic', label: 'Basic Info', icon: 'person' },
  { id: 'media', label: 'Media', icon: 'images' },
  { id: 'theme', label: 'Theme', icon: 'color-palette' },
  { id: 'services', label: 'Services', icon: 'briefcase' },
  { id: 'contact', label: 'Contact', icon: 'call' },
  { id: 'extras', label: 'Extras', icon: 'sparkles' },
];

export default function TalentSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [profile, setProfile] = useState<any>(null);
  
  // ===== BASIC INFO =====
  const [category, setCategory] = useState('other');
  const [businessName, setBusinessName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [serviceTags, setServiceTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [location, setLocation] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [availability, setAvailability] = useState('available');
  const [yearsExperience, setYearsExperience] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [newLanguage, setNewLanguage] = useState('');
  
  // ===== MEDIA =====
  const [photos, setPhotos] = useState<string[]>([]);
  const [bannerImage, setBannerImage] = useState('');
  const [logoImage, setLogoImage] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  
  // ===== THEME =====
  const [primaryColor, setPrimaryColor] = useState('#FF5500');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [cardColor, setCardColor] = useState('#1a1a1a');
  const [accentColor, setAccentColor] = useState('#FF5500');
  const [useGradient, setUseGradient] = useState(false);
  const [gradientStart, setGradientStart] = useState('#1a1a1a');
  const [gradientEnd, setGradientEnd] = useState('#000000');
  const [photoStyle, setPhotoStyle] = useState('carousel');
  const [headerStyle, setHeaderStyle] = useState('banner');
  const [showBioFirst, setShowBioFirst] = useState(false);
  
  // ===== SERVICES =====
  const [services, setServices] = useState<any[]>([]);
  const [showPricing, setShowPricing] = useState(false);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [priceUnit, setPriceUnit] = useState('hour');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [newEquipment, setNewEquipment] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [newSpecialty, setNewSpecialty] = useState('');
  
  // ===== CONTACT =====
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [bookingLink, setBookingLink] = useState('');
  const [bookingButtonText, setBookingButtonText] = useState('Book Now');
  const [showEmail, setShowEmail] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [preferredMethod, setPreferredMethod] = useState('message');
  const [responseTime, setResponseTime] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');
  const [facebook, setFacebook] = useState('');
  
  // ===== EXTRAS =====
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [portfolioLinks, setPortfolioLinks] = useState<any[]>([]);
  const [ctaEnabled, setCtaEnabled] = useState(false);
  const [ctaText, setCtaText] = useState('Get in Touch');
  const [ctaLink, setCtaLink] = useState('');
  
  // ===== STATUS =====
  const [isActive, setIsActive] = useState(false);
  const [profileCompletion, setProfileCompletion] = useState(0);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/talent/my-profile?user_id=${user.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        populateForm(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data: any) => {
    // Basic
    setCategory(data.category || 'other');
    setBusinessName(data.businessName || '');
    setDisplayName(data.displayName || user?.name || '');
    setHeadline(data.headline || '');
    setBio(data.bio || '');
    setServiceTags(data.serviceTags || []);
    setLocation(data.location || '');
    setServiceArea(data.serviceArea || '');
    setAvailability(data.availability || 'available');
    setYearsExperience(data.yearsExperience || '');
    setLanguages(data.languages || []);
    
    // Media
    setPhotos(data.photos || []);
    setBannerImage(data.bannerImage || '');
    setLogoImage(data.logoImage || '');
    setVideoUrl(data.videoUrl || '');
    
    // Theme
    const theme = data.theme || {};
    setPrimaryColor(theme.primaryColor || '#FF5500');
    setBackgroundColor(theme.backgroundColor || '#000000');
    setCardColor(theme.cardColor || '#1a1a1a');
    setAccentColor(theme.accentColor || '#FF5500');
    setUseGradient(theme.useGradient || false);
    setGradientStart(theme.gradientStart || '#1a1a1a');
    setGradientEnd(theme.gradientEnd || '#000000');
    
    const layout = data.layout || {};
    setPhotoStyle(layout.photoStyle || 'carousel');
    setHeaderStyle(layout.headerStyle || 'banner');
    setShowBioFirst(layout.showBioFirst || false);
    
    // Services
    setServices(data.services || []);
    setShowPricing(data.showPricing || false);
    const priceRange = data.priceRange || {};
    setPriceMin(priceRange.min || '');
    setPriceMax(priceRange.max || '');
    setPriceUnit(priceRange.unit || 'hour');
    setEquipment(data.equipment || []);
    setSpecialties(data.specialties || []);
    
    // Contact
    setContactEmail(data.contactEmail || user?.email || '');
    setContactPhone(data.contactPhone || '');
    setExternalLink(data.externalLink || '');
    setBookingLink(data.bookingLink || '');
    setBookingButtonText(data.bookingButtonText || 'Book Now');
    const contactPrefs = data.contactPreferences || {};
    setShowEmail(contactPrefs.showEmail !== false);
    setShowPhone(contactPrefs.showPhone !== false);
    setPreferredMethod(contactPrefs.preferredMethod || 'message');
    setResponseTime(contactPrefs.responseTime || '');
    const socials = data.socialLinks || {};
    setInstagram(socials.instagram || '');
    setTiktok(socials.tiktok || '');
    setYoutube(socials.youtube || '');
    setFacebook(socials.facebook || '');
    
    // Extras
    setTestimonials(data.testimonials || []);
    setAchievements(data.achievements || []);
    setFaqs(data.faqs || []);
    setPortfolioLinks(data.portfolioLinks || []);
    const cta = data.ctaButton || {};
    setCtaEnabled(cta.enabled || false);
    setCtaText(cta.text || 'Get in Touch');
    setCtaLink(cta.link || '');
    
    // Status
    setIsActive(data.isActive || false);
    setProfileCompletion(data.profileCompletion || 0);
  };

  const handleSave = async () => {
    if (!profile?.id || !user?.id) return;
    
    if (!displayName.trim()) {
      Alert.alert('Required', 'Display name is required');
      return;
    }
    if (!bio.trim()) {
      Alert.alert('Required', 'Please add a bio about yourself');
      return;
    }
    if (photos.length === 0) {
      Alert.alert('Required', 'Please add at least one photo');
      return;
    }
    
    setSaving(true);
    
    try {
      const profileData = {
        // Basic
        category,
        businessName: businessName.trim(),
        displayName: displayName.trim(),
        headline: headline.trim(),
        bio: bio.trim(),
        serviceTags,
        location: location.trim(),
        serviceArea: serviceArea.trim(),
        availability,
        yearsExperience: yearsExperience.trim(),
        languages,
        
        // Media
        photos,
        bannerImage,
        logoImage,
        videoUrl: videoUrl.trim(),
        
        // Theme
        theme: {
          primaryColor,
          backgroundColor,
          cardColor,
          accentColor,
          useGradient,
          gradientStart,
          gradientEnd,
        },
        layout: {
          photoStyle,
          headerStyle,
          showBioFirst,
        },
        
        // Services
        services,
        showPricing,
        priceRange: {
          min: priceMin,
          max: priceMax,
          unit: priceUnit,
          currency: 'USD',
        },
        equipment,
        specialties,
        
        // Contact
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        externalLink: externalLink.trim(),
        bookingLink: bookingLink.trim(),
        bookingButtonText: bookingButtonText.trim(),
        contactPreferences: {
          showEmail,
          showPhone,
          preferredMethod,
          responseTime: responseTime.trim(),
        },
        socialLinks: {
          instagram: instagram.trim(),
          tiktok: tiktok.trim(),
          youtube: youtube.trim(),
          facebook: facebook.trim(),
        },
        
        // Extras
        testimonials,
        achievements,
        faqs,
        portfolioLinks,
        ctaButton: {
          enabled: ctaEnabled,
          text: ctaText.trim(),
          link: ctaLink.trim(),
          style: 'primary',
        },
        
        isActive,
      };
      
      const response = await fetch(`${API_URL}/api/talent/${profile.id}?user_id=${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_data: profileData }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setProfileCompletion(data.profile?.profileCompletion || 0);
        Alert.alert('Success', data.message || 'Profile saved!');
      } else {
        Alert.alert('Error', data.detail || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async (type: 'photo' | 'banner' | 'logo') => {
    if (type === 'photo' && photos.length >= MAX_PHOTOS) {
      Alert.alert('Limit Reached', `Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos');
      return;
    }
    
    const aspectRatio = type === 'banner' ? [16, 9] : type === 'logo' ? [1, 1] : [3, 4];
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: aspectRatio as [number, number],
      quality: 0.7,
      base64: true,
    });
    
    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      
      if (type === 'photo') {
        setPhotos([...photos, base64Image]);
      } else if (type === 'banner') {
        setBannerImage(base64Image);
      } else {
        setLogoImage(base64Image);
      }
    }
  };

  const addItem = (type: string, value: string, setter: Function, list: string[]) => {
    const trimmed = value.trim();
    if (trimmed && !list.includes(trimmed)) {
      setter([...list, trimmed]);
    }
  };

  const removeItem = (index: number, setter: Function, list: any[]) => {
    setter(list.filter((_, i) => i !== index));
  };

  const addService = () => {
    setServices([...services, { name: '', description: '', price: '', duration: '' }]);
  };

  const updateService = (index: number, field: string, value: string) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  const addTestimonial = () => {
    setTestimonials([...testimonials, { name: '', text: '', rating: 5 }]);
  };

  const updateTestimonial = (index: number, field: string, value: any) => {
    const updated = [...testimonials];
    updated[index] = { ...updated[index], [field]: value };
    setTestimonials(updated);
  };

  const addFaq = () => {
    setFaqs([...faqs, { question: '', answer: '' }]);
  };

  const updateFaq = (index: number, field: string, value: string) => {
    const updated = [...faqs];
    updated[index] = { ...updated[index], [field]: value };
    setFaqs(updated);
  };

  const addAchievement = () => {
    setAchievements([...achievements, { title: '', year: '', description: '' }]);
  };

  const updateAchievement = (index: number, field: string, value: string) => {
    const updated = [...achievements];
    updated[index] = { ...updated[index], [field]: value };
    setAchievements(updated);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF5500" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Ionicons name="lock-closed" size={64} color="#666" />
        <Text style={styles.noAccessTitle}>No Talent Profile</Text>
        <Text style={styles.noAccessText}>
          You need a talent invite to create a profile.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderBasicTab = () => (
    <View style={styles.tabContent}>
      {/* Category */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Category *</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryOption, category === cat.id && styles.categoryOptionActive]}
              onPress={() => setCategory(cat.id)}
            >
              <Ionicons name={cat.icon as any} size={24} color={category === cat.id ? primaryColor : '#888'} />
              <Text style={[styles.categoryLabel, category === cat.id && { color: primaryColor }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Names */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Identity</Text>
        
        <Text style={styles.inputLabel}>Display Name *</Text>
        <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Your name or stage name" placeholderTextColor="#666" />
        
        <Text style={styles.inputLabel}>Business Name</Text>
        <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} placeholder="Your business or brand name" placeholderTextColor="#666" />
        
        <Text style={styles.inputLabel}>Headline / Tagline</Text>
        <TextInput style={styles.input} value={headline} onChangeText={setHeadline} placeholder="e.g., Award-winning Automotive Photographer" placeholderTextColor="#666" />
        
        <Text style={styles.inputLabel}>Bio *</Text>
        <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} placeholder="Tell people about yourself..." placeholderTextColor="#666" multiline numberOfLines={4} textAlignVertical="top" />
        
        <Text style={styles.inputLabel}>Years of Experience</Text>
        <TextInput style={styles.input} value={yearsExperience} onChangeText={setYearsExperience} placeholder="e.g., 5+ years" placeholderTextColor="#666" />
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        
        <Text style={styles.inputLabel}>City / Area</Text>
        <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g., Oklahoma City, OK" placeholderTextColor="#666" />
        
        <Text style={styles.inputLabel}>Service Area</Text>
        <TextInput style={styles.input} value={serviceArea} onChangeText={setServiceArea} placeholder="e.g., OKC Metro, Statewide" placeholderTextColor="#666" />
      </View>

      {/* Availability */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Availability</Text>
        {AVAILABILITY_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.availabilityOption, availability === opt.id && { borderColor: opt.color, backgroundColor: `${opt.color}15` }]}
            onPress={() => setAvailability(opt.id)}
          >
            <View style={[styles.availabilityDot, { backgroundColor: opt.color }]} />
            <Text style={[styles.availabilityLabel, availability === opt.id && { color: opt.color }]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tags */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Tags</Text>
        <View style={styles.tagInputRow}>
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={newTag} onChangeText={setNewTag} placeholder="e.g., Event Photography" placeholderTextColor="#666" onSubmitEditing={() => { addItem('tag', newTag, setServiceTags, serviceTags); setNewTag(''); }} />
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: primaryColor }]} onPress={() => { addItem('tag', newTag, setServiceTags, serviceTags); setNewTag(''); }}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.tagsContainer}>
          {serviceTags.map((tag, i) => (
            <TouchableOpacity key={i} style={[styles.tag, { borderColor: primaryColor + '50', backgroundColor: primaryColor + '20' }]} onPress={() => removeItem(i, setServiceTags, serviceTags)}>
              <Text style={[styles.tagText, { color: primaryColor }]}>{tag}</Text>
              <Ionicons name="close" size={14} color={primaryColor} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Languages */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Languages Spoken</Text>
        <View style={styles.tagInputRow}>
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={newLanguage} onChangeText={setNewLanguage} placeholder="e.g., English, Spanish" placeholderTextColor="#666" onSubmitEditing={() => { addItem('lang', newLanguage, setLanguages, languages); setNewLanguage(''); }} />
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: primaryColor }]} onPress={() => { addItem('lang', newLanguage, setLanguages, languages); setNewLanguage(''); }}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.tagsContainer}>
          {languages.map((lang, i) => (
            <TouchableOpacity key={i} style={styles.langTag} onPress={() => removeItem(i, setLanguages, languages)}>
              <Text style={styles.langTagText}>{lang}</Text>
              <Ionicons name="close" size={14} color="#888" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderMediaTab = () => (
    <View style={styles.tabContent}>
      {/* Photos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Photos * ({photos.length}/{MAX_PHOTOS})</Text>
        <Text style={styles.sectionHint}>First photo is your main profile image</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
          {photos.map((photo, index) => (
            <View key={index} style={styles.photoContainer}>
              <Image source={{ uri: photo }} style={styles.photo} />
              <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removeItem(index, setPhotos, photos)}>
                <Ionicons name="close-circle" size={24} color="#f44336" />
              </TouchableOpacity>
              {index === 0 && <View style={[styles.mainPhotoBadge, { backgroundColor: primaryColor }]}><Text style={styles.mainPhotoText}>Main</Text></View>}
            </View>
          ))}
          {photos.length < MAX_PHOTOS && (
            <TouchableOpacity style={styles.addPhotoBtn} onPress={() => pickImage('photo')}>
              <Ionicons name="add" size={32} color="#888" />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Banner Image */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Banner Image</Text>
        <Text style={styles.sectionHint}>Wide image for profile header (16:9)</Text>
        
        {bannerImage ? (
          <View style={styles.bannerContainer}>
            <Image source={{ uri: bannerImage }} style={styles.bannerImage} />
            <TouchableOpacity style={styles.removeBannerBtn} onPress={() => setBannerImage('')}>
              <Ionicons name="trash" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addBannerBtn} onPress={() => pickImage('banner')}>
            <Ionicons name="image" size={32} color="#888" />
            <Text style={styles.addBannerText}>Add Banner Image</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Logo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Logo / Brand Mark</Text>
        <Text style={styles.sectionHint}>Square image for branding (1:1)</Text>
        
        <View style={styles.logoRow}>
          {logoImage ? (
            <View style={styles.logoContainer}>
              <Image source={{ uri: logoImage }} style={styles.logoImage} />
              <TouchableOpacity style={styles.removeLogoBtn} onPress={() => setLogoImage('')}>
                <Ionicons name="close-circle" size={20} color="#f44336" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addLogoBtn} onPress={() => pickImage('logo')}>
              <Ionicons name="add" size={24} color="#888" />
            </TouchableOpacity>
          )}
          <Text style={styles.logoHint}>Optional brand logo</Text>
        </View>
      </View>

      {/* Video */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Video Showcase</Text>
        <Text style={styles.sectionHint}>YouTube, Vimeo, or other video link</Text>
        <TextInput style={styles.input} value={videoUrl} onChangeText={setVideoUrl} placeholder="https://youtube.com/watch?v=..." placeholderTextColor="#666" autoCapitalize="none" keyboardType="url" />
      </View>
    </View>
  );

  const renderThemeTab = () => (
    <View style={styles.tabContent}>
      {/* Primary Color */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Primary Color</Text>
        <Text style={styles.sectionHint}>Used for buttons, highlights, and accents</Text>
        
        <View style={styles.colorGrid}>
          {PRESET_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[styles.colorOption, { backgroundColor: color }, primaryColor === color && styles.colorOptionActive]}
              onPress={() => { setPrimaryColor(color); setAccentColor(color); }}
            >
              {primaryColor === color && <Ionicons name="checkmark" size={18} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>
        
        <View style={styles.customColorRow}>
          <Text style={styles.customColorLabel}>Custom:</Text>
          <TextInput style={[styles.input, styles.colorInput]} value={primaryColor} onChangeText={(v) => { setPrimaryColor(v); setAccentColor(v); }} placeholder="#FF5500" placeholderTextColor="#666" autoCapitalize="none" />
          <View style={[styles.colorPreview, { backgroundColor: primaryColor }]} />
        </View>
      </View>

      {/* Background */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Background</Text>
        
        <TouchableOpacity style={styles.toggleRow} onPress={() => setUseGradient(!useGradient)}>
          <Text style={styles.toggleLabel}>Use Gradient Background</Text>
          <View style={[styles.toggle, useGradient && styles.toggleActive]}>
            <View style={[styles.toggleKnob, useGradient && styles.toggleKnobActive]} />
          </View>
        </TouchableOpacity>
        
        {useGradient ? (
          <View style={styles.gradientInputs}>
            <View style={styles.gradientInput}>
              <Text style={styles.smallLabel}>Start Color</Text>
              <TextInput style={[styles.input, styles.colorInput]} value={gradientStart} onChangeText={setGradientStart} placeholder="#1a1a1a" placeholderTextColor="#666" />
            </View>
            <View style={styles.gradientInput}>
              <Text style={styles.smallLabel}>End Color</Text>
              <TextInput style={[styles.input, styles.colorInput]} value={gradientEnd} onChangeText={setGradientEnd} placeholder="#000000" placeholderTextColor="#666" />
            </View>
          </View>
        ) : (
          <View style={styles.customColorRow}>
            <Text style={styles.customColorLabel}>Background:</Text>
            <TextInput style={[styles.input, styles.colorInput]} value={backgroundColor} onChangeText={setBackgroundColor} placeholder="#000000" placeholderTextColor="#666" />
            <View style={[styles.colorPreview, { backgroundColor }]} />
          </View>
        )}
      </View>

      {/* Card Color */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Card/Section Color</Text>
        <View style={styles.customColorRow}>
          <TextInput style={[styles.input, styles.colorInput, { flex: 1 }]} value={cardColor} onChangeText={setCardColor} placeholder="#1a1a1a" placeholderTextColor="#666" />
          <View style={[styles.colorPreview, { backgroundColor: cardColor }]} />
        </View>
      </View>

      {/* Layout */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photo Gallery Style</Text>
        <View style={styles.styleOptions}>
          {PHOTO_STYLES.map((style) => (
            <TouchableOpacity
              key={style.id}
              style={[styles.styleOption, photoStyle === style.id && { borderColor: primaryColor, backgroundColor: primaryColor + '20' }]}
              onPress={() => setPhotoStyle(style.id)}
            >
              <Ionicons name={style.icon as any} size={24} color={photoStyle === style.id ? primaryColor : '#888'} />
              <Text style={[styles.styleLabel, photoStyle === style.id && { color: primaryColor }]}>{style.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Header Style */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Header Style</Text>
        <View style={styles.styleOptions}>
          {HEADER_STYLES.map((style) => (
            <TouchableOpacity
              key={style.id}
              style={[styles.styleOption, headerStyle === style.id && { borderColor: primaryColor, backgroundColor: primaryColor + '20' }]}
              onPress={() => setHeaderStyle(style.id)}
            >
              <Text style={[styles.styleLabel, headerStyle === style.id && { color: primaryColor }]}>{style.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Show Bio First */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.toggleRow} onPress={() => setShowBioFirst(!showBioFirst)}>
          <Text style={styles.toggleLabel}>Show Bio Before Photos</Text>
          <View style={[styles.toggle, showBioFirst && styles.toggleActive]}>
            <View style={[styles.toggleKnob, showBioFirst && styles.toggleKnobActive]} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderServicesTab = () => (
    <View style={styles.tabContent}>
      {/* Pricing Toggle */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.toggleRow} onPress={() => setShowPricing(!showPricing)}>
          <Text style={styles.toggleLabel}>Show Pricing on Profile</Text>
          <View style={[styles.toggle, showPricing && styles.toggleActive]}>
            <View style={[styles.toggleKnob, showPricing && styles.toggleKnobActive]} />
          </View>
        </TouchableOpacity>
        
        {showPricing && (
          <View style={styles.priceInputs}>
            <View style={styles.priceInput}>
              <Text style={styles.smallLabel}>Starting at</Text>
              <TextInput style={styles.input} value={priceMin} onChangeText={setPriceMin} placeholder="$50" placeholderTextColor="#666" keyboardType="numeric" />
            </View>
            <View style={styles.priceInput}>
              <Text style={styles.smallLabel}>Up to</Text>
              <TextInput style={styles.input} value={priceMax} onChangeText={setPriceMax} placeholder="$500" placeholderTextColor="#666" keyboardType="numeric" />
            </View>
            <View style={styles.priceInput}>
              <Text style={styles.smallLabel}>Per</Text>
              <View style={styles.unitOptions}>
                {['hour', 'day', 'project'].map((unit) => (
                  <TouchableOpacity key={unit} style={[styles.unitOption, priceUnit === unit && { backgroundColor: primaryColor }]} onPress={() => setPriceUnit(unit)}>
                    <Text style={[styles.unitText, priceUnit === unit && { color: '#fff' }]}>{unit}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Services List */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Services Offered</Text>
          <TouchableOpacity style={[styles.addItemBtn, { backgroundColor: primaryColor }]} onPress={addService}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {services.map((service, i) => (
          <View key={i} style={styles.serviceItem}>
            <View style={styles.serviceHeader}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={service.name} onChangeText={(v) => updateService(i, 'name', v)} placeholder="Service name" placeholderTextColor="#666" />
              <TouchableOpacity onPress={() => removeItem(i, setServices, services)}>
                <Ionicons name="trash-outline" size={20} color="#f44336" />
              </TouchableOpacity>
            </View>
            <TextInput style={[styles.input, styles.textArea, { minHeight: 60 }]} value={service.description} onChangeText={(v) => updateService(i, 'description', v)} placeholder="Description" placeholderTextColor="#666" multiline />
            <View style={styles.serviceRow}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={service.price} onChangeText={(v) => updateService(i, 'price', v)} placeholder="Price (optional)" placeholderTextColor="#666" />
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0, marginLeft: 10 }]} value={service.duration} onChangeText={(v) => updateService(i, 'duration', v)} placeholder="Duration (optional)" placeholderTextColor="#666" />
            </View>
          </View>
        ))}
      </View>

      {/* Equipment */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Equipment / Gear</Text>
        <View style={styles.tagInputRow}>
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={newEquipment} onChangeText={setNewEquipment} placeholder="e.g., Canon R5, DJI Mavic" placeholderTextColor="#666" onSubmitEditing={() => { addItem('eq', newEquipment, setEquipment, equipment); setNewEquipment(''); }} />
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: primaryColor }]} onPress={() => { addItem('eq', newEquipment, setEquipment, equipment); setNewEquipment(''); }}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.tagsContainer}>
          {equipment.map((item, i) => (
            <TouchableOpacity key={i} style={styles.langTag} onPress={() => removeItem(i, setEquipment, equipment)}>
              <Text style={styles.langTagText}>{item}</Text>
              <Ionicons name="close" size={14} color="#888" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Specialties */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Specialties</Text>
        <View style={styles.tagInputRow}>
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={newSpecialty} onChangeText={setNewSpecialty} placeholder="e.g., Automotive, Portraits" placeholderTextColor="#666" onSubmitEditing={() => { addItem('sp', newSpecialty, setSpecialties, specialties); setNewSpecialty(''); }} />
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: primaryColor }]} onPress={() => { addItem('sp', newSpecialty, setSpecialties, specialties); setNewSpecialty(''); }}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
        <View style={styles.tagsContainer}>
          {specialties.map((item, i) => (
            <TouchableOpacity key={i} style={[styles.tag, { borderColor: primaryColor + '50', backgroundColor: primaryColor + '20' }]} onPress={() => removeItem(i, setSpecialties, specialties)}>
              <Text style={[styles.tagText, { color: primaryColor }]}>{item}</Text>
              <Ionicons name="close" size={14} color={primaryColor} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderContactTab = () => (
    <View style={styles.tabContent}>
      {/* Contact Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactToggle} onPress={() => setShowEmail(!showEmail)}>
            <Ionicons name={showEmail ? "checkbox" : "square-outline"} size={22} color={showEmail ? primaryColor : '#888'} />
          </TouchableOpacity>
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={contactEmail} onChangeText={setContactEmail} placeholder="Email address" placeholderTextColor="#666" keyboardType="email-address" autoCapitalize="none" />
        </View>
        
        <View style={styles.contactRow}>
          <TouchableOpacity style={styles.contactToggle} onPress={() => setShowPhone(!showPhone)}>
            <Ionicons name={showPhone ? "checkbox" : "square-outline"} size={22} color={showPhone ? primaryColor : '#888'} />
          </TouchableOpacity>
          <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={contactPhone} onChangeText={setContactPhone} placeholder="Phone number" placeholderTextColor="#666" keyboardType="phone-pad" />
        </View>
        
        <Text style={styles.inputLabel}>Response Time</Text>
        <TextInput style={styles.input} value={responseTime} onChangeText={setResponseTime} placeholder="e.g., Usually within 24 hours" placeholderTextColor="#666" />
      </View>

      {/* Links */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Website & Booking</Text>
        
        <Text style={styles.inputLabel}>Website / Portfolio</Text>
        <TextInput style={styles.input} value={externalLink} onChangeText={setExternalLink} placeholder="https://yourwebsite.com" placeholderTextColor="#666" autoCapitalize="none" keyboardType="url" />
        
        <Text style={styles.inputLabel}>Booking Link</Text>
        <TextInput style={styles.input} value={bookingLink} onChangeText={setBookingLink} placeholder="https://calendly.com/you" placeholderTextColor="#666" autoCapitalize="none" keyboardType="url" />
        
        <Text style={styles.inputLabel}>Booking Button Text</Text>
        <TextInput style={styles.input} value={bookingButtonText} onChangeText={setBookingButtonText} placeholder="Book Now" placeholderTextColor="#666" />
      </View>

      {/* Social Media */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Social Media</Text>
        
        <View style={styles.socialInput}>
          <Ionicons name="logo-instagram" size={20} color="#E4405F" />
          <TextInput style={styles.socialTextInput} value={instagram} onChangeText={setInstagram} placeholder="username" placeholderTextColor="#666" autoCapitalize="none" />
        </View>
        
        <View style={styles.socialInput}>
          <Ionicons name="logo-tiktok" size={20} color="#fff" />
          <TextInput style={styles.socialTextInput} value={tiktok} onChangeText={setTiktok} placeholder="username" placeholderTextColor="#666" autoCapitalize="none" />
        </View>
        
        <View style={styles.socialInput}>
          <Ionicons name="logo-youtube" size={20} color="#FF0000" />
          <TextInput style={styles.socialTextInput} value={youtube} onChangeText={setYoutube} placeholder="channel" placeholderTextColor="#666" autoCapitalize="none" />
        </View>
        
        <View style={styles.socialInput}>
          <Ionicons name="logo-facebook" size={20} color="#1877F2" />
          <TextInput style={styles.socialTextInput} value={facebook} onChangeText={setFacebook} placeholder="page" placeholderTextColor="#666" autoCapitalize="none" />
        </View>
      </View>
    </View>
  );

  const renderExtrasTab = () => (
    <View style={styles.tabContent}>
      {/* Testimonials */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Testimonials</Text>
          <TouchableOpacity style={[styles.addItemBtn, { backgroundColor: primaryColor }]} onPress={addTestimonial}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {testimonials.map((t, i) => (
          <View key={i} style={styles.testimonialItem}>
            <View style={styles.testimonialHeader}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={t.name} onChangeText={(v) => updateTestimonial(i, 'name', v)} placeholder="Client name" placeholderTextColor="#666" />
              <TouchableOpacity onPress={() => removeItem(i, setTestimonials, testimonials)}>
                <Ionicons name="trash-outline" size={20} color="#f44336" />
              </TouchableOpacity>
            </View>
            <TextInput style={[styles.input, styles.textArea]} value={t.text} onChangeText={(v) => updateTestimonial(i, 'text', v)} placeholder="Their testimonial..." placeholderTextColor="#666" multiline />
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Rating:</Text>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => updateTestimonial(i, 'rating', star)}>
                  <Ionicons name={star <= (t.rating || 5) ? "star" : "star-outline"} size={24} color="#FFD700" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* Achievements */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Awards & Achievements</Text>
          <TouchableOpacity style={[styles.addItemBtn, { backgroundColor: primaryColor }]} onPress={addAchievement}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {achievements.map((a, i) => (
          <View key={i} style={styles.achievementItem}>
            <View style={styles.achievementHeader}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={a.title} onChangeText={(v) => updateAchievement(i, 'title', v)} placeholder="Award title" placeholderTextColor="#666" />
              <TextInput style={[styles.input, { width: 80, marginBottom: 0, marginLeft: 10 }]} value={a.year} onChangeText={(v) => updateAchievement(i, 'year', v)} placeholder="Year" placeholderTextColor="#666" keyboardType="numeric" />
              <TouchableOpacity style={{ marginLeft: 10 }} onPress={() => removeItem(i, setAchievements, achievements)}>
                <Ionicons name="trash-outline" size={20} color="#f44336" />
              </TouchableOpacity>
            </View>
            <TextInput style={styles.input} value={a.description} onChangeText={(v) => updateAchievement(i, 'description', v)} placeholder="Description (optional)" placeholderTextColor="#666" />
          </View>
        ))}
      </View>

      {/* FAQs */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>FAQs</Text>
          <TouchableOpacity style={[styles.addItemBtn, { backgroundColor: primaryColor }]} onPress={addFaq}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        {faqs.map((f, i) => (
          <View key={i} style={styles.faqItem}>
            <View style={styles.faqHeader}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} value={f.question} onChangeText={(v) => updateFaq(i, 'question', v)} placeholder="Question" placeholderTextColor="#666" />
              <TouchableOpacity style={{ marginLeft: 10 }} onPress={() => removeItem(i, setFaqs, faqs)}>
                <Ionicons name="trash-outline" size={20} color="#f44336" />
              </TouchableOpacity>
            </View>
            <TextInput style={[styles.input, styles.textArea]} value={f.answer} onChangeText={(v) => updateFaq(i, 'answer', v)} placeholder="Answer" placeholderTextColor="#666" multiline />
          </View>
        ))}
      </View>

      {/* CTA Button */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.toggleRow} onPress={() => setCtaEnabled(!ctaEnabled)}>
          <Text style={styles.toggleLabel}>Custom Call-to-Action Button</Text>
          <View style={[styles.toggle, ctaEnabled && styles.toggleActive]}>
            <View style={[styles.toggleKnob, ctaEnabled && styles.toggleKnobActive]} />
          </View>
        </TouchableOpacity>
        
        {ctaEnabled && (
          <View style={{ marginTop: 12 }}>
            <TextInput style={styles.input} value={ctaText} onChangeText={setCtaText} placeholder="Button text" placeholderTextColor="#666" />
            <TextInput style={styles.input} value={ctaLink} onChangeText={setCtaLink} placeholder="Button link (URL)" placeholderTextColor="#666" autoCapitalize="none" keyboardType="url" />
          </View>
        )}
      </View>

      {/* Profile Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile Status</Text>
        
        <View style={styles.completionBar}>
          <View style={[styles.completionFill, { width: `${profileCompletion}%`, backgroundColor: primaryColor }]} />
        </View>
        <Text style={styles.completionText}>{profileCompletion}% Complete</Text>
        
        <TouchableOpacity style={styles.statusToggle} onPress={() => setIsActive(!isActive)}>
          <View style={styles.statusInfo}>
            <Ionicons name={isActive ? "eye" : "eye-off"} size={24} color={isActive ? "#4CAF50" : "#888"} />
            <View style={styles.statusText}>
              <Text style={styles.statusTitle}>{isActive ? "Profile is Live" : "Profile is Hidden"}</Text>
              <Text style={styles.statusHint}>{isActive ? "Visible to everyone" : "Only you can see it"}</Text>
            </View>
          </View>
          <View style={[styles.toggle, isActive && { backgroundColor: '#4CAF50' }]}>
            <View style={[styles.toggleKnob, isActive && styles.toggleKnobActive]} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator size="small" color={primaryColor} /> : <Text style={[styles.saveButton, { color: primaryColor }]}>Save</Text>}
        </TouchableOpacity>
      </View>
      
      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer} contentContainerStyle={styles.tabsContent}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && { borderBottomColor: primaryColor }]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.id ? primaryColor : '#888'} />
            <Text style={[styles.tabLabel, activeTab === tab.id && { color: primaryColor }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Content */}
      <ScrollView ref={scrollRef} style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'basic' && renderBasicTab()}
        {activeTab === 'media' && renderMediaTab()}
        {activeTab === 'theme' && renderThemeTab()}
        {activeTab === 'services' && renderServicesTab()}
        {activeTab === 'contact' && renderContactTab()}
        {activeTab === 'extras' && renderExtrasTab()}
        
        {/* Save Button */}
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: primaryColor }, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.saveBtnText}>Save Profile</Text>
            </>
          )}
        </TouchableOpacity>
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContent: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  noAccessTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 16 },
  noAccessText: { color: '#888', fontSize: 15, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  backBtn: { backgroundColor: '#FF5500', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#222' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  saveButton: { fontSize: 16, fontWeight: '700' },
  tabsContainer: { backgroundColor: '#111', borderBottomWidth: 1, borderBottomColor: '#222' },
  tabsContent: { paddingHorizontal: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel: { color: '#888', fontSize: 13, fontWeight: '600' },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  section: { marginBottom: 24, backgroundColor: '#111', borderRadius: 12, padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionHint: { color: '#888', fontSize: 13, marginBottom: 12 },
  inputLabel: { color: '#aaa', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#1a1a1a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#333', marginBottom: 8 },
  textArea: { minHeight: 100, paddingTop: 12, textAlignVertical: 'top' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryOption: { width: '48%', padding: 14, borderRadius: 10, backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: '#333', alignItems: 'center' },
  categoryOptionActive: { borderColor: '#FF5500', backgroundColor: 'rgba(255, 85, 0, 0.1)' },
  categoryLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginTop: 8, textAlign: 'center' },
  availabilityOption: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: '#333', marginBottom: 8 },
  availabilityDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  availabilityLabel: { color: '#ccc', fontSize: 14, fontWeight: '600' },
  tagInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addBtn: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  addItemBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, gap: 6 },
  tagText: { fontSize: 13, fontWeight: '500' },
  langTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#222', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  langTagText: { color: '#ccc', fontSize: 13 },
  photosScroll: { marginTop: 8 },
  photoContainer: { width: 100, height: 130, marginRight: 12, borderRadius: 10, overflow: 'hidden', backgroundColor: '#1a1a1a' },
  photo: { width: '100%', height: '100%' },
  removePhotoBtn: { position: 'absolute', top: 4, right: 4 },
  mainPhotoBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 4 },
  mainPhotoText: { color: '#fff', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  addPhotoBtn: { width: 100, height: 130, borderRadius: 10, borderWidth: 2, borderColor: '#333', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addPhotoText: { color: '#888', fontSize: 11, marginTop: 4 },
  bannerContainer: { position: 'relative', borderRadius: 10, overflow: 'hidden' },
  bannerImage: { width: '100%', height: 120 },
  removeBannerBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 20 },
  addBannerBtn: { height: 120, borderRadius: 10, borderWidth: 2, borderColor: '#333', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  addBannerText: { color: '#888', fontSize: 13, marginTop: 8 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  logoContainer: { position: 'relative' },
  logoImage: { width: 80, height: 80, borderRadius: 10 },
  removeLogoBtn: { position: 'absolute', top: -8, right: -8 },
  addLogoBtn: { width: 80, height: 80, borderRadius: 10, borderWidth: 2, borderColor: '#333', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  logoHint: { color: '#888', fontSize: 13, flex: 1 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  colorOption: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  colorOptionActive: { borderWidth: 3, borderColor: '#fff' },
  customColorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  customColorLabel: { color: '#888', fontSize: 13 },
  colorInput: { width: 100, marginBottom: 0 },
  colorPreview: { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  toggleLabel: { color: '#fff', fontSize: 15, fontWeight: '500' },
  toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: '#333', justifyContent: 'center', paddingHorizontal: 2 },
  toggleActive: { backgroundColor: '#FF5500' },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#888' },
  toggleKnobActive: { backgroundColor: '#fff', alignSelf: 'flex-end' },
  gradientInputs: { flexDirection: 'row', gap: 16, marginTop: 12 },
  gradientInput: { flex: 1 },
  smallLabel: { color: '#888', fontSize: 12, marginBottom: 4 },
  styleOptions: { flexDirection: 'row', gap: 10 },
  styleOption: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#1a1a1a', borderWidth: 2, borderColor: '#333', alignItems: 'center' },
  styleLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginTop: 4 },
  priceInputs: { marginTop: 12 },
  priceInput: { marginBottom: 12 },
  unitOptions: { flexDirection: 'row', gap: 8 },
  unitOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#222' },
  unitText: { color: '#888', fontSize: 13, fontWeight: '600' },
  serviceItem: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, marginBottom: 12 },
  serviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  serviceRow: { flexDirection: 'row', marginTop: 8 },
  socialInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a1a', borderRadius: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: '#333', marginBottom: 10 },
  socialTextInput: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 12, marginLeft: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  contactToggle: { padding: 4 },
  testimonialItem: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, marginBottom: 12 },
  testimonialHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  ratingLabel: { color: '#888', fontSize: 13, marginRight: 8 },
  achievementItem: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, marginBottom: 12 },
  achievementHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  faqItem: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, marginBottom: 12 },
  faqHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  completionBar: { height: 8, backgroundColor: '#222', borderRadius: 4, marginBottom: 8, overflow: 'hidden' },
  completionFill: { height: '100%', borderRadius: 4 },
  completionText: { color: '#888', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  statusToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a1a1a', padding: 14, borderRadius: 10 },
  statusInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusText: { marginLeft: 12 },
  statusTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  statusHint: { color: '#888', fontSize: 12, marginTop: 2 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, marginHorizontal: 16, marginTop: 8, gap: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
