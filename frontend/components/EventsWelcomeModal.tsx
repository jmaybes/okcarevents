import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { 
  FadeIn, 
  FadeOut,
  SlideInDown,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const STORAGE_KEY = 'events_welcome_dismissed';

interface EventsWelcomeModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function EventsWelcomeModal({ visible, onDismiss }: EventsWelcomeModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleContinue = async () => {
    if (dontShowAgain) {
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
    }
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <Animated.View 
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
      >
        <Animated.View 
          entering={SlideInDown.duration(400).springify()}
          style={styles.modalContainer}
        >
          <LinearGradient
            colors={['#C0C0C0', '#808080', '#1a1a1a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.gradientBorder}
          >
            <View style={styles.modalContent}>
              {/* Header Icon */}
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={['#FF5500', '#E91E63']}
                  style={styles.iconGradient}
                >
                  <Ionicons name="car-sport" size={32} color="#fff" />
                </LinearGradient>
              </View>

              {/* Title */}
              <Text style={styles.title}>Welcome to the Feed!</Text>
              <View style={styles.titleUnderline} />

              {/* Feature List */}
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="sync" size={20} color="#FF5500" />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>Live Auto-Updates</Text>
                    <Text style={styles.featureDesc}>
                      Events are added and updated frequently. Pull down to refresh anytime.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="add-circle" size={20} color="#FF5500" />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>Submit Your Events</Text>
                    <Text style={styles.featureDesc}>
                      Easily add your own events to share with the community.
                    </Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Ionicons name="sparkles" size={20} color="#FF5500" />
                  </View>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureTitle}>AI-Powered Creation</Text>
                    <Text style={styles.featureDesc}>
                      Simply upload an event flyer and our AI will generate the listing for you.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Call to Action */}
              <View style={styles.ctaContainer}>
                <Ionicons name="arrow-down" size={16} color="#888" />
                <Text style={styles.ctaText}>
                  Tap the <Text style={styles.ctaHighlight}>+ Add</Text> button below to get started
                </Text>
              </View>

              {/* Checkbox */}
              <TouchableOpacity 
                style={styles.checkboxRow}
                onPress={() => setDontShowAgain(!dontShowAgain)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}>
                  {dontShowAgain && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Don't show this again</Text>
              </TouchableOpacity>

              {/* Continue Button */}
              <TouchableOpacity
                style={styles.continueButton}
                onPress={handleContinue}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FF5500', '#E91E63']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.continueGradient}
                >
                  <Text style={styles.continueText}>Got It!</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// Helper function to check if modal should be shown
export async function shouldShowEventsWelcome(): Promise<boolean> {
  try {
    const dismissed = await AsyncStorage.getItem(STORAGE_KEY);
    return dismissed !== 'true';
  } catch {
    return true;
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: width - 40,
    maxWidth: 380,
  },
  gradientBorder: {
    borderRadius: 20,
    padding: 2,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF5500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  titleUnderline: {
    width: 60,
    height: 3,
    backgroundColor: '#FF5500',
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 20,
  },
  featureList: {
    width: '100%',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,85,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: '#999',
    lineHeight: 17,
  },
  ctaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
  },
  ctaText: {
    fontSize: 12,
    color: '#888',
  },
  ctaHighlight: {
    color: '#FF5500',
    fontWeight: '700',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    alignSelf: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FF5500',
    borderColor: '#FF5500',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#888',
  },
  continueButton: {
    width: '100%',
    marginTop: 20,
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
