import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useAuth } from '../../../contexts/AuthContext';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 
  process.env.EXPO_PUBLIC_API_URL || 
  process.env.EXPO_PUBLIC_BACKEND_URL || 
  'https://event-hub-okc-1.preview.emergentagent.com';

export default function TalentInviteScreen() {
  const { code: urlCode } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  
  const [code, setCode] = useState(urlCode?.toString() || '');
  const [validating, setValidating] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{ valid: boolean; email?: string; expiresAt?: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (urlCode) {
      validateCode(urlCode.toString());
    }
  }, [urlCode]);

  const validateCode = async (inviteCode: string) => {
    if (!inviteCode.trim()) return;
    
    setValidating(true);
    setError('');
    setInviteInfo(null);
    
    try {
      const response = await fetch(`${API_URL}/api/talent/invite/${inviteCode}`);
      const data = await response.json();
      
      if (response.ok) {
        setInviteInfo(data);
      } else {
        setError(data.detail || 'Invalid invite code');
      }
    } catch {
      setError('Failed to validate invite code');
    } finally {
      setValidating(false);
    }
  };

  const acceptInvite = async () => {
    if (!user?.id) {
      Alert.alert(
        'Login Required',
        'You need to be logged in to accept a talent invite.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => router.push('/auth/login') },
        ]
      );
      return;
    }
    
    if (!code.trim()) {
      setError('Please enter an invite code');
      return;
    }
    
    setAccepting(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/api/talent/invite/${code}/accept?user_id=${user.id}`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Refresh auth user so talentProfileId / isTalent are available immediately
        try {
          const profileId = data?.profile?.id;
          if (user) {
            await updateUser({ ...user, isTalent: true, ...(profileId ? { talentProfileId: profileId } : {}) });
          }
        } catch {
          // non-fatal; user will be refreshed on next app launch
        }
        Alert.alert(
          '🎉 Welcome to Talent!',
          'Your invite has been accepted! Now let\'s set up your profile.',
          [
            { text: 'Setup Profile', onPress: () => router.replace('/talent/setup') },
          ]
        );
      } else {
        setError(data.detail || 'Failed to accept invite');
      }
    } catch {
      setError('Failed to accept invite. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={['#1a1a1a', '#000']}
        style={[styles.content, { paddingTop: insets.top + 20 }]}
      >
        {/* Back button */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        {/* Icon */}
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={['#FF5500', '#FF8800']}
            style={styles.iconGradient}
          >
            <Ionicons name="star" size={48} color="#fff" />
          </LinearGradient>
        </View>
        
        {/* Title */}
        <Text style={styles.title}>Talent Invite</Text>
        <Text style={styles.subtitle}>
          Enter your invite code to become a featured talent on StreetMotion
        </Text>
        
        {/* Code Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={(text) => {
              setCode(text);
              setInviteInfo(null);
              setError('');
            }}
            placeholder="Enter invite code"
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <TouchableOpacity 
            style={styles.validateButton}
            onPress={() => validateCode(code)}
            disabled={validating || !code.trim()}
          >
            {validating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="checkmark" size={24} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        
        {/* Error message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color="#f44336" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        
        {/* Valid invite info */}
        {inviteInfo?.valid && (
          <View style={styles.validContainer}>
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
            <View style={styles.validInfo}>
              <Text style={styles.validTitle}>Valid Invite Code!</Text>
              {inviteInfo.email ? (
                <Text style={styles.validDetail}>For: {inviteInfo.email}</Text>
              ) : null}
              {inviteInfo.expiresAt ? (
                <Text style={styles.validDetail}>Expires: {formatDate(inviteInfo.expiresAt)}</Text>
              ) : null}
            </View>
          </View>
        )}
        
        {/* Accept Button */}
        <TouchableOpacity 
          style={[
            styles.acceptButton,
            (!inviteInfo?.valid || accepting) && styles.acceptButtonDisabled
          ]}
          onPress={acceptInvite}
          disabled={!inviteInfo?.valid || accepting}
        >
          {accepting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="rocket" size={22} color="#fff" />
              <Text style={styles.acceptButtonText}>Accept Invite & Join</Text>
            </>
          )}
        </TouchableOpacity>
        
        {/* Login prompt */}
        {!user && (
          <View style={styles.loginPrompt}>
            <Text style={styles.loginText}>Don&apos;t have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/auth/register')}>
              <Text style={styles.loginLink}>Sign up first</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Info */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>What is Talent?</Text>
          <View style={styles.infoItem}>
            <Ionicons name="camera" size={20} color="#FF5500" />
            <Text style={styles.infoText}>Photographers, videographers, and visual artists</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="person" size={20} color="#FF5500" />
            <Text style={styles.infoText}>Models and influencers</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="musical-notes" size={20} color="#FF5500" />
            <Text style={styles.infoText}>Dancers and entertainers</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="star" size={20} color="#FF5500" />
            <Text style={styles.infoText}>Get featured and connect with the car community</Text>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  iconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  codeInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: '#333',
  },
  validateButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FF5500',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 10,
  },
  errorText: {
    color: '#f44336',
    fontSize: 14,
    fontWeight: '500',
  },
  validContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    marginBottom: 20,
  },
  validInfo: {
    flex: 1,
  },
  validTitle: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '700',
  },
  validDetail: {
    color: '#888',
    fontSize: 13,
    marginTop: 4,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5500',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
    marginBottom: 20,
  },
  acceptButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.6,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  loginText: {
    color: '#888',
    fontSize: 14,
  },
  loginLink: {
    color: '#FF5500',
    fontSize: 14,
    fontWeight: '600',
  },
  infoSection: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    marginTop: 'auto',
  },
  infoTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  infoText: {
    color: '#aaa',
    fontSize: 14,
    flex: 1,
  },
});
