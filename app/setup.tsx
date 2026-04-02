// Powered by OnSpace.AI
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '@/hooks/useGame';
import { PARTIES, Party } from '@/constants/parties';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';

export default function SetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { startGame } = useGame();
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [step, setStep] = useState<'name' | 'party'>('name');

  const handleStart = () => {
    if (!selectedParty || !playerName.trim()) return;
    startGame(selectedParty.id, playerName.trim());
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Hero */}
      <View style={styles.hero}>
        <Image
          source={require('@/assets/images/parliament_hero.jpg')}
          style={styles.heroBg}
          contentFit="cover"
        />
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <Text style={styles.mapleLeaf}>🍁</Text>
          <Text style={styles.heroTitle}>Fantasy Parliament</Text>
          <Text style={styles.heroSubtitle}>CANADA</Text>
          <Text style={styles.heroTagline}>Lead your party. Shape the nation.</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {step === 'name' ? (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Enter Your Name</Text>
            <Text style={styles.stepSubtitle}>You will serve as party leader in the House of Commons</Text>
            
            <TextInput
              style={styles.nameInput}
              placeholder="e.g., Alexandra Morrison"
              placeholderTextColor={Colors.textMuted}
              value={playerName}
              onChangeText={setPlayerName}
              autoFocus
              returnKeyType="next"
              onSubmitEditing={() => playerName.trim() && setStep('party')}
            />
            
            <Pressable
              onPress={() => playerName.trim() && setStep('party')}
              style={({ pressed }) => [styles.nextBtn, !playerName.trim() && styles.nextBtnDisabled, pressed && { opacity: 0.8 }]}
              disabled={!playerName.trim()}
            >
              <Text style={styles.nextBtnText}>Choose Your Party</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.stepContainer}>
            <Pressable onPress={() => setStep('name')} style={styles.backBtn}>
              <MaterialCommunityIcons name="arrow-left" size={16} color={Colors.textSecondary} />
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>
            
            <Text style={styles.stepTitle}>Choose Your Party</Text>
            <Text style={styles.stepSubtitle}>
              {playerName}, which party will you lead to victory?
            </Text>
            
            <View style={styles.partyGrid}>
              {PARTIES.map(party => {
                const isSelected = selectedParty?.id === party.id;
                return (
                  <Pressable
                    key={party.id}
                    onPress={() => setSelectedParty(party)}
                    style={({ pressed }) => [
                      styles.partyCard,
                      isSelected && { borderColor: party.color, backgroundColor: party.color + '15' },
                      pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <View style={[styles.partyColorBar, { backgroundColor: party.color }]} />
                    <View style={styles.partyCardContent}>
                      <View style={styles.partyCardHeader}>
                        <View style={[styles.shortNameBadge, { backgroundColor: party.color + '33' }]}>
                          <Text style={[styles.shortName, { color: party.color }]}>{party.shortName}</Text>
                        </View>
                        {isSelected ? (
                          <MaterialCommunityIcons name="check-circle" size={20} color={party.color} />
                        ) : null}
                      </View>
                      <Text style={styles.partyName}>{party.name}</Text>
                      <Text style={styles.partyIdeology}>{party.ideology}</Text>
                      <Text style={styles.partyDesc} numberOfLines={2}>{party.description}</Text>
                      
                      <View style={styles.partyStats}>
                        <View style={styles.partyStat}>
                          <MaterialCommunityIcons name="poll" size={12} color={Colors.textMuted} />
                          <Text style={styles.partyStatText}>Base: {party.baseSupport}%</Text>
                        </View>
                        <View style={styles.partyStat}>
                          <MaterialCommunityIcons name="map-marker" size={12} color={Colors.textMuted} />
                          <Text style={styles.partyStatText}>{party.strongProvinces.join(', ')}</Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            
            <Pressable
              onPress={handleStart}
              style={({ pressed }) => [
                styles.startBtn,
                !selectedParty && styles.startBtnDisabled,
                pressed && { opacity: 0.85 },
                selectedParty && { backgroundColor: selectedParty.color },
              ]}
              disabled={!selectedParty}
            >
              <Text style={styles.startBtnText}>
                Begin as {selectedParty?.shortName || '...'} Leader
              </Text>
              <Text style={styles.startBtnSub}>45th Parliament • Week 1</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  hero: {
    height: 220,
    position: 'relative',
    overflow: 'hidden',
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,26,0.65)',
  },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapleLeaf: {
    fontSize: 32,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.extrabold,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  heroSubtitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.primary,
    letterSpacing: 6,
    marginBottom: 8,
  },
  heroTagline: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  stepContainer: {
    gap: Spacing.md,
  },
  stepTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  stepSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  nameInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  partyGrid: {
    gap: Spacing.sm,
  },
  partyCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
  },
  partyColorBar: {
    width: 4,
  },
  partyCardContent: {
    flex: 1,
    padding: Spacing.md,
    gap: 4,
  },
  partyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shortNameBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  shortName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  partyName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  partyIdeology: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  partyDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 16,
    marginTop: 2,
  },
  partyStats: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: 6,
  },
  partyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  partyStatText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  startBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.sm,
    gap: 4,
  },
  startBtnDisabled: {
    opacity: 0.4,
    backgroundColor: Colors.textMuted,
  },
  startBtnText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  startBtnSub: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
  },
});
