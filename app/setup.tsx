// Powered by OnSpace.AI — Setup screen with save/load game and new game option
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Platform, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { PARTIES, Party } from '@/constants/parties';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { SavedGame } from '@/contexts/GameContext';

type SetupTab = 'new' | 'load';

export default function SetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { startGame, loadGame, deleteSave, savedGames, resetGame } = useGame();
  const { showAlert } = useAlert();
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [step, setStep] = useState<'name' | 'party'>('name');
  const [activeTab, setActiveTab] = useState<SetupTab>('new');

  const handleStart = () => {
    if (!selectedParty || !playerName.trim()) return;
    startGame(selectedParty.id, playerName.trim());
    router.replace('/(tabs)');
  };

  const handleLoad = (save: SavedGame) => {
    showAlert(
      'Load Game',
      `Resume as ${save.playerName} (${save.partyName}) — Week ${save.week}, Parliament ${save.parliamentNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load',
          onPress: () => {
            loadGame(save.id);
            router.replace('/(tabs)');
          },
        },
      ]
    );
  };

  const handleDeleteSave = (save: SavedGame) => {
    showAlert(
      'Delete Save',
      `Delete this save for ${save.playerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteSave(save.id) },
      ]
    );
  };

  const formatSaveDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Unknown date';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Hero */}
      <View style={styles.hero}>
        <Image source={require('@/assets/images/parliament_hero.jpg')} style={styles.heroBg} contentFit="cover" />
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <Text style={styles.mapleLeaf}>🍁</Text>
          <Text style={styles.heroTitle}>Fantasy Parliament</Text>
          <Text style={styles.heroSubtitle}>CANADA</Text>
          <Text style={styles.heroTagline}>Lead your party. Shape the nation.</Text>
        </View>
      </View>

      {/* Tab selector */}
      <View style={styles.tabRow}>
        <Pressable
          onPress={() => setActiveTab('new')}
          style={[styles.tabBtn, activeTab === 'new' && styles.tabBtnActive]}
        >
          <MaterialCommunityIcons name="plus-circle" size={16} color={activeTab === 'new' ? Colors.primary : Colors.textMuted} />
          <Text style={[styles.tabBtnText, activeTab === 'new' && { color: Colors.primary, fontWeight: FontWeight.bold }]}>New Game</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab('load')}
          style={[styles.tabBtn, activeTab === 'load' && styles.tabBtnActive]}
        >
          <MaterialCommunityIcons name="content-save" size={16} color={activeTab === 'load' ? Colors.gold : Colors.textMuted} />
          <Text style={[styles.tabBtnText, activeTab === 'load' && { color: Colors.gold, fontWeight: FontWeight.bold }]}>
            Load Game {savedGames.length > 0 ? `(${savedGames.length})` : ''}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ── LOAD GAME ── */}
        {activeTab === 'load' ? (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Saved Games</Text>
            {savedGames.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="content-save-off" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No saved games found</Text>
                <Text style={styles.emptySub}>Start a new game and save it from the dashboard.</Text>
                <Pressable onPress={() => setActiveTab('new')} style={styles.newGameBtn}>
                  <Text style={styles.newGameBtnText}>Start New Game</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.savesList}>
                {savedGames.map(save => {
                  const party = PARTIES.find(p => p.name === save.partyName || p.id === save.gameState.playerPartyId);
                  return (
                    <Pressable
                      key={save.id}
                      onPress={() => handleLoad(save)}
                      style={({ pressed }) => [styles.saveCard, pressed && { opacity: 0.85 }]}
                    >
                      <View style={[styles.savePartyBar, { backgroundColor: party?.color || Colors.primary }]} />
                      <View style={styles.saveCardContent}>
                        <View style={styles.saveCardHeader}>
                          <View>
                            <Text style={styles.savePlayerName}>{save.playerName}</Text>
                            <Text style={[styles.saveParty, { color: party?.color || Colors.primary }]}>{save.partyName}</Text>
                          </View>
                          <View style={styles.saveCardRight}>
                            <View style={[styles.govBadge, { backgroundColor: save.isGoverning ? Colors.success + '22' : Colors.warning + '22' }]}>
                              <Text style={[styles.govBadgeText, { color: save.isGoverning ? Colors.success : Colors.warning }]}>
                                {save.isGoverning ? 'GOVERNING' : 'OPPOSITION'}
                              </Text>
                            </View>
                            <Pressable
                              onPress={(e) => { e.stopPropagation(); handleDeleteSave(save); }}
                              style={styles.deleteBtn}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <MaterialCommunityIcons name="delete-outline" size={16} color={Colors.error} />
                            </Pressable>
                          </View>
                        </View>
                        <View style={styles.saveStats}>
                          <View style={styles.saveStat}>
                            <MaterialCommunityIcons name="calendar" size={11} color={Colors.textMuted} />
                            <Text style={styles.saveStatText}>Week {save.week}</Text>
                          </View>
                          <View style={styles.saveStat}>
                            <MaterialCommunityIcons name="domain" size={11} color={Colors.textMuted} />
                            <Text style={styles.saveStatText}>Parliament {save.parliamentNumber}</Text>
                          </View>
                          <View style={styles.saveStat}>
                            <MaterialCommunityIcons name="clock-outline" size={11} color={Colors.textMuted} />
                            <Text style={styles.saveStatText}>{formatSaveDate(save.savedAt)}</Text>
                          </View>
                        </View>
                      </View>
                      <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.textMuted} />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {/* ── NEW GAME ── */}
        {activeTab === 'new' ? (
          <View style={styles.stepContainer}>
            {step === 'name' ? (
              <>
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
              </>
            ) : (
              <>
                <Pressable onPress={() => setStep('name')} style={styles.backBtn}>
                  <MaterialCommunityIcons name="arrow-left" size={16} color={Colors.textSecondary} />
                  <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
                <Text style={styles.stepTitle}>Choose Your Party</Text>
                <Text style={styles.stepSubtitle}>{playerName}, which party will you lead?</Text>
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
                            {isSelected ? <MaterialCommunityIcons name="check-circle" size={20} color={party.color} /> : null}
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
                              <Text style={styles.partyStatText}>{party.strongProvinces.slice(0, 2).join(', ')}</Text>
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
                  <Text style={styles.startBtnText}>Begin as {selectedParty?.shortName || '...'} Leader</Text>
                  <Text style={styles.startBtnSub}>45th Parliament • Week 1</Text>
                </Pressable>
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  hero: { height: 200, position: 'relative', overflow: 'hidden' },
  heroBg: { ...StyleSheet.absoluteFillObject },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,14,26,0.65)' },
  heroContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapleLeaf: { fontSize: 30, marginBottom: 6 },
  heroTitle: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extrabold, color: Colors.textPrimary, letterSpacing: 2 },
  heroSubtitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.primary, letterSpacing: 6, marginBottom: 6 },
  heroTagline: { fontSize: FontSize.sm, color: Colors.textSecondary },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: Colors.gold },
  tabBtnText: { fontSize: FontSize.sm, color: Colors.textMuted },
  content: { flex: 1 },
  contentContainer: { padding: Spacing.md, paddingBottom: 40 },
  stepContainer: { gap: Spacing.md },
  stepTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginTop: Spacing.sm },
  stepSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  nameInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.lg, color: Colors.textPrimary, marginTop: Spacing.sm },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.md, marginTop: Spacing.sm },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backBtnText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  partyGrid: { gap: Spacing.sm },
  partyCard: { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: 'hidden' },
  partyColorBar: { width: 4 },
  partyCardContent: { flex: 1, padding: Spacing.md, gap: 4 },
  partyCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shortNameBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  shortName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 1 },
  partyName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  partyIdeology: { fontSize: FontSize.xs, color: Colors.textSecondary, fontStyle: 'italic' },
  partyDesc: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 16, marginTop: 2 },
  partyStats: { flexDirection: 'row', gap: Spacing.md, marginTop: 6 },
  partyStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  partyStatText: { fontSize: FontSize.xs, color: Colors.textMuted },
  startBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: Spacing.lg, marginTop: Spacing.sm, gap: 4 },
  startBtnDisabled: { opacity: 0.4, backgroundColor: Colors.textMuted },
  startBtnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: '#fff' },
  startBtnSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
  // Load game
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  emptyText: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  emptySub: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  newGameBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: Radius.md, marginTop: Spacing.sm },
  newGameBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  savesList: { gap: Spacing.sm },
  saveCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: 'hidden' },
  savePartyBar: { width: 4, alignSelf: 'stretch' },
  saveCardContent: { flex: 1, padding: Spacing.md, gap: 8 },
  saveCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  savePlayerName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  saveParty: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, marginTop: 2 },
  saveCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  govBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  govBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  deleteBtn: { padding: 4 },
  saveStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  saveStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  saveStatText: { fontSize: FontSize.xs, color: Colors.textMuted },
});
