import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  carId?: string;
  eventId?: string;
}

interface ProfileNotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: Notification[];
  onTapNotification: (notif: Notification) => void;
  onClearAll: () => void;
  getNotificationIcon: (type: string) => string;
  getNotificationColor: (type: string) => string;
  getTimeAgo: (dateStr: string) => string;
}

export default function ProfileNotificationsModal({
  visible,
  onClose,
  notifications,
  onTapNotification,
  onClearAll,
  getNotificationIcon,
  getNotificationColor,
  getTimeAgo,
}: ProfileNotificationsModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0c0c0c' }}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={onClose} 
            style={styles.backBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            activeOpacity={0.5}
          >
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          {notifications.length > 0 && (
            <TouchableOpacity onPress={onClearAll} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={64} color="#444" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptySubtitle}>No new notifications right now.</Text>
          </View>
        ) : (
          <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 40 }}>
            {notifications.map((notif) => (
              <TouchableOpacity
                key={notif.id}
                style={styles.notifItem}
                onPress={() => onTapNotification(notif)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: getNotificationColor(notif.type) + '22' }]}>
                  <Ionicons
                    name={getNotificationIcon(notif.type) as any}
                    size={22}
                    color={getNotificationColor(notif.type)}
                  />
                </View>
                <View style={styles.notifContent}>
                  <Text style={styles.notifTitle} numberOfLines={1}>{notif.title}</Text>
                  <Text style={styles.notifMessage} numberOfLines={2}>{notif.message}</Text>
                  <Text style={styles.notifTime}>{getTimeAgo(notif.createdAt)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#555" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backBtn: {
    padding: 12,
    marginRight: 8,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  clearBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff22',
    borderRadius: 8,
  },
  clearBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notifContent: {
    flex: 1,
    marginRight: 8,
  },
  notifTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  notifMessage: {
    color: '#aaa',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  notifTime: {
    color: '#666',
    fontSize: 11,
  },
});
