import { useState, useCallback } from 'react';
import axios from 'axios';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { API_URL } from '../utils/api';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  eventId?: string;
  carId?: string;
}

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showModal, setShowModal] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const response = await axios.get(`${API_URL}/api/notifications/${userId}`);
      const unread = response.data.filter((n: Notification) => !n.isRead);
      setNotifications(unread);
    } catch (error) {
      console.log('Failed to fetch notifications:', error);
    }
  }, [userId]);

  const markRead = useCallback(async (notifId: string) => {
    try {
      await axios.put(`${API_URL}/api/notifications/${notifId}/read`);
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (error) {
      console.log('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    try {
      await axios.put(`${API_URL}/api/notifications/user/${userId}/read-all`);
      setNotifications([]);
    } catch (error) {
      console.log('Failed to mark all notifications as read:', error);
    }
  }, [userId]);

  const handleTap = useCallback(async (notif: Notification) => {
    await markRead(notif.id);
    setShowModal(false);

    try {
      if (notif.type === 'garage_comment' && notif.carId) {
        router.push(`/garage/${notif.carId}`);
      } else if (
        (notif.type === 'rsvp_confirmation' ||
          notif.type === 'rsvp_reminder' ||
          notif.type === 'event_reminder') &&
        notif.eventId
      ) {
        router.push(`/event/${notif.eventId}`);
      } else if (notif.type === 'popup_event' && notif.eventId) {
        router.push(`/event/${notif.eventId}`);
      } else if (notif.type === 'message') {
        router.push('/messages');
      } else if (notif.type === 'meetup_invite') {
        router.push('/(tabs)/nearby');
      } else if (
        notif.type === 'feedback_response' ||
        notif.type === 'admin_feedback' ||
        notif.type === 'admin_alert'
      ) {
        Alert.alert(notif.title, notif.message);
      } else {
        Alert.alert(notif.title, notif.message);
      }
    } catch (e) {
      console.log('Navigation from notification failed:', e);
    }
  }, [markRead]);

  const getIcon = (type: string): string => {
    switch (type) {
      case 'garage_comment': return 'chatbubble';
      case 'rsvp_confirmation': return 'checkmark-circle';
      case 'rsvp_reminder': return 'calendar';
      case 'event_reminder': return 'alarm';
      case 'popup_event': return 'flash';
      case 'message': return 'mail';
      case 'meetup_invite': return 'people';
      case 'feedback_response': return 'megaphone';
      case 'admin_feedback': return 'bug';
      case 'admin_alert': return 'alert-circle';
      default: return 'notifications';
    }
  };

  const getColor = (type: string): string => {
    switch (type) {
      case 'garage_comment': return '#4FC3F7';
      case 'rsvp_confirmation': return '#69F0AE';
      case 'rsvp_reminder': return '#FF5500';
      case 'event_reminder': return '#FFD740';
      case 'popup_event': return '#FF5252';
      case 'message': return '#69F0AE';
      case 'meetup_invite': return '#CE93D8';
      case 'feedback_response': return '#FFB74D';
      case 'admin_feedback': return '#EF5350';
      case 'admin_alert': return '#42A5F5';
      default: return '#90A4AE';
    }
  };

  const getTimeAgo = (dateStr: string): string => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return {
    notifications,
    showModal,
    setShowModal,
    fetchNotifications,
    markRead,
    markAllRead,
    handleTap,
    getIcon,
    getColor,
    getTimeAgo,
    unreadCount: notifications.length,
  };
}
