import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BetaNoticeModal from '../components/BetaNoticeModal';
import { useEffect, useCallback } from 'react';
import * as Updates from 'expo-updates';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import * as Font from 'expo-font';
import { Alert, Platform, View } from 'react-native';

// Prevent splash screen from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync();

async function checkForUpdates() {
  if (__DEV__) return; // Skip in development
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      await Updates.fetchUpdateAsync();
      Alert.alert(
        'Update Available',
        'A new version has been downloaded. Restart to apply?',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Restart', onPress: () => Updates.reloadAsync() },
        ]
      );
    }
  } catch (e) {
    // Silent fail - don't bother user
    console.log('Update check failed:', e);
  }
}

export default function RootLayout() {
  // Load fonts with multiple name mappings for Android compatibility
  const [fontsLoaded, fontError] = useFonts({
    // Primary names
    'RockSalt': require('../assets/fonts/RockSalt.ttf'),
    'RobotoCondensed': require('../assets/fonts/RobotoCondensed.ttf'),
    // PostScript names (Android sometimes needs these)
    'RockSalt-Regular': require('../assets/fonts/RockSalt.ttf'),
    'RobotoCondensed-Regular': require('../assets/fonts/RobotoCondensed.ttf'),
    // Family names with spaces (as specified in font metadata)
    'Rock Salt': require('../assets/fonts/RockSalt.ttf'),
    'Roboto Condensed': require('../assets/fonts/RobotoCondensed.ttf'),
  });

  useEffect(() => {
    // Debug: Log font loading status
    if (fontsLoaded) {
      console.log('Fonts loaded successfully');
      console.log('Loaded fonts:', Font.isLoaded('RockSalt'), Font.isLoaded('RockSalt-Regular'), Font.isLoaded('Rock Salt'));
    }
    if (fontError) {
      console.error('Font loading error:', fontError);
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }
  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <AuthProvider>
        <Stack 
          screenOptions={{ 
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 250,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Stack.Screen 
            name="(tabs)" 
            options={{ 
              headerShown: false,
              animation: 'fade',
            }} 
          />
          <Stack.Screen 
            name="event/[id]/index" 
            options={{ 
              headerShown: false,
              animation: 'slide_from_bottom',
              animationDuration: 300,
            }} 
          />
          <Stack.Screen 
            name="auth/login" 
            options={{ 
              headerShown: false,
              animation: 'fade_from_bottom',
              animationDuration: 300,
            }} 
          />
          <Stack.Screen 
            name="auth/register" 
            options={{ 
              headerShown: false,
              animation: 'slide_from_right',
            }} 
          />
        </Stack>
        <BetaNoticeModal />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
