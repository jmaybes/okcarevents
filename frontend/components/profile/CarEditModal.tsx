import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CarForm {
  make: string;
  model: string;
  year: string;
  color: string;
  trim: string;
  engine: string;
  horsepower: string;
  torque: string;
  transmission: string;
  drivetrain: string;
  description: string;
  modificationNotes: string;
  instagramHandle: string;
  youtubeChannel: string;
}

interface CarEditModalProps {
  visible: boolean;
  onClose: () => void;
  userCar: any;
  carForm: CarForm;
  setCarForm: (form: CarForm) => void;
  carPhotos: string[];
  mainPhotoIndex: number;
  setMainPhotoIndex: (index: number) => void;
  videoUrls: string[];
  newVideoUrl: string;
  setNewVideoUrl: (url: string) => void;
  garagePublic: boolean;
  setGaragePublic: (value: boolean) => void;
  savingCar: boolean;
  photoUploadProgress: string;
  onPickPhoto: () => void;
  onRemovePhoto: (index: number) => void;
  onAddVideo: () => void;
  onRemoveVideo: (index: number) => void;
  onSave: () => void;
}

export default function CarEditModal({
  visible,
  onClose,
  userCar,
  carForm,
  setCarForm,
  carPhotos,
  mainPhotoIndex,
  setMainPhotoIndex,
  videoUrls,
  newVideoUrl,
  setNewVideoUrl,
  garagePublic,
  setGaragePublic,
  savingCar,
  photoUploadProgress,
  onPickPhoto,
  onRemovePhoto,
  onAddVideo,
  onRemoveVideo,
  onSave,
}: CarEditModalProps) {
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
            <Text style={styles.modalTitle}>{userCar ? 'Edit Your Car' : 'Add Your Car'}</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === 'android' ? 32 : 0 }}>
            {/* Basic Info */}
            <Text style={styles.modalSectionTitle}>Basic Information</Text>
            
            <Text style={styles.modalLabel}>Make *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Ford, Chevrolet, Toyota"
              placeholderTextColor="#666"
              value={carForm.make}
              onChangeText={(text) => setCarForm({ ...carForm, make: text })}
            />

            <Text style={styles.modalLabel}>Model *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Mustang, Camaro, Supra"
              placeholderTextColor="#666"
              value={carForm.model}
              onChangeText={(text) => setCarForm({ ...carForm, model: text })}
            />

            <Text style={styles.modalLabel}>Year *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., 2024"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={carForm.year}
              onChangeText={(text) => setCarForm({ ...carForm, year: text })}
            />

            <Text style={styles.modalLabel}>Trim</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., GT, SS, TRD Pro"
              placeholderTextColor="#666"
              value={carForm.trim}
              onChangeText={(text) => setCarForm({ ...carForm, trim: text })}
            />

            <Text style={styles.modalLabel}>Color</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Grabber Blue, Triple Yellow"
              placeholderTextColor="#666"
              value={carForm.color}
              onChangeText={(text) => setCarForm({ ...carForm, color: text })}
            />

            {/* Performance Specs */}
            <Text style={[styles.modalSectionTitle, { marginTop: 24 }]}>Performance Specs</Text>

            <Text style={styles.modalLabel}>Engine</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., 5.0L V8, 2JZ-GTE, LS3"
              placeholderTextColor="#666"
              value={carForm.engine}
              onChangeText={(text) => setCarForm({ ...carForm, engine: text })}
            />

            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={styles.modalLabel}>Horsepower</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g., 450"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={carForm.horsepower}
                  onChangeText={(text) => setCarForm({ ...carForm, horsepower: text })}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.modalLabel}>Torque (lb-ft)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g., 410"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  value={carForm.torque}
                  onChangeText={(text) => setCarForm({ ...carForm, torque: text })}
                />
              </View>
            </View>

            <Text style={styles.modalLabel}>Transmission</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., 6-Speed Manual, 10-Speed Auto"
              placeholderTextColor="#666"
              value={carForm.transmission}
              onChangeText={(text) => setCarForm({ ...carForm, transmission: text })}
            />

            <Text style={styles.modalLabel}>Drivetrain</Text>
            <View style={styles.drivetrainOptions}>
              {['RWD', 'FWD', 'AWD', '4WD'].map((dt) => (
                <TouchableOpacity
                  key={dt}
                  style={[
                    styles.drivetrainButton,
                    carForm.drivetrain === dt && styles.drivetrainButtonActive
                  ]}
                  onPress={() => setCarForm({ ...carForm, drivetrain: dt })}
                >
                  <Text style={[
                    styles.drivetrainText,
                    carForm.drivetrain === dt && styles.drivetrainTextActive
                  ]}>{dt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Modifications */}
            <Text style={[styles.modalSectionTitle, { marginTop: 24 }]}>Modifications</Text>

            <Text style={styles.modalLabel}>Modification List</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="List your mods: cold air intake, exhaust, lowering springs, wheels, etc..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={5}
              value={carForm.modificationNotes}
              onChangeText={(text) => setCarForm({ ...carForm, modificationNotes: text })}
              textAlignVertical="top"
            />

            {/* Photos */}
            <Text style={[styles.modalSectionTitle, { marginTop: 24 }]}>Photos</Text>
            
            <Text style={styles.modalLabel}>Photos (Max 10)</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={onPickPhoto}>
              <Ionicons name="images" size={24} color="#ffffff" />
              <Text style={styles.uploadButtonText}>Upload Photos</Text>
            </TouchableOpacity>
            <Text style={styles.photoHint}>
              Tip: Tap the star to set a cover photo. Tap X to delete.
            </Text>

            {carPhotos.length > 0 && (
              <View style={styles.photosPreview}>
                {carPhotos.map((photo, index) => (
                  <View key={index} style={[
                    styles.photoContainer,
                    index === mainPhotoIndex && styles.photoContainerMain,
                  ]}>
                    <Image source={{ uri: photo }} style={styles.photoPreview} />
                    {/* Cover badge */}
                    {index === mainPhotoIndex && (
                      <View style={styles.coverBadge}>
                        <Text style={styles.coverBadgeText}>COVER</Text>
                      </View>
                    )}
                    {/* Set as Cover button */}
                    <TouchableOpacity
                      style={[
                        styles.setCoverButton,
                        index === mainPhotoIndex && styles.setCoverButtonActive,
                      ]}
                      onPress={() => setMainPhotoIndex(index)}
                    >
                      <Ionicons 
                        name={index === mainPhotoIndex ? "star" : "star-outline"} 
                        size={18} 
                        color={index === mainPhotoIndex ? "#FFD700" : "#fff"} 
                      />
                    </TouchableOpacity>
                    {/* Delete button */}
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => onRemovePhoto(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Videos */}
            <Text style={[styles.modalSectionTitle, { marginTop: 24 }]}>Videos</Text>
            
            <Text style={styles.modalLabel}>Video Links (Max 5)</Text>
            <Text style={styles.modalHint}>Add YouTube or other video links to show off your car</Text>
            
            <View style={styles.videoInputRow}>
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor="#666"
                value={newVideoUrl}
                onChangeText={setNewVideoUrl}
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.addVideoButton} onPress={onAddVideo}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {videoUrls.length > 0 && (
              <View style={styles.videoList}>
                {videoUrls.map((url, index) => (
                  <View key={index} style={styles.videoItem}>
                    <Ionicons name="videocam" size={20} color="#9C27B0" />
                    <Text style={styles.videoUrl} numberOfLines={1}>{url}</Text>
                    <TouchableOpacity onPress={() => onRemoveVideo(index)}>
                      <Ionicons name="close-circle" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Social & Visibility */}
            <Text style={[styles.modalSectionTitle, { marginTop: 24 }]}>Social & Visibility</Text>

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              placeholder="Tell us about your ride, its story, future plans..."
              placeholderTextColor="#666"
              multiline
              numberOfLines={4}
              value={carForm.description}
              onChangeText={(text) => setCarForm({ ...carForm, description: text })}
              textAlignVertical="top"
            />

            <Text style={styles.modalLabel}>Instagram Handle</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="@yourusername"
              placeholderTextColor="#666"
              value={carForm.instagramHandle}
              onChangeText={(text) => setCarForm({ ...carForm, instagramHandle: text })}
              autoCapitalize="none"
            />

            <Text style={styles.modalLabel}>YouTube Channel URL</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="https://youtube.com/@yourchannel"
              placeholderTextColor="#666"
              value={carForm.youtubeChannel}
              onChangeText={(text) => setCarForm({ ...carForm, youtubeChannel: text })}
              autoCapitalize="none"
            />

            <View style={[
              styles.publicToggleContainer,
              { borderColor: garagePublic ? '#4CAF50' : '#ffffff', borderWidth: 1.5 }
            ]}>
              <View style={styles.publicToggleInfo}>
                <View style={[
                  styles.visibilityBadge,
                  { backgroundColor: garagePublic ? 'rgba(76,175,80,0.15)' : 'rgba(255,82,82,0.15)' }
                ]}>
                  <Ionicons 
                    name={garagePublic ? "globe-outline" : "lock-closed"} 
                    size={18} 
                    color={garagePublic ? "#4CAF50" : "#ffffff"} 
                  />
                  <Text style={[
                    styles.visibilityBadgeText,
                    { color: garagePublic ? '#4CAF50' : '#ffffff' }
                  ]}>
                    {garagePublic ? 'PUBLIC' : 'PRIVATE'}
                  </Text>
                </View>
                <Text style={styles.publicToggleHint}>
                  {garagePublic 
                    ? 'Visible to everyone in Community Garages' 
                    : 'Hidden — only you can see your garage'}
                </Text>
              </View>
              <Switch
                value={garagePublic}
                onValueChange={setGaragePublic}
                trackColor={{ false: '#ffffff', true: '#4CAF50' }}
                thumbColor="#fff"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, savingCar && styles.saveButtonDisabled]}
              onPress={onSave}
              disabled={savingCar}
            >
              {savingCar ? (
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <ActivityIndicator color="#fff" />
                  {photoUploadProgress ? (
                    <Text style={{ color: '#fff', fontSize: 12 }}>{photoUploadProgress}</Text>
                  ) : null}
                </View>
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Save Car</Text>
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
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF5500',
    marginBottom: 16,
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
  modalTextArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  drivetrainOptions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  drivetrainButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252525',
  },
  drivetrainButtonActive: {
    backgroundColor: '#FF5500',
    borderColor: '#FF5500',
  },
  drivetrainText: {
    color: '#888',
    fontWeight: '600',
  },
  drivetrainTextActive: {
    color: '#fff',
  },
  uploadButton: {
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  photoHint: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  photosPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  photoContainerMain: {
    borderColor: '#FFD700',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  coverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: 'bold',
  },
  setCoverButton: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 15,
  },
  setCoverButtonActive: {
    backgroundColor: 'rgba(255,215,0,0.3)',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  videoInputRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  addVideoButton: {
    backgroundColor: '#FF5500',
    borderRadius: 12,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoList: {
    marginTop: 12,
    gap: 8,
  },
  videoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  videoUrl: {
    flex: 1,
    color: '#aaa',
    fontSize: 13,
  },
  publicToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  publicToggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  visibilityBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  publicToggleHint: {
    color: '#888',
    fontSize: 12,
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
