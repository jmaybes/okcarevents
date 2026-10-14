import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FeedbackForm {
  type: string;
  subject: string;
  message: string;
}

interface User {
  name: string;
  email: string;
}

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
  feedbackForm: FeedbackForm;
  setFeedbackForm: (form: FeedbackForm) => void;
  sendingFeedback: boolean;
  onSubmit: () => void;
}

export default function FeedbackModal({
  visible,
  onClose,
  user,
  feedbackForm,
  setFeedbackForm,
  sendingFeedback,
  onSubmit,
}: FeedbackModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modalContainer}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {feedbackForm.type === 'bug' ? 'Report a Bug' : 
               feedbackForm.type === 'suggestion' ? 'Suggest a Feature' : 'Contact Admin'}
            </Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.feedbackDescription}>
              {feedbackForm.type === 'bug' 
                ? 'Found something not working? Let us know and we\'ll fix it!' 
                : feedbackForm.type === 'suggestion'
                ? 'Have an idea to make the app better? We\'d love to hear it!'
                : 'Have a question or need help? Send us a message!'}
            </Text>

            <Text style={styles.modalLabel}>Type</Text>
            <View style={styles.feedbackTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.feedbackTypeButton,
                  feedbackForm.type === 'bug' && styles.feedbackTypeButtonActive
                ]}
                onPress={() => setFeedbackForm({ ...feedbackForm, type: 'bug' })}
              >
                <Ionicons 
                  name="bug" 
                  size={20} 
                  color={feedbackForm.type === 'bug' ? '#fff' : '#F44336'} 
                />
                <Text style={[
                  styles.feedbackTypeText,
                  feedbackForm.type === 'bug' && styles.feedbackTypeTextActive
                ]}>Bug</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.feedbackTypeButton,
                  feedbackForm.type === 'suggestion' && styles.feedbackTypeButtonActive
                ]}
                onPress={() => setFeedbackForm({ ...feedbackForm, type: 'suggestion' })}
              >
                <Ionicons 
                  name="bulb" 
                  size={20} 
                  color={feedbackForm.type === 'suggestion' ? '#fff' : '#ffffff'} 
                />
                <Text style={[
                  styles.feedbackTypeText,
                  feedbackForm.type === 'suggestion' && styles.feedbackTypeTextActive
                ]}>Suggestion</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.feedbackTypeButton,
                  feedbackForm.type === 'other' && styles.feedbackTypeButtonActive
                ]}
                onPress={() => setFeedbackForm({ ...feedbackForm, type: 'other' })}
              >
                <Ionicons 
                  name="mail" 
                  size={20} 
                  color={feedbackForm.type === 'other' ? '#fff' : '#2196F3'} 
                />
                <Text style={[
                  styles.feedbackTypeText,
                  feedbackForm.type === 'other' && styles.feedbackTypeTextActive
                ]}>Other</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Subject *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Brief summary of your feedback"
              placeholderTextColor="#666"
              value={feedbackForm.subject}
              onChangeText={(text) => setFeedbackForm({ ...feedbackForm, subject: text })}
            />

            <Text style={styles.modalLabel}>Message *</Text>
            <TextInput
              style={[styles.modalInput, styles.feedbackTextArea]}
              placeholder={
                feedbackForm.type === 'bug' 
                  ? "Please describe the bug, what you expected to happen, and steps to reproduce..."
                  : feedbackForm.type === 'suggestion'
                  ? "Describe your feature idea and how it would improve the app..."
                  : "Write your message here..."
              }
              placeholderTextColor="#666"
              multiline
              numberOfLines={6}
              value={feedbackForm.message}
              onChangeText={(text) => setFeedbackForm({ ...feedbackForm, message: text })}
              textAlignVertical="top"
            />

            <View style={styles.feedbackFromSection}>
              <Ionicons name="person-circle" size={24} color="#666" />
              <Text style={styles.feedbackFromText}>
                Sending as: {user?.name} ({user?.email})
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, sendingFeedback && styles.saveButtonDisabled]}
              onPress={onSubmit}
              disabled={sendingFeedback}
            >
              {sendingFeedback ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Send Feedback</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  feedbackDescription: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  modalLabel: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#252525',
  },
  feedbackTextArea: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  feedbackTypeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  feedbackTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#252525',
  },
  feedbackTypeButtonActive: {
    backgroundColor: '#FF5500',
    borderColor: '#FF5500',
  },
  feedbackTypeText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 13,
  },
  feedbackTypeTextActive: {
    color: '#fff',
  },
  feedbackFromSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 10,
  },
  feedbackFromText: {
    color: '#888',
    fontSize: 13,
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#FF5500',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
