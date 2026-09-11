import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/figtree';
import { palette, ToastProvider } from '../src/design-system';
import { AppStateProvider } from '../src/store/AppStateContext';

// Mantiene el splash visible hasta que Figtree este lista, para que ninguna
// pantalla llegue a pintarse con la fuente del sistema.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });

  const onLayout = useCallback(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Si la fuente falla se continua igualmente: es preferible una tipografia
  // de sistema a una pantalla en blanco.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: palette.appBg }} onLayout={onLayout}>
        <AppStateProvider>
          <ToastProvider>
            <Stack
              screenOptions={{
                // Cada pantalla dibuja su propio encabezado (ScreenHeader),
                // como en el diseno.
                headerShown: false,
                contentStyle: { backgroundColor: palette.appBg },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="scanner" options={{ animation: 'fade' }} />
              <Stack.Screen name="analysis/loading" options={{ animation: 'fade' }} />
            </Stack>
          </ToastProvider>
        </AppStateProvider>
      </View>
    </SafeAreaProvider>
  );
}
