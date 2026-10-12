import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import NotificationBell from './NotificationBell';

interface PageHeaderProps {
  title: string;
  showBackButton?: boolean;
  showNotificationBell?: boolean;
  unreadCount?: number;
  onNotificationPress?: () => void;
  rightComponent?: React.ReactNode;
  // Custom gradient colors (defaults to silver/black)
  gradientColors?: readonly [string, string, ...string[]];
  // For pages like Messages that use blue gradient
  titleColor?: string;
  // Whether to show the centered StreetMotion logo
  showLogo?: boolean;
  // Fixed left width for alignment
  leftWidth?: number;
  // Fixed right width for alignment
  rightWidth?: number;
}

export default function PageHeader({
  title,
  showBackButton = true,
  showNotificationBell = true,
  unreadCount = 0,
  onNotificationPress,
  rightComponent,
  gradientColors = ['#C0C0C0', '#1a1a1a'],
  titleColor = '#fff',
  showLogo = true,
  leftWidth = 90,
  rightWidth = 90,
}: PageHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
    >
      <View style={styles.headerContent}>
        {/* Left side - Back button and/or title */}
        <View style={[styles.leftSection, { width: leftWidth }]}>
          {showBackButton && (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={titleColor} />
            </TouchableOpacity>
          )}
          <Text style={[styles.pageTitle, { color: titleColor }]} numberOfLines={1}>{title}</Text>
        </View>

        {/* Center - Logo */}
        {showLogo ? (
          <Image
            source={require('../assets/images/streetmotion-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.logo} />
        )}

        {/* Right side - Notification bell or custom component */}
        <View style={[styles.rightSection, { width: rightWidth }]}>
          {rightComponent ? (
            rightComponent
          ) : showNotificationBell ? (
            <NotificationBell
              unreadCount={unreadCount}
              onPress={onNotificationPress || (() => {})}
              size={20}
            />
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 4,
    padding: 4,
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: '700',
    opacity: 0.9,
    fontFamily: 'RobotoCondensed-Regular',
    flexShrink: 1,
  },
  logo: {
    width: 180,
    height: 65,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
});
