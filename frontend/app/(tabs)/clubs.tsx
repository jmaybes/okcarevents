import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    <View style={styles.container}>
      {/* Header with gradient */}
      <LinearGradient
        colors={['#C0C0C0', '#1a1a1a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.header}>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', opacity: 0.9, width: 70, fontFamily: 'RobotoCondensed-Regular' }}>Talent</Text>
          <Image
            source={require('../../assets/images/streetmotion-logo.png')}
            style={{ width: 126, height: 45 }}
            resizeMode="contain"
          />
          <View style={{ width: 60, alignItems: 'flex-end' }}>
            <NotificationBell
              unreadCount={notif.unreadCount}
              onPress={() => notif.setShowModal(true)}
              size={20}
            />
          </View>
        </View>
      </LinearGradient>

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
  headerGradient: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
  },
  headerLogo: {
    width: 70,
    height: 26,
  },
  headerTitle: {
    fontSize: 13,
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
