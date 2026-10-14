import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { useAuth } from '../../contexts/AuthContext';

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

interface TalentProfile {
  id: string;
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
    instagram: string;
    tiktok: string;
    youtube: string;
    facebook: string;
  };
  isActive: boolean;
  setupComplete: boolean;
}

export default function TalentSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<TalentProfile | null>(null);
  const [newTag, setNewTag] = useState('');
  
  // Form state
  const [category, setCategory] = useState('other');
  const [businessName, setBusinessName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [serviceTags, setServiceTags] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [availability, setAvailability] = useState('available');
  const [photos, setPhotos] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [instagram, setInstagram] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');
  const [facebook, setFacebook] = useState('');
  const [isActive, setIsActive] = useState(false);

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
        
        // Populate form
        setCategory(data.category || 'other');
        setBusinessName(data.businessName || '');
        setDisplayName(data.displayName || user.name || '');
        setBio(data.bio || '');
        setServiceTags(data.serviceTags || []);
        setLocation(data.location || '');
        setServiceArea(data.serviceArea || '');
        setAvailability(data.availability || 'available');
        setPhotos(data.photos || []);
        setVideoUrl(data.videoUrl || '');
        setContactEmail(data.contactEmail || user.email || '');
        setContactPhone(data.contactPhone || '');
        setExternalLink(data.externalLink || '');
        setInstagram(data.socialLinks?.instagram || '');
        setTiktok(data.socialLinks?.tiktok || '');
        setYoutube(data.socialLinks?.youtube || '');
        setFacebook(data.socialLinks?.facebook || '');
        setIsActive(data.isActive || false);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.id || !user?.id) return;
    
    // Validation
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
        category,
        businessName: businessName.trim(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        serviceTags,
        location: location.trim(),
        serviceArea: serviceArea.trim(),
        availability,
        photos,
        videoUrl: videoUrl.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        externalLink: externalLink.trim(),
        socialLinks: {
          instagram: instagram.trim(),
          tiktok: tiktok.trim(),
          youtube: youtube.trim(),
          facebook: facebook.trim(),
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
        Alert.alert(
          'Success',
          data.message || 'Profile saved successfully!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Error', data.detail || 'Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Limit Reached', `You can only add up to ${MAX_PHOTOS} photos`);
      return;
    }
    
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please allow access to your photos');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.7,
      base64: true,
    });
    
    if (!result.canceled && result.assets[0].base64) {
      const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhotos([...photos, base64Image]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !serviceTags.includes(tag) && serviceTags.length < 10) {
      setServiceTags([...serviceTags, tag]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setServiceTags(serviceTags.filter(t => t !== tag));
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
          Contact an admin to get invited!
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {profile.setupComplete ? 'Edit Profile' : 'Setup Profile'}
        </Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#FF5500" />
          ) : (
            <Text style={styles.saveButton}>Save</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category *</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryOption,
                  category === cat.id && styles.categoryOptionActive
                ]}
                onPress={() => setCategory(cat.id)}
              >
                <Ionicons 
                  name={cat.icon as any} 
                  size={24} 
                  color={category === cat.id ? '#FF5500' : '#888'} 
                />
                <Text style={[
                  styles.categoryLabel,
                  category === cat.id && styles.categoryLabelActive
                ]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos * ({photos.length}/{MAX_PHOTOS})</Text>
          <Text style={styles.sectionHint}>Add up to 6 photos to showcase your work</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity 
                  style={styles.removePhotoBtn}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#f44336" />
                </TouchableOpacity>
                {index === 0 && (
                  <View style={styles.mainPhotoBadge}>
                    <Text style={styles.mainPhotoText}>Main</Text>
                  </View>
                )}
              </View>
            ))}
            
            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
                <Ionicons name="add" size={32} color="#888" />
                <Text style={styles.addPhotoText}>Add Photo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
        
        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Info</Text>
          
          <Text style={styles.inputLabel}>Display Name *</Text>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name or stage name"
            placeholderTextColor="#666"
          />
          
          <Text style={styles.inputLabel}>Business Name (optional)</Text>
          <TextInput
            style={styles.input}
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Your business or brand name"
            placeholderTextColor="#666"
          />
          
          <Text style={styles.inputLabel}>Bio *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell people about yourself and what you do..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
        
        {/* Service Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services / Specialties</Text>
          <Text style={styles.sectionHint}>Add tags to help people find you</Text>
          
          <View style={styles.tagInputRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={newTag}
              onChangeText={setNewTag}
              placeholder="e.g., Event Photography"
              placeholderTextColor="#666"
              onSubmitEditing={addTag}
            />
            <TouchableOpacity style={styles.addTagBtn} onPress={addTag}>
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.tagsContainer}>
            {serviceTags.map((tag) => (
              <TouchableOpacity 
                key={tag} 
                style={styles.tag}
                onPress={() => removeTag(tag)}
              >
                <Text style={styles.tagText}>{tag}</Text>
                <Ionicons name="close" size={14} color="#FF5500" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <Text style={styles.inputLabel}>City / Area</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g., Oklahoma City, OK"
            placeholderTextColor="#666"
          />
          
          <Text style={styles.inputLabel}>Service Area</Text>
          <TextInput
            style={styles.input}
            value={serviceArea}
            onChangeText={setServiceArea}
            placeholder="e.g., OKC Metro, Statewide, Travel Available"
            placeholderTextColor="#666"
          />
        </View>
        
        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          
          <View style={styles.availabilityOptions}>
            {AVAILABILITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.availabilityOption,
                  availability === opt.id && { borderColor: opt.color, backgroundColor: `${opt.color}15` }
                ]}
                onPress={() => setAvailability(opt.id)}
              >
                <View style={[styles.availabilityDot, { backgroundColor: opt.color }]} />
                <Text style={[
                  styles.availabilityLabel,
                  availability === opt.id && { color: opt.color }
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {/* Video */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Video Showcase (optional)</Text>
          <Text style={styles.sectionHint}>Add a YouTube, Vimeo, or other video link</Text>
          
          <TextInput
            style={styles.input}
            value={videoUrl}
            onChangeText={setVideoUrl}
            placeholder="https://youtube.com/watch?v=..."
            placeholderTextColor="#666"
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
        
        {/* Contact Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="your@email.com"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <Text style={styles.inputLabel}>Phone (optional)</Text>
          <TextInput
            style={styles.input}
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="(555) 123-4567"
            placeholderTextColor="#666"
            keyboardType="phone-pad"
          />
          
          <Text style={styles.inputLabel}>Website / Portfolio Link</Text>
          <TextInput
            style={styles.input}
            value={externalLink}
            onChangeText={setExternalLink}
            placeholder="https://yourwebsite.com"
            placeholderTextColor="#666"
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
        
        {/* Social Media */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social Media</Text>
          
          <View style={styles.socialInput}>
            <Ionicons name="logo-instagram" size={20} color="#E4405F" />
            <TextInput
              style={styles.socialTextInput}
              value={instagram}
              onChangeText={setInstagram}
              placeholder="username"
              placeholderTextColor="#666"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.socialInput}>
            <Ionicons name="logo-tiktok" size={20} color="#fff" />
            <TextInput
              style={styles.socialTextInput}
              value={tiktok}
              onChangeText={setTiktok}
              placeholder="username"
              placeholderTextColor="#666"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.socialInput}>
            <Ionicons name="logo-youtube" size={20} color="#FF0000" />
            <TextInput
              style={styles.socialTextInput}
              value={youtube}
              onChangeText={setYoutube}
              placeholder="channel name or URL"
              placeholderTextColor="#666"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.socialInput}>
            <Ionicons name="logo-facebook" size={20} color="#1877F2" />
            <TextInput
              style={styles.socialTextInput}
              value={facebook}
              onChangeText={setFacebook}
              placeholder="page name or URL"
              placeholderTextColor="#666"
              autoCapitalize="none"
            />
          </View>
        </View>
        
        {/* Profile Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Status</Text>
          
          <TouchableOpacity 
            style={styles.statusToggle}
            onPress={() => setIsActive(!isActive)}
          >
            <View style={styles.statusInfo}>
              <Ionicons 
                name={isActive ? "eye" : "eye-off"} 
                size={24} 
                color={isActive ? "#4CAF50" : "#888"} 
              />
              <View style={styles.statusText}>
                <Text style={styles.statusTitle}>
                  {isActive ? "Profile is Live" : "Profile is Hidden"}
                </Text>
                <Text style={styles.statusHint}>
                  {isActive 
                    ? "Your profile is visible to everyone" 
                    : "Only you can see your profile"
                  }
                </Text>
              </View>
            </View>
            <View style={[
              styles.toggle,
              isActive && styles.toggleActive
            ]}>
              <View style={[
                styles.toggleKnob,
                isActive && styles.toggleKnobActive
              ]} />
            </View>
          </TouchableOpacity>
        </View>
        
        {/* Save Button */}
        <TouchableOpacity 
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.saveBtnText}>Save Profile</Text>
            </>
          )}
        </TouchableOpacity>
        
        {/* Bottom padding */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noAccessTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  noAccessText: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 22,
  },
  backBtn: {
    backgroundColor: '#FF5500',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  saveButton: {
    color: '#FF5500',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionHint: {
    color: '#888',
    fontSize: 13,
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryOption: {
    width: '48%',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
  },
  categoryOptionActive: {
    borderColor: '#FF5500',
    backgroundColor: 'rgba(255, 85, 0, 0.1)',
  },
  categoryLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: '#FF5500',
  },
  photosScroll: {
    marginTop: 8,
  },
  photoContainer: {
    width: 100,
    height: 130,
    marginRight: 12,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  mainPhotoBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 85, 0, 0.9)',
    paddingVertical: 4,
  },
  mainPhotoText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  addPhotoBtn: {
    width: 100,
    height: 130,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    color: '#888',
    fontSize: 11,
    marginTop: 4,
  },
  inputLabel: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addTagBtn: {
    backgroundColor: '#FF5500',
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 85, 0, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 85, 0, 0.3)',
    gap: 6,
  },
  tagText: {
    color: '#FF5500',
    fontSize: 13,
    fontWeight: '500',
  },
  availabilityOptions: {
    gap: 10,
  },
  availabilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#333',
  },
  availabilityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  availabilityLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  socialInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 10,
  },
  socialTextInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    paddingVertical: 12,
    marginLeft: 12,
  },
  statusToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    padding: 14,
    borderRadius: 10,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusText: {
    marginLeft: 12,
  },
  statusTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  statusHint: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#4CAF50',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#888',
  },
  toggleKnobActive: {
    backgroundColor: '#fff',
    alignSelf: 'flex-end',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5500',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
