import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from '../../components/NotificationBell';
import NotificationModal from '../../components/NotificationModal';
import { useNotifications } from '../../hooks/useNotifications';

export default function TalentScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const notif = useNotifications(user?.id);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) notif.fetchNotifications();
    }, [user?.id])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/images/streetmotion-logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.headerTitle}>Talent</Text>
        <NotificationBell
          unreadCount={notif.unreadCount}
          onPress={() => notif.setShowModal(true)}
        />
      </View>

      {/* Coming Soon Content */}
      <View style={styles.comingSoonContainer}>
        <Ionicons name="star" size={64} color="#FF5500" />
        <Text style={styles.comingSoonTitle}>Talent</Text>
        <Text style={styles.comingSoonSubtitle}>Coming Soon</Text>
        <Text style={styles.comingSoonDesc}>
          Discover talented builders, painters, detailers, and mechanics in the OKC car community.
        </Text>
      </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerLeft: {
    width: 80,
  },
  headerLogo: {
    width: 80,
    height: 30,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  comingSoonTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  comingSoonSubtitle: {
    fontSize: 18,
    color: '#FF5500',
    fontWeight: '600',
    marginTop: 4,
  },
  comingSoonDesc: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
});
