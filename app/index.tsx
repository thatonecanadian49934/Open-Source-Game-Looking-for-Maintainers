// Powered by OnSpace.AI
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useGame } from '@/hooks/useGame';
import { Colors } from '@/constants/theme';

export default function IndexScreen() {
  const router = useRouter();
  const { gameState } = useGame();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (gameState?.gameStarted) {
        if (gameState.inElection && gameState.electionTriggered) {
          router.replace('/election');
        } else if (gameState.inLeadershipReview) {
          router.replace('/leadership-review');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        router.replace('/setup');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [gameState?.gameStarted]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
