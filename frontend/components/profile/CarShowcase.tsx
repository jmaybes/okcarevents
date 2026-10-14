import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface UserCar {
  id: string;
  userId: string;
  make: string;
  model: string;
  year: string;
  color?: string;
  trim?: string;
  engine?: string;
  horsepower?: number;
  description?: string;
  photos: string[];
  videos?: string[];
  modificationNotes?: string;
  mainPhotoIndex?: number;
  isActive?: boolean;
}

interface CarShowcaseProps {
  loading: boolean;
  userCar: UserCar | null;
  userCars: UserCar[];
  onEditCar: () => void;
  onAddSecondCar: () => void;
  onSetActiveCar: (carId: string) => void;
  onOpenModal: () => void;
}

export default function CarShowcase({
  loading,
  userCar,
  userCars,
  onEditCar,
  onAddSecondCar,
  onSetActiveCar,
  onOpenModal,
}: CarShowcaseProps) {
  if (loading) {
    return (
      <View style={styles.carShowcaseSection}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      </View>
    );
  }

  if (!userCar) {
    return (
      <View style={styles.carShowcaseSection}>
        <TouchableOpacity style={styles.addCarCard} onPress={onOpenModal}>
          <View style={styles.nudgeBadge}>
            <Ionicons name="construct" size={12} color="#fff" />
            <Text style={styles.nudgeBadgeText}>FIXED & READY</Text>
          </View>
          <Ionicons name="car-sport" size={56} color="#ffffff" />
          <Text style={styles.addCarTitle}>Set Up Your Garage!</Text>
          <Text style={styles.addCarSubtitle}>
            We&apos;ve fixed the saving issues — your garage will save correctly now. Add your ride with photos, specs, and mods!
          </Text>
          <View style={styles.nudgeButton}>
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.nudgeButtonText}>Get Started</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  const mainPhotoIndex = userCar.mainPhotoIndex && userCar.mainPhotoIndex < userCar.photos.length 
    ? userCar.mainPhotoIndex 
    : 0;

  return (
    <View style={styles.carShowcaseSection}>
      <View style={{ flex: 1 }}>
        <View style={styles.carCard}>
          {userCar.photos && userCar.photos.length > 0 ? (
            <View style={styles.carMainPhotoContainer}>
              <Image 
                source={{ uri: userCar.photos[mainPhotoIndex] }} 
                style={{ width: '100%', height: 260 }} 
                resizeMode="cover" 
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.carPhotoGradient}
              />
              <View style={styles.carPhotoCountBadge}>
                <Ionicons name="images" size={13} color="#fff" />
                <Text style={styles.carPhotoCountText}>
                  {(userCar as any).photoCount || userCar.photos.length}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.viewPicsButton}
                onPress={() => router.push(`/garage/${userCar.id}`)}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={12} color="#fff" />
                <Text style={styles.viewPicsText}>View Pics</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noPhotoContainer}>
              <Ionicons name="car-sport" size={60} color="#333" />
              <Text style={styles.noPhotoText}>Add photos of your ride</Text>
            </View>
          )}
          
          <View style={styles.carInfo}>
            <Text style={styles.carTitle}>
              {userCar.year} {userCar.make} {userCar.model}
            </Text>
            {userCar.trim && (
              <Text style={styles.carTrim}>{userCar.trim}</Text>
            )}
            <View style={styles.carStatsRow}>
              {userCar.color && (
                <View style={[styles.carDetailRow, { flex: 1 }]}>
                  <Ionicons name="color-palette" size={16} color="#888" />
                  <Text style={styles.carDetailText}>{userCar.color}</Text>
                </View>
              )}
              {userCar.horsepower && (
                <View style={[styles.carDetailRow, { flex: 1 }]}>
                  <Ionicons name="flash" size={16} color="#ffffff" />
                  <Text style={styles.carDetailText}>{userCar.horsepower} HP</Text>
                </View>
              )}
            </View>
            {userCar.engine && (
              <View style={styles.carDetailRow}>
                <Ionicons name="speedometer" size={16} color="#2196F3" />
                <Text style={styles.carDetailText}>{userCar.engine}</Text>
              </View>
            )}
            {userCar.modificationNotes && (
              <View style={styles.carDetailRow}>
                <Ionicons name="build" size={16} color="#4CAF50" />
                <Text style={styles.carDetailText}>{userCar.modificationNotes}</Text>
              </View>
            )}
            {userCar.videos && userCar.videos.length > 0 && (
              <View style={styles.carDetailRow}>
                <Ionicons name="videocam" size={16} color="#9C27B0" />
                <Text style={styles.carDetailText}>
                  {userCar.videos.length} video{userCar.videos.length !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
            {userCar.description && (
              <Text style={styles.carDescription}>{userCar.description}</Text>
            )}
          </View>
          
          <View style={styles.garageActionRow}>
            <TouchableOpacity style={styles.editCarButton} onPress={onEditCar}>
              <Ionicons name="pencil" size={16} color="#ffffff" />
              <Text style={styles.editCarButtonText}>Edit Car & Photos</Text>
            </TouchableOpacity>
            {userCars.length < 2 && (
              <TouchableOpacity
                style={styles.addCarInlineBtn}
                onPress={onAddSecondCar}
              >
                <Ionicons name="add-circle-outline" size={18} color="#ffffff" />
                <Text style={styles.addCarInlineText}>2nd Car</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Car Switcher - show all cars */}
        {userCars.length > 1 && (
          <View style={{ marginTop: 12, gap: 6 }}>
            {userCars.map((car) => (
              <TouchableOpacity 
                key={car.id}
                style={[
                  styles.carSwitcherItem,
                  car.isActive && styles.carSwitcherItemActive
                ]}
                onPress={() => {
                  if (!car.isActive) {
                    onSetActiveCar(car.id);
                  }
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <Ionicons 
                    name="car-sport" 
                    size={20} 
                    color={car.isActive ? '#ffffff' : '#666'} 
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.carSwitcherTitle}>
                      {car.year} {car.make} {car.model}
                    </Text>
                    <Text style={styles.carSwitcherSubtitle}>
                      {car.isActive ? 'Active - Displayed in your garage' : 'Tap to set as active'}
                    </Text>
                  </View>
                </View>
                {car.isActive ? (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeBadgeText}>ACTIVE</Text>
                  </View>
                ) : (
                  <Ionicons name="swap-horizontal" size={18} color="#666" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  carShowcaseSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  carMainPhotoContainer: {
    position: 'relative',
  },
  carPhotoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  carPhotoCountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  carPhotoCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  viewPicsButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(255,85,0,0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  viewPicsText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  noPhotoContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#252525',
  },
  noPhotoText: {
    color: '#666',
    marginTop: 8,
    fontSize: 13,
  },
  carInfo: {
    padding: 16,
  },
  carTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  carTrim: {
    fontSize: 14,
    color: '#FF5500',
    marginBottom: 12,
  },
  carStatsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  carDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  carDetailText: {
    color: '#aaa',
    fontSize: 13,
  },
  carDescription: {
    color: '#888',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  garageActionRow: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 10,
  },
  editCarButton: {
    flex: 1,
    backgroundColor: '#FF5500',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  editCarButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  addCarInlineBtn: {
    backgroundColor: '#252525',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addCarInlineText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  addCarCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF5500',
    borderStyle: 'dashed',
  },
  nudgeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  nudgeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  addCarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  addCarSubtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  nudgeButton: {
    marginTop: 16,
    backgroundColor: '#FF5500',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  nudgeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  carSwitcherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  carSwitcherItemActive: {
    backgroundColor: 'rgba(225, 85, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  carSwitcherTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  carSwitcherSubtitle: {
    color: '#888',
    fontSize: 11,
  },
  activeBadge: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
