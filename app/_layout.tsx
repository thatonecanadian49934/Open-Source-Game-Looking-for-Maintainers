// Powered by OnSpace.AI
import { AlertProvider } from '@/template';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { GameProvider } from '@/contexts/GameContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <GameProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0a0e1a' },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="setup" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="election" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="debate" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="bill-detail" options={{ presentation: 'modal' }} />
            <Stack.Screen name="question-period" options={{ presentation: 'modal' }} />
            <Stack.Screen name="press-statement" options={{ presentation: 'modal' }} />
            <Stack.Screen name="policy" options={{ presentation: 'modal' }} />
            <Stack.Screen name="leadership-review" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="create-bill" options={{ presentation: 'modal' }} />
            <Stack.Screen name="foreign-policy" options={{ presentation: 'modal' }} />
            <Stack.Screen name="parliamentary-schedule" options={{ presentation: 'modal' }} />
            <Stack.Screen name="by-election" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="party-leader-contact" options={{ presentation: 'modal' }} />
            <Stack.Screen name="leadership-race" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="leadership-convention" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="cabinet-scandal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="supreme-court" options={{ presentation: 'modal' }} />
          </Stack>
        </GameProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
