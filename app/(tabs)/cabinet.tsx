// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES, MINISTERS_LIST, PARLIAMENTARY_SECRETARY_LIST } from '@/constants/parties';

type CabinetView = 'ministers' | 'secretaries' | 'instruct';

export default function CabinetScreen() {
  const insets = useSafeAreaInsets();
  const { gameState, appointMinister, fireMinister, instructMinister } = useGame();
  const { showAlert } = useAlert();
  const [view, setView] = useState<CabinetView>('ministers');
  const [appointingFor, setAppointingFor] = useState<string | null>(null);
  const [newMinisterName, setNewMinisterName] = useState('');
  const [selectedMinister, setSelectedMinister] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);

  if (!gameState.isGoverning) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cabinet</Text>
          <Text style={styles.headerSub}>Shadow Cabinet — Opposition</Text>
        </View>
        <View style={styles.notGoverningContainer}>
          <MaterialCommunityIcons name="briefcase-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.notGoverningTitle}>In Opposition</Text>
          <Text style={styles.notGoverningText}>
            Your party is currently in opposition. Win a majority government to form a full cabinet. 
            You can still shadow each portfolio and critique the government.
          </Text>
          {/* Shadow Cabinet */}
          <View style={styles.shadowCabinet}>
            <Text style={styles.shadowCabinetTitle}>SHADOW CABINET</Text>
            {MINISTERS_LIST.map((portfolio, idx) => (
              <View key={portfolio} style={styles.shadowMinisterRow}>
                <MaterialCommunityIcons name="account-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.shadowPortfolio}>Shadow {portfolio}</Text>
                <Text style={styles.shadowMinisterName}>
                  MP {['Chen', 'Williams', 'MacDonald', 'Singh', 'Park', 'Okafor', 'Leblanc', 'Kumar', 'Mitchell', 'Tremblay'][idx % 10]}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  const handleAppointMinister = () => {
    if (!appointingFor || !newMinisterName.trim()) return;
    appointMinister(appointingFor, newMinisterName.trim());
    setAppointingFor(null);
    setNewMinisterName('');
    showAlert('Minister Appointed', `${newMinisterName.trim()} has been appointed as Minister of ${appointingFor}.`);
  };

  const handleFireMinister = (portfolio: string) => {
    const minister = gameState.cabinet.find(m => m.portfolio === portfolio);
    if (!minister) return;
    showAlert(
      `Fire ${minister.name}?`,
      `This will remove ${minister.name} from the ${portfolio} portfolio. This may affect party morale.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fire Minister',
          style: 'destructive',
          onPress: () => {
            fireMinister(portfolio);
            showAlert('Minister Dismissed', `${minister.name} has been removed from Cabinet.`);
          },
        },
      ]
    );
  };

  const handleSendInstruction = () => {
    if (!selectedMinister || !instruction.trim()) return;
    instructMinister(selectedMinister, instruction.trim());
    showAlert(
      'Directive Sent',
      `Your directive has been sent to the ${selectedMinister} portfolio. This will be reflected in the next news cycle.`
    );
    setInstruction('');
    setSelectedMinister(null);
  };

  const allPortfolios = [...MINISTERS_LIST, ...PARLIAMENTARY_SECRETARY_LIST];

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Cabinet</Text>
          <Text style={styles.headerSub}>
            {gameState.isMajority ? 'Majority Government' : 'Minority Government'} — {party?.shortName}
          </Text>
        </View>
        <View style={[styles.cabinetSizeBadge, { backgroundColor: party?.color + '22', borderColor: party?.color + '44' }]}>
          <Text style={[styles.cabinetSizeText, { color: party?.color }]}>
            {gameState.cabinet.length} Ministers
          </Text>
        </View>
      </View>

      {/* View Tabs */}
      <View style={styles.viewTabs}>
        {([
          { id: 'ministers', label: 'Ministers' },
          { id: 'secretaries', label: 'Parl. Secretaries' },
          { id: 'instruct', label: 'Directives' },
        ] as { id: CabinetView; label: string }[]).map(tab => (
          <Pressable
            key={tab.id}
            onPress={() => setView(tab.id)}
            style={[styles.viewTab, view === tab.id && styles.viewTabActive]}
          >
            <Text style={[styles.viewTabText, view === tab.id && styles.viewTabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {view === 'ministers' ? (
          <View style={styles.ministerList}>
            {MINISTERS_LIST.map(portfolio => {
              const minister = gameState.cabinet.find(m => m.portfolio === portfolio);
              const isAppointing = appointingFor === portfolio;
              
              return (
                <View key={portfolio} style={styles.ministerCard}>
                  <View style={styles.ministerCardHeader}>
                    <View style={styles.portfolioInfo}>
                      <MaterialCommunityIcons 
                        name={getPortfolioIcon(portfolio)} 
                        size={20} 
                        color={minister ? (party?.color || Colors.gold) : Colors.textMuted} 
                      />
                      <View>
                        <Text style={styles.portfolioTitle}>Ministry of {portfolio}</Text>
                        {minister ? (
                          <Text style={[styles.ministerName, { color: party?.color }]}>{minister.name}</Text>
                        ) : (
                          <Text style={styles.vacantLabel}>VACANT</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.ministerActions}>
                      {minister ? (
                        <>
                          <Pressable
                            onPress={() => { setSelectedMinister(portfolio); setView('instruct'); }}
                            style={({ pressed }) => [styles.actionIconBtn, pressed && { opacity: 0.7 }]}
                          >
                            <MaterialCommunityIcons name="message-text" size={16} color={Colors.info} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleFireMinister(portfolio)}
                            style={({ pressed }) => [styles.actionIconBtn, pressed && { opacity: 0.7 }]}
                          >
                            <MaterialCommunityIcons name="account-remove" size={16} color={Colors.error} />
                          </Pressable>
                        </>
                      ) : (
                        <Pressable
                          onPress={() => setAppointingFor(isAppointing ? null : portfolio)}
                          style={({ pressed }) => [styles.appointBtn, pressed && { opacity: 0.8 }]}
                        >
                          <Text style={styles.appointBtnText}>Appoint</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                  
                  {minister ? (
                    <View style={styles.ministerStats}>
                      <View style={styles.ministerStat}>
                        <Text style={styles.ministerStatLabel}>Loyalty</Text>
                        <View style={styles.ministerStatBar}>
                          <View style={[
                            styles.ministerStatFill,
                            { width: `${minister.loyalty}%` as any, backgroundColor: minister.loyalty > 60 ? Colors.success : Colors.warning }
                          ]} />
                        </View>
                        <Text style={styles.ministerStatValue}>{minister.loyalty}%</Text>
                      </View>
                      <View style={styles.ministerStat}>
                        <Text style={styles.ministerStatLabel}>Competence</Text>
                        <View style={styles.ministerStatBar}>
                          <View style={[
                            styles.ministerStatFill,
                            { width: `${minister.competence}%` as any, backgroundColor: Colors.info }
                          ]} />
                        </View>
                        <Text style={styles.ministerStatValue}>{minister.competence}%</Text>
                      </View>
                    </View>
                  ) : null}
                  
                  {isAppointing ? (
                    <View style={styles.appointForm}>
                      <TextInput
                        style={styles.appointInput}
                        placeholder="Enter minister's full name..."
                        placeholderTextColor={Colors.textMuted}
                        value={newMinisterName}
                        onChangeText={setNewMinisterName}
                        autoFocus
                      />
                      <Pressable
                        onPress={handleAppointMinister}
                        style={({ pressed }) => [styles.confirmAppointBtn, pressed && { opacity: 0.8 }]}
                      >
                        <Text style={styles.confirmAppointText}>Confirm Appointment</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : view === 'secretaries' ? (
          <View style={styles.ministerList}>
            {PARLIAMENTARY_SECRETARY_LIST.map(portfolio => (
              <View key={portfolio} style={styles.ministerCard}>
                <View style={styles.ministerCardHeader}>
                  <View style={styles.portfolioInfo}>
                    <MaterialCommunityIcons name="account-tie" size={20} color={Colors.textSecondary} />
                    <Text style={styles.portfolioTitle}>{portfolio}</Text>
                  </View>
                  <View style={[styles.vacantBadge]}>
                    <Text style={styles.vacantBadgeText}>APPOINTED</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.instructSection}>
            <Text style={styles.instructTitle}>Issue Ministerial Directive</Text>
            <Text style={styles.instructSubtitle}>
              Send direct instructions to any cabinet minister. Your directive will be reflected in upcoming policy and news.
            </Text>
            
            <Text style={styles.selectLabel}>SELECT PORTFOLIO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                {MINISTERS_LIST.map(portfolio => (
                  <Pressable
                    key={portfolio}
                    onPress={() => setSelectedMinister(portfolio)}
                    style={[
                      styles.portfolioChip,
                      selectedMinister === portfolio && { borderColor: party?.color, backgroundColor: (party?.color || Colors.gold) + '22' }
                    ]}
                  >
                    <Text style={[
                      styles.portfolioChipText,
                      selectedMinister === portfolio && { color: party?.color || Colors.gold }
                    ]}>
                      {portfolio}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            
            {selectedMinister ? (
              <View style={styles.instructForm}>
                <Text style={styles.selectedPortfolioLabel}>
                  Directive to Ministry of {selectedMinister}:
                </Text>
                <TextInput
                  style={styles.instructInput}
                  multiline
                  numberOfLines={5}
                  placeholder={`e.g., "Prioritize review of immigration processing times and submit a report to Cabinet within 30 days..."`}
                  placeholderTextColor={Colors.textMuted}
                  value={instruction}
                  onChangeText={setInstruction}
                  textAlignVertical="top"
                />
                <Pressable
                  onPress={handleSendInstruction}
                  disabled={!instruction.trim()}
                  style={({ pressed }) => [
                    styles.sendInstructBtn,
                    !instruction.trim() && { opacity: 0.4 },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <MaterialCommunityIcons name="send" size={16} color="#fff" />
                  <Text style={styles.sendInstructText}>Issue Directive</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.selectPortfolioPrompt}>
                <MaterialCommunityIcons name="briefcase-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.selectPortfolioText}>Select a portfolio above to issue a directive</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function getPortfolioIcon(portfolio: string): any {
  const icons: Record<string, string> = {
    'Finance': 'cash-multiple',
    'Foreign Affairs': 'earth',
    'Immigration': 'account-arrow-right',
    'Public Safety': 'shield-account',
    'Defence': 'shield',
    'Health': 'hospital-box',
    'Environment': 'leaf',
    'Justice': 'scale-balance',
    'Treasury Board': 'bank',
    'Transport': 'train-car',
  };
  return icons[portfolio] || 'briefcase';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  cabinetSizeBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  cabinetSizeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
  },
  viewTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  viewTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  viewTabActive: {
    borderBottomColor: Colors.gold,
  },
  viewTabText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textMuted,
  },
  viewTabTextActive: {
    color: Colors.gold,
    fontWeight: FontWeight.bold,
  },
  content: {
    padding: Spacing.md,
  },
  ministerList: {
    gap: Spacing.sm,
  },
  ministerCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  ministerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  portfolioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  portfolioTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  ministerName: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
  vacantLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.error,
    letterSpacing: 0.5,
  },
  vacantBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.success + '22',
  },
  vacantBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    color: Colors.success,
  },
  ministerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
  },
  appointBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: Colors.gold + '22',
    borderWidth: 1,
    borderColor: Colors.gold + '44',
  },
  appointBtnText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.gold,
  },
  ministerStats: {
    gap: 6,
  },
  ministerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ministerStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    width: 70,
  },
  ministerStatBar: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.surfaceBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  ministerStatFill: {
    height: '100%',
    borderRadius: 2,
  },
  ministerStatValue: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    minWidth: 30,
    textAlign: 'right',
  },
  appointForm: {
    gap: 8,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  appointInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  confirmAppointBtn: {
    backgroundColor: Colors.success,
    borderRadius: Radius.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmAppointText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  notGoverningContainer: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  notGoverningTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  notGoverningText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  shadowCabinet: {
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: 8,
  },
  shadowCabinetTitle: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  shadowMinisterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shadowPortfolio: {
    flex: 1,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  shadowMinisterName: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  instructSection: {
    gap: Spacing.md,
  },
  instructTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  instructSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  selectLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  portfolioChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceElevated,
  },
  portfolioChipText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
  },
  instructForm: {
    gap: Spacing.sm,
  },
  selectedPortfolioLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  instructInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 120,
    lineHeight: 22,
  },
  sendInstructBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  sendInstructText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  selectPortfolioPrompt: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: Spacing.sm,
  },
  selectPortfolioText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
