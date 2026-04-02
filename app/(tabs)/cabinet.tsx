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

type CabinetView = 'ministers' | 'secretaries' | 'instruct' | 'shadow';

function getPortfolioIcon(portfolio: string): any {
  const icons: Record<string, string> = {
    Finance: 'cash-multiple',
    'Foreign Affairs': 'earth',
    Immigration: 'account-arrow-right',
    'Public Safety': 'shield-account',
    Defence: 'shield',
    Health: 'hospital-box',
    Environment: 'leaf',
    Justice: 'scale-balance',
    'Treasury Board': 'bank',
    Transport: 'train-car',
  };
  return icons[portfolio] || 'briefcase';
}

// Suggested shadow minister names per portfolio (for quick appointment)
const SHADOW_SUGGESTIONS: Record<string, string[]> = {
  Finance: ['MP Alan Trudel', 'MP Dana Foster', 'MP Ravi Patel'],
  'Foreign Affairs': ['MP Michelle Chen', 'MP Brian Walters', 'MP Nadia Osman'],
  Immigration: ['MP Sofia Reyes', 'MP James Mackenzie', 'MP Priya Nair'],
  'Public Safety': ['MP Robert Gault', 'MP Karen Singh', 'MP André Bouchard'],
  Defence: ['MP Colonel (ret.) David Harris', 'MP Lisa Park', 'MP Tom Lacroix'],
  Health: ['MP Dr. Emily Walsh', 'MP Frank Ibrahim', 'MP Monique Tremblay'],
  Environment: ['MP Sarah Greenwood', 'MP Pierre LeBlanc', 'MP Aisha Muthoni'],
  Justice: ['MP Hon. Mark Chen', 'MP Valerie Okafor', 'MP Patrick Ross'],
  'Treasury Board': ['MP Sandra Kim', 'MP David Osei', 'MP Claire Beaumont'],
  Transport: ['MP George Paulsen', 'MP Natasha Vidal', 'MP Ibrahim Sow'],
};

export default function CabinetScreen() {
  const insets = useSafeAreaInsets();
  const { gameState, shadowCabinet, appointMinister, fireMinister, instructMinister, appointShadowMinister, removeShadowMinister } = useGame();
  const { showAlert } = useAlert();

  const [view, setView] = useState<CabinetView>('ministers');
  const [appointingFor, setAppointingFor] = useState<string | null>(null);
  const [newMinisterName, setNewMinisterName] = useState('');
  const [selectedMinister, setSelectedMinister] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');

  // Shadow cabinet state
  const [shadowAppointingFor, setShadowAppointingFor] = useState<string | null>(null);
  const [shadowMinisterName, setShadowMinisterName] = useState('');

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;

  // ── Governing: appoint minister ────────────────────────────────────────────
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
      `Remove ${minister.name} from the ${portfolio} portfolio. This may affect party morale.`,
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
    showAlert('Directive Sent', `Your directive has been sent to the ${selectedMinister} portfolio. AI news will reflect this in the news tab.`);
    setInstruction('');
    setSelectedMinister(null);
  };

  // ── Shadow cabinet ─────────────────────────────────────────────────────────
  const handleAppointShadow = () => {
    if (!shadowAppointingFor || !shadowMinisterName.trim()) return;
    appointShadowMinister(shadowAppointingFor, shadowMinisterName.trim());
    setShadowAppointingFor(null);
    setShadowMinisterName('');
    showAlert('Shadow Minister Appointed', `${shadowMinisterName.trim()} will serve as Shadow Minister for ${shadowAppointingFor}, providing official opposition critique of that portfolio.`);
  };

  const handleRemoveShadow = (portfolio: string) => {
    const member = shadowCabinet.find(m => m.portfolio === portfolio);
    if (!member) return;
    showAlert(
      `Remove ${member.name}?`,
      `Remove from the Shadow ${portfolio} portfolio.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeShadowMinister(portfolio),
        },
      ]
    );
  };

  const isGoverning = gameState.isGoverning;

  const tabs: { id: CabinetView; label: string; icon: string }[] = isGoverning
    ? [
        { id: 'ministers',   label: 'Ministers',    icon: 'briefcase' },
        { id: 'secretaries', label: 'Parl. Sec.',   icon: 'account-tie' },
        { id: 'instruct',    label: 'Directives',   icon: 'message-text' },
      ]
    : [
        { id: 'shadow',      label: 'Shadow Cabinet', icon: 'account-group' },
      ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {isGoverning ? 'Cabinet' : 'Shadow Cabinet'}
          </Text>
          <Text style={styles.headerSub}>
            {isGoverning
              ? `${gameState.isMajority ? 'Majority' : 'Minority'} Government — ${party?.shortName}`
              : `Official Opposition — ${party?.shortName}`}
          </Text>
        </View>
        <View style={[styles.cabinetSizeBadge, { backgroundColor: partyColor + '22', borderColor: partyColor + '44' }]}>
          <Text style={[styles.cabinetSizeText, { color: partyColor }]}>
            {isGoverning ? `${gameState.cabinet.length} Ministers` : `${shadowCabinet.length} / ${MINISTERS_LIST.length} Shadow`}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.viewTabs}>
        {tabs.map(tab => (
          <Pressable
            key={tab.id}
            onPress={() => setView(tab.id)}
            style={[styles.viewTab, view === tab.id && [styles.viewTabActive, { borderBottomColor: partyColor }]]}
          >
            <MaterialCommunityIcons
              name={tab.icon as any}
              size={14}
              color={view === tab.id ? partyColor : Colors.textMuted}
            />
            <Text style={[styles.viewTabText, view === tab.id && { color: partyColor, fontWeight: FontWeight.bold }]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ══ GOVERNING: Ministers ══ */}
        {view === 'ministers' && isGoverning ? (
          <View style={styles.ministerList}>
            {MINISTERS_LIST.map(portfolio => {
              const minister = gameState.cabinet.find(m => m.portfolio === portfolio);
              const isAppointing = appointingFor === portfolio;

              return (
                <View key={portfolio} style={styles.ministerCard}>
                  <View style={styles.ministerCardHeader}>
                    <View style={styles.portfolioInfo}>
                      <View style={[styles.portfolioIcon, { backgroundColor: partyColor + '22' }]}>
                        <MaterialCommunityIcons name={getPortfolioIcon(portfolio)} size={18} color={partyColor} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.portfolioTitle}>Ministry of {portfolio}</Text>
                        {minister ? (
                          <Text style={[styles.ministerName, { color: partyColor }]}>{minister.name}</Text>
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
                            <MaterialCommunityIcons name="message-text" size={15} color={Colors.info} />
                          </Pressable>
                          <Pressable
                            onPress={() => handleFireMinister(portfolio)}
                            style={({ pressed }) => [styles.actionIconBtn, pressed && { opacity: 0.7 }]}
                          >
                            <MaterialCommunityIcons name="account-remove" size={15} color={Colors.error} />
                          </Pressable>
                        </>
                      ) : (
                        <Pressable
                          onPress={() => setAppointingFor(isAppointing ? null : portfolio)}
                          style={({ pressed }) => [styles.appointBtn, { borderColor: partyColor + '55', backgroundColor: partyColor + '11' }, pressed && { opacity: 0.8 }]}
                        >
                          <Text style={[styles.appointBtnText, { color: partyColor }]}>Appoint</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {minister ? (
                    <View style={styles.ministerStats}>
                      <View style={styles.ministerStat}>
                        <Text style={styles.ministerStatLabel}>Loyalty</Text>
                        <View style={styles.ministerStatBar}>
                          <View style={[styles.ministerStatFill, {
                            width: `${minister.loyalty}%` as any,
                            backgroundColor: minister.loyalty > 60 ? Colors.success : Colors.warning,
                          }]} />
                        </View>
                        <Text style={styles.ministerStatValue}>{minister.loyalty}%</Text>
                      </View>
                      <View style={styles.ministerStat}>
                        <Text style={styles.ministerStatLabel}>Competence</Text>
                        <View style={styles.ministerStatBar}>
                          <View style={[styles.ministerStatFill, {
                            width: `${minister.competence}%` as any,
                            backgroundColor: Colors.info,
                          }]} />
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
                        style={({ pressed }) => [styles.confirmAppointBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.8 }]}
                      >
                        <Text style={styles.confirmAppointText}>Confirm Appointment</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        {/* ══ GOVERNING: Parliamentary Secretaries ══ */}
        {view === 'secretaries' && isGoverning ? (
          <View style={styles.ministerList}>
            <View style={styles.sectionNote}>
              <MaterialCommunityIcons name="information" size={13} color={Colors.info} />
              <Text style={styles.sectionNoteText}>
                Parliamentary Secretaries assist Cabinet Ministers and represent portfolios in the House. They are automatically managed.
              </Text>
            </View>
            {PARLIAMENTARY_SECRETARY_LIST.map((portfolio, idx) => (
              <View key={portfolio} style={styles.ministerCard}>
                <View style={styles.ministerCardHeader}>
                  <View style={styles.portfolioInfo}>
                    <View style={[styles.portfolioIcon, { backgroundColor: Colors.info + '22' }]}>
                      <MaterialCommunityIcons name="account-tie" size={18} color={Colors.info} />
                    </View>
                    <View>
                      <Text style={styles.portfolioTitle}>{portfolio}</Text>
                      <Text style={[styles.ministerName, { color: Colors.info }]}>
                        MP {['Chen', 'Williams', 'MacDonald', 'Singh', 'Park'][idx % 5]}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.appointedBadge}>
                    <Text style={styles.appointedBadgeText}>APPOINTED</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* ══ GOVERNING: Ministerial Directives ══ */}
        {view === 'instruct' && isGoverning ? (
          <View style={styles.instructSection}>
            <View style={styles.instructHeader}>
              <Text style={styles.instructTitle}>Issue Ministerial Directive</Text>
              <Text style={styles.instructSubtitle}>
                Send direct instructions to any cabinet minister. AI will generate realistic news coverage reflecting your directive.
              </Text>
            </View>

            <Text style={styles.selectLabel}>SELECT PORTFOLIO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
                {MINISTERS_LIST.map(portfolio => {
                  const minister = gameState.cabinet.find(m => m.portfolio === portfolio);
                  return (
                    <Pressable
                      key={portfolio}
                      onPress={() => setSelectedMinister(portfolio)}
                      style={[
                        styles.portfolioChip,
                        selectedMinister === portfolio && { borderColor: partyColor, backgroundColor: partyColor + '22' },
                        !minister && { opacity: 0.4 },
                      ]}
                      disabled={!minister}
                    >
                      <MaterialCommunityIcons name={getPortfolioIcon(portfolio)} size={12} color={selectedMinister === portfolio ? partyColor : Colors.textMuted} />
                      <Text style={[
                        styles.portfolioChipText,
                        selectedMinister === portfolio && { color: partyColor },
                      ]}>
                        {portfolio}
                      </Text>
                      {!minister ? <Text style={styles.vacantChipText}>vacant</Text> : null}
                    </Pressable>
                  );
                })}
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
                  placeholder={`e.g., "Prioritize review of immigration processing times and submit a report to Cabinet within 30 days. I want weekly briefings on this file."`}
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
                    { backgroundColor: partyColor },
                    !instruction.trim() && { opacity: 0.4 },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <MaterialCommunityIcons name="send" size={16} color="#fff" />
                  <Text style={styles.sendInstructText}>Issue Directive (AI will generate news)</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.selectPortfolioPrompt}>
                <MaterialCommunityIcons name="briefcase-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.selectPortfolioText}>Select an appointed portfolio above to issue a directive</Text>
              </View>
            )}
          </View>
        ) : null}

        {/* ══ OPPOSITION: Shadow Cabinet ══ */}
        {view === 'shadow' ? (
          <View style={styles.shadowSection}>
            {/* Banner */}
            <View style={styles.shadowBanner}>
              <MaterialCommunityIcons name="account-group" size={22} color={partyColor} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.shadowBannerTitle, { color: partyColor }]}>Shadow Cabinet</Text>
                <Text style={styles.shadowBannerSub}>
                  As Leader of the Opposition, appoint MPs to shadow each government portfolio. Shadow ministers scrutinize their corresponding minister and boost your party standing.
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.shadowStats}>
              <View style={styles.shadowStat}>
                <Text style={[styles.shadowStatValue, { color: partyColor }]}>{shadowCabinet.length}</Text>
                <Text style={styles.shadowStatLabel}>Appointed</Text>
              </View>
              <View style={styles.shadowStat}>
                <Text style={styles.shadowStatValue}>{MINISTERS_LIST.length - shadowCabinet.length}</Text>
                <Text style={styles.shadowStatLabel}>Vacant</Text>
              </View>
              <View style={styles.shadowStat}>
                <Text style={[styles.shadowStatValue, { color: Colors.success }]}>
                  {Math.round((shadowCabinet.length / MINISTERS_LIST.length) * 100)}%
                </Text>
                <Text style={styles.shadowStatLabel}>Coverage</Text>
              </View>
            </View>

            {/* Minister list */}
            {MINISTERS_LIST.map(portfolio => {
              const shadowMember = shadowCabinet.find(m => m.portfolio === portfolio);
              const isAppointing = shadowAppointingFor === portfolio;
              const suggestions = SHADOW_SUGGESTIONS[portfolio] || [];

              return (
                <View key={portfolio} style={styles.shadowCard}>
                  <View style={styles.shadowCardHeader}>
                    <View style={styles.portfolioInfo}>
                      <View style={[styles.portfolioIcon, {
                        backgroundColor: shadowMember ? partyColor + '22' : Colors.surfaceElevated,
                      }]}>
                        <MaterialCommunityIcons
                          name={getPortfolioIcon(portfolio)}
                          size={16}
                          color={shadowMember ? partyColor : Colors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.portfolioTitle}>Shadow {portfolio}</Text>
                        {shadowMember ? (
                          <Text style={[styles.ministerName, { color: partyColor }]}>{shadowMember.name}</Text>
                        ) : (
                          <Text style={styles.vacantLabel}>VACANT</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.ministerActions}>
                      {shadowMember ? (
                        <>
                          <View style={[styles.shadowStatsBadge]}>
                            <Text style={styles.shadowStatsText}>
                              {shadowMember.loyalty}% loyal
                            </Text>
                          </View>
                          <Pressable
                            onPress={() => handleRemoveShadow(portfolio)}
                            style={({ pressed }) => [styles.actionIconBtn, pressed && { opacity: 0.7 }]}
                          >
                            <MaterialCommunityIcons name="account-remove" size={14} color={Colors.error} />
                          </Pressable>
                        </>
                      ) : (
                        <Pressable
                          onPress={() => setShadowAppointingFor(isAppointing ? null : portfolio)}
                          style={({ pressed }) => [
                            styles.appointBtn,
                            { borderColor: partyColor + '55', backgroundColor: partyColor + '11' },
                            pressed && { opacity: 0.8 },
                          ]}
                        >
                          <Text style={[styles.appointBtnText, { color: partyColor }]}>Appoint</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>

                  {shadowMember ? (
                    <View style={styles.ministerStats}>
                      <View style={styles.ministerStat}>
                        <Text style={styles.ministerStatLabel}>Loyalty</Text>
                        <View style={styles.ministerStatBar}>
                          <View style={[styles.ministerStatFill, { width: `${shadowMember.loyalty}%` as any, backgroundColor: partyColor }]} />
                        </View>
                        <Text style={styles.ministerStatValue}>{shadowMember.loyalty}%</Text>
                      </View>
                      <View style={styles.ministerStat}>
                        <Text style={styles.ministerStatLabel}>Competence</Text>
                        <View style={styles.ministerStatBar}>
                          <View style={[styles.ministerStatFill, { width: `${shadowMember.competence}%` as any, backgroundColor: Colors.info }]} />
                        </View>
                        <Text style={styles.ministerStatValue}>{shadowMember.competence}%</Text>
                      </View>
                    </View>
                  ) : null}

                  {isAppointing ? (
                    <View style={styles.appointForm}>
                      {/* Quick suggestion chips */}
                      {suggestions.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {suggestions.map(s => (
                              <Pressable
                                key={s}
                                onPress={() => setShadowMinisterName(s)}
                                style={[styles.suggestionChip, shadowMinisterName === s && { backgroundColor: partyColor + '33', borderColor: partyColor }]}
                              >
                                <Text style={[styles.suggestionChipText, shadowMinisterName === s && { color: partyColor }]}>{s}</Text>
                              </Pressable>
                            ))}
                          </View>
                        </ScrollView>
                      ) : null}
                      <TextInput
                        style={styles.appointInput}
                        placeholder="Enter MP's full name..."
                        placeholderTextColor={Colors.textMuted}
                        value={shadowMinisterName}
                        onChangeText={setShadowMinisterName}
                        autoFocus
                      />
                      <Pressable
                        onPress={handleAppointShadow}
                        disabled={!shadowMinisterName.trim()}
                        style={({ pressed }) => [
                          styles.confirmAppointBtn,
                          { backgroundColor: partyColor },
                          !shadowMinisterName.trim() && { opacity: 0.4 },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Text style={styles.confirmAppointText}>Appoint to Shadow Cabinet</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  cabinetSizeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1 },
  cabinetSizeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  viewTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  viewTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  viewTabActive: {},
  viewTabText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
  content: { padding: Spacing.md },
  ministerList: { gap: Spacing.sm },
  ministerCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  ministerCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  portfolioInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  portfolioIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  ministerName: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, marginTop: 2 },
  vacantLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.error, letterSpacing: 0.5 },
  appointedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, backgroundColor: Colors.success + '22' },
  appointedBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.success },
  ministerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  actionIconBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: Colors.surfaceElevated },
  appointBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm, borderWidth: 1 },
  appointBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  ministerStats: { gap: 6 },
  ministerStat: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ministerStatLabel: { fontSize: FontSize.xs, color: Colors.textMuted, width: 70 },
  ministerStatBar: { flex: 1, height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden' },
  ministerStatFill: { height: '100%', borderRadius: 2 },
  ministerStatValue: { fontSize: FontSize.xs, color: Colors.textSecondary, minWidth: 30, textAlign: 'right' },
  appointForm: { gap: 8, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.divider },
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
  confirmAppointBtn: { borderRadius: Radius.sm, paddingVertical: 10, alignItems: 'center' },
  confirmAppointText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
  sectionNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.info + '11',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.info + '22',
  },
  sectionNoteText: { flex: 1, fontSize: FontSize.xs, color: Colors.info, lineHeight: 18 },
  // Directives
  instructSection: { gap: Spacing.md },
  instructHeader: { gap: 4 },
  instructTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  instructSubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },
  selectLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  portfolioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceElevated,
  },
  portfolioChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  vacantChipText: { fontSize: 9, color: Colors.error },
  instructForm: { gap: Spacing.sm },
  selectedPortfolioLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
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
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
  },
  sendInstructText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
  selectPortfolioPrompt: { alignItems: 'center', paddingVertical: 40, gap: Spacing.sm },
  selectPortfolioText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  // Shadow Cabinet
  shadowSection: { gap: Spacing.md },
  shadowBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  shadowBannerTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  shadowBannerSub: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18, marginTop: 2 },
  shadowStats: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
  },
  shadowStat: { flex: 1, alignItems: 'center', gap: 2 },
  shadowStatValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  shadowStatLabel: { fontSize: 10, color: Colors.textMuted },
  shadowCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  shadowCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shadowStatsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.success + '22',
  },
  shadowStatsText: { fontSize: 10, color: Colors.success, fontWeight: FontWeight.medium },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surfaceElevated,
  },
  suggestionChipText: { fontSize: FontSize.xs, color: Colors.textSecondary },
});
