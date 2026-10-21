import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Share,
  Clipboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 
  process.env.EXPO_PUBLIC_API_URL || 
  process.env.EXPO_PUBLIC_BACKEND_URL || 
  'https://event-hub-okc-1.preview.emergentagent.com';

interface TalentInvite {
  id: string;
  code: string;
  email: string | null;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  acceptedBy?: string;
  acceptedAt?: string;
  createdAt: string;
}

export default function TalentInvitesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [invites, setInvites] = useState<TalentInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchInvites();
    }
  }, [user, statusFilter]);

  const fetchInvites = async () => {
    try {
      let url = `${API_URL}/api/admin/talent/invites?admin_id=${user?.id}`;
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.invites) {
        setInvites(data.invites);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
    } finally {
      setLoading(false);
    }
  };

  const createInvite = async (withEmail: boolean) => {
    if (withEmail && !email.trim()) {
      Alert.alert('Required', 'Please enter an email address');
      return;
    }
    
    setCreating(true);
    
    try {
      const params = new URLSearchParams({
        admin_id: user?.id || '',
        generate_code: 'true',
      });
      
      if (withEmail && email.trim()) {
        params.append('email', email.trim());
      }
      
      const response = await fetch(`${API_URL}/api/admin/talent/invite?${params}`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const inviteCode = data.invite.code;
        
        let emailLine = 'Shareable code created';
        if (withEmail) {
          emailLine = data.emailSent
            ? `📧 Email sent to: ${email}`
            : `⚠️ Could NOT email ${email}. Share the code manually below.`;
        }
        
        Alert.alert(
          'Invite Created!',
          `Code: ${inviteCode}\n\n${emailLine}`,
          [
            { text: 'Copy Code', onPress: () => copyToClipboard(inviteCode) },
            { text: 'Share', onPress: () => shareInvite(inviteCode) },
            { text: 'Done', style: 'cancel' },
          ]
        );
        
        setEmail('');
        fetchInvites();
      } else {
        Alert.alert('Error', data.detail || 'Failed to create invite');
      }
    } catch (error) {
      console.error('Error creating invite:', error);
      Alert.alert('Error', 'Failed to create invite');
    } finally {
      setCreating(false);
    }
  };

  const deleteInvite = async (inviteId: string) => {
    Alert.alert(
      'Delete Invite',
      'Are you sure you want to delete this invite?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_URL}/api/admin/talent/invite/${inviteId}?admin_id=${user?.id}`,
                { method: 'DELETE' }
              );
              
              if (response.ok) {
                fetchInvites();
              }
            } catch (error) {
              console.error('Error deleting invite:', error);
            }
          }
        },
      ]
    );
  };

  const copyToClipboard = (code: string) => {
    Clipboard.setString(code);
    Alert.alert('Copied!', 'Invite code copied to clipboard');
  };

  const shareInvite = async (code: string) => {
    try {
      await Share.share({
        message: `You've been invited to join StreetMotion as a Talent!\n\nYour invite code: ${code}\n\nTo set up your profile:\n1. Open the StreetMotion app\n2. Go to the Talent tab\n3. Tap the gold key icon at the top right\n4. Enter your code: ${code}`,
        title: 'StreetMotion Talent Invite',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'accepted': return '#4CAF50';
      case 'expired': return '#f44336';
      default: return '#888';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  if (!user?.isAdmin) {
    return (
      <View style={[styles.container, styles.centerContent, { paddingTop: insets.top }]}>
        <Ionicons name="lock-closed" size={64} color="#666" />
        <Text style={styles.accessDeniedText}>Admin Access Required</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Talent Invites</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {/* Create Invite Section */}
      <View style={styles.createSection}>
        <Text style={styles.createTitle}>Create New Invite</Text>
        
        <View style={styles.emailInputRow}>
          <TextInput
            style={styles.emailInput}
            value={email}
            onChangeText={setEmail}
            placeholder="Email address (optional)"
            placeholderTextColor="#666"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.createButtons}>
          <TouchableOpacity 
            style={[styles.createBtn, styles.emailBtn]}
            onPress={() => createInvite(true)}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="mail" size={18} color="#fff" />
                <Text style={styles.createBtnText}>Invite by Email</Text>
              </>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.createBtn, styles.codeBtn]}
            onPress={() => createInvite(false)}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="link" size={18} color="#fff" />
                <Text style={styles.createBtnText}>Generate Code</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity 
          style={[styles.filterTab, !statusFilter && styles.filterTabActive]}
          onPress={() => setStatusFilter(null)}
        >
          <Text style={[styles.filterText, !statusFilter && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, statusFilter === 'pending' && styles.filterTabActive]}
          onPress={() => setStatusFilter('pending')}
        >
          <Text style={[styles.filterText, statusFilter === 'pending' && styles.filterTextActive]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, statusFilter === 'accepted' && styles.filterTabActive]}
          onPress={() => setStatusFilter('accepted')}
        >
          <Text style={[styles.filterText, statusFilter === 'accepted' && styles.filterTextActive]}>Accepted</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, statusFilter === 'expired' && styles.filterTabActive]}
          onPress={() => setStatusFilter('expired')}
        >
          <Text style={[styles.filterText, statusFilter === 'expired' && styles.filterTextActive]}>Expired</Text>
        </TouchableOpacity>
      </View>
      
      {/* Invites List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5500" />
        </View>
      ) : (
        <ScrollView style={styles.invitesList} contentContainerStyle={styles.invitesContent}>
          {invites.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="mail-outline" size={48} color="#444" />
              <Text style={styles.emptyText}>No invites yet</Text>
              <Text style={styles.emptySubtext}>Create an invite to get started</Text>
            </View>
          ) : (
            invites.map((invite) => (
              <View key={invite.id} style={styles.inviteCard}>
                <View style={styles.inviteHeader}>
                  <View style={styles.codeContainer}>
                    <Text style={styles.inviteCode}>{invite.code}</Text>
                    <TouchableOpacity onPress={() => copyToClipboard(invite.code)}>
                      <Ionicons name="copy-outline" size={18} color="#888" />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invite.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(invite.status) }]}>
                      {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                    </Text>
                  </View>
                </View>
                
                {invite.email ? (
                  <View style={styles.inviteDetail}>
                    <Ionicons name="mail-outline" size={14} color="#888" />
                    <Text style={styles.inviteDetailText}>{invite.email}</Text>
                  </View>
                ) : null}
                
                <View style={styles.inviteDetail}>
                  <Ionicons name="time-outline" size={14} color="#888" />
                  <Text style={styles.inviteDetailText}>
                    Created: {formatDate(invite.createdAt)}
                  </Text>
                </View>
                
                {invite.status === 'pending' && (
                  <View style={styles.inviteDetail}>
                    <Ionicons name="hourglass-outline" size={14} color="#FF9800" />
                    <Text style={[styles.inviteDetailText, { color: '#FF9800' }]}>
                      Expires: {formatDate(invite.expiresAt)}
                    </Text>
                  </View>
                )}
                
                {invite.status === 'accepted' && invite.acceptedAt && (
                  <View style={styles.inviteDetail}>
                    <Ionicons name="checkmark-circle-outline" size={14} color="#4CAF50" />
                    <Text style={[styles.inviteDetailText, { color: '#4CAF50' }]}>
                      Accepted: {formatDate(invite.acceptedAt)}
                    </Text>
                  </View>
                )}
                
                <View style={styles.inviteActions}>
                  {invite.status === 'pending' && (
                    <TouchableOpacity 
                      style={styles.actionBtn}
                      onPress={() => shareInvite(invite.code)}
                    >
                      <Ionicons name="share-outline" size={18} color="#2196F3" />
                      <Text style={[styles.actionText, { color: '#2196F3' }]}>Share</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.actionBtn}
                    onPress={() => deleteInvite(invite.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#f44336" />
                    <Text style={[styles.actionText, { color: '#f44336' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedText: {
    color: '#888',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
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
    paddingVertical: 16,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  createSection: {
    padding: 16,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  createTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  emailInputRow: {
    marginBottom: 12,
  },
  emailInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  createButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  createBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  emailBtn: {
    backgroundColor: '#2196F3',
  },
  codeBtn: {
    backgroundColor: '#FF5500',
  },
  createBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
  },
  filterTabActive: {
    backgroundColor: 'rgba(255, 85, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#FF5500',
  },
  filterText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FF5500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invitesList: {
    flex: 1,
  },
  invitesContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
  inviteCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  inviteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inviteCode: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inviteDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  inviteDetailText: {
    color: '#888',
    fontSize: 13,
  },
  inviteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
