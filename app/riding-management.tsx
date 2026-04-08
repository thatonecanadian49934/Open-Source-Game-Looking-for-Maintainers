// Powered by OnSpace.AI — Riding Management Screen
// Appoint local candidates, fund constituency work, track vulnerable ridings, respond to local issues
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';
import { REAL_PROVINCES } from '@/constants/provinces';

type RidingView = 'overview' | 'vulnerable' | 'province' | 'local_issues';
type RidingStatus = 'safe' | 'likely' | 'competitive' | 'vulnerable' | 'target';

interface RidingData {
  id: string;
  name: string;
  province: string;
  provinceCode: string;
  currentHolder: string; // partyId
  margin: number; // % margin of victory
  status: RidingStatus;
  candidate: string | null;
  funding: number; // thousands
  localIssues: LocalIssue[];
  prioritized: boolean;
  canvassLevel: number; // 0-100
  incumbentAdvantage: boolean;
}

interface LocalIssue {
  id: string;
  title: string;
  description: string;
  impact: number; // seats impact if not addressed
  responded: boolean;
  week: number;
}

interface ProvinceRidingStats {
  provinceCode: string;
  name: string;
  totalSeats: number;
  playerSeats: number;
  vulnerableCount: number;
  targetCount: number;
}

// Candidate name pools
const CANDIDATE_FIRST_NAMES = [
  'James', 'Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Emily', 'William', 'Amanda',
  'Hassan', 'Priya', 'Marcus', 'Claire', 'Jean-François', 'Aisha', 'Derek', 'Monica', 'Tyler', 'Nadia',
  'Kevin', 'Rachel', 'Andre', 'Fatima', 'Stephen', 'Grace', 'Patrick', 'Maria', 'François', 'Wei',
];

const CANDIDATE_LAST_NAMES = [
  'Chen', 'Williams', 'MacDonald', 'Tremblay', 'Singh', 'Okafor', 'Leblanc', 'Park', 'Wilson', 'Kumar',
  'Bergeron', 'Patel', 'Thompson', 'Dupont', 'Fraser', 'Nguyen', 'Morrisson', 'Lapointe', 'Santos', 'Kim',
  'Fontaine', 'Ahmed', 'Richardson', 'Bouchard', 'Walsh', 'Sharma', 'Martin', 'Kowalski', 'Li', 'Crawford',
];

const LOCAL_ISSUE_POOL = [
  { title: 'Hospital Closure Threat', description: 'Local hospital announces potential service cuts. Residents demanding federal intervention.', impact: -2 },
  { title: 'Infrastructure Funding Gap', description: 'Bridge requires $12M in repairs — provincial funding denied. Federal request pending.', impact: -1 },
  { title: 'Plant Closure — 800 Jobs', description: 'Major employer announces closure. Workers demanding government action on trade policy.', impact: -3 },
  { title: 'Housing Development Blocked', description: 'Zoning dispute blocking affordable housing project. Federal lands could unlock development.', impact: -1 },
  { title: 'Military Base Possible Closure', description: 'DND reviewing base viability. Community of 12,000 dependent on base employment.', impact: -3 },
  { title: 'Agricultural Drought Relief', description: 'Farmers demanding emergency assistance after third consecutive drought year.', impact: -2 },
  { title: 'Internet Connectivity Crisis', description: '40% of riding has no broadband access. CRTC deadlines being missed.', impact: -1 },
  { title: 'Indigenous Land Claim', description: 'First Nation has filed a comprehensive land claim affecting riding boundaries.', impact: -2 },
  { title: 'Flooding — Infrastructure Damage', description: 'Record flooding damaged $45M in local infrastructure. Federal disaster relief requested.', impact: -2 },
  { title: 'Community Centre Closure', description: 'Only community centre in rural riding faces closure — federal cultural funding gap.', impact: -1 },
];

function generateRidingName(province: string, index: number): string {
  const prefixes: Record<string, string[]> = {
    Ontario: ['Toronto', 'Ottawa', 'Mississauga', 'Hamilton', 'London', 'Brampton', 'Kingston', 'Barrie', 'Sudbury', 'Windsor', 'Waterloo', 'Guelph', 'Niagara', 'Durham', 'Markham', 'York'],
    Quebec: ['Montréal', 'Québec', 'Laval', 'Longueuil', 'Sherbrooke', 'Trois-Rivières', 'Gatineau', 'Saguenay', 'Abitibi', 'Rivière-du-Nord', 'Joliette', 'Blainville'],
    'British Columbia': ['Vancouver', 'Surrey', 'Burnaby', 'Richmond', 'Abbotsford', 'Kelowna', 'Victoria', 'Prince George', 'Kamloops', 'Nanaimo', 'Langley', 'Delta'],
    Alberta: ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'Medicine Hat', 'Fort McMurray', 'Airdrie', 'Spruce Grove', 'St. Albert', 'Grande Prairie'],
    Manitoba: ['Winnipeg', 'Brandon', 'Portage', 'Thompson', 'Selkirk', 'Dauphin', 'Steinbach'],
    Saskatchewan: ['Saskatoon', 'Regina', 'Moose Jaw', 'Prince Albert', 'Swift Current', 'Yorkton'],
  };
  const suffixes = ['—Centre', '—North', '—South', '—East', '—West', '—Rural', '—Urban', '—Lakeshore', '—Highland', '—Bay'];
  const provPrefixes = prefixes[province] || ['Northern', 'Southern', 'Eastern', 'Western', 'Central'];
  const prefix = provPrefixes[index % provPrefixes.length];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix}${suffix}`;
}

function generateCandidate(): string {
  const first = CANDIDATE_FIRST_NAMES[Math.floor(Math.random() * CANDIDATE_FIRST_NAMES.length)];
  const last = CANDIDATE_LAST_NAMES[Math.floor(Math.random() * CANDIDATE_LAST_NAMES.length)];
  return `${first} ${last}`;
}

function getRidingStatus(margin: number, isPlayerRiding: boolean): RidingStatus {
  if (!isPlayerRiding && margin > 15) return 'safe'; // strongly held by other
  if (!isPlayerRiding) return 'target'; // winnable target
  if (margin > 20) return 'safe';
  if (margin > 12) return 'likely';
  if (margin > 6) return 'competitive';
  return 'vulnerable';
}

const STATUS_COLORS: Record<RidingStatus, string> = {
  safe: Colors.success,
  likely: Colors.info,
  competitive: Colors.warning,
  vulnerable: Colors.error,
  target: Colors.gold,
};

const STATUS_LABELS: Record<RidingStatus, string> = {
  safe: 'Safe',
  likely: 'Likely',
  competitive: 'Competitive',
  vulnerable: 'Vulnerable',
  target: 'Target',
};

export default function RidingManagementScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState } = useGame();
  const { showAlert } = useAlert();

  const [view, setView] = useState<RidingView>('overview');
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [ridings, setRidings] = useState<RidingData[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<RidingStatus | 'all'>('all');
  const [customCandidateName, setCustomCandidateName] = useState('');
  const [editingRidingId, setEditingRidingId] = useState<string | null>(null);

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const playerPartyId = gameState.playerPartyId;

  // Initialize ridings from game state
  useMemo(() => {
    if (initialized) return;
    const generated: RidingData[] = [];
    let ridingIdx = 0;

    REAL_PROVINCES.forEach(province => {
      const playerProvSeats = gameState.provincialSeats?.[province.code]?.[playerPartyId] || 0;
      const totalProvSeats = province.seats;
      let playerSeatCounter = 0;

      for (let i = 0; i < totalProvSeats; i++) {
        const isPlayerRiding = playerSeatCounter < playerProvSeats;
        if (isPlayerRiding) playerSeatCounter++;

        const margin = isPlayerRiding
          ? 3 + Math.floor(Math.random() * 25)
          : 2 + Math.floor(Math.random() * 20);

        const status = getRidingStatus(margin, isPlayerRiding);
        const hasIssue = Math.random() < 0.25;
        const localIssues: LocalIssue[] = hasIssue ? [{
          ...LOCAL_ISSUE_POOL[Math.floor(Math.random() * LOCAL_ISSUE_POOL.length)],
          id: `issue_${ridingIdx}_${i}`,
          responded: false,
          week: gameState.currentWeek,
        }] : [];

        generated.push({
          id: `riding_${ridingIdx++}`,
          name: generateRidingName(province.name, i),
          province: province.name,
          provinceCode: province.code,
          currentHolder: isPlayerRiding ? playerPartyId : Object.keys(gameState.seats).find(id => id !== playerPartyId && (gameState.seats[id] || 0) > 0) || 'liberal',
          margin,
          status,
          candidate: isPlayerRiding ? generateCandidate() : null,
          funding: isPlayerRiding ? Math.floor(Math.random() * 50 + 10) : 0,
          localIssues,
          prioritized: status === 'vulnerable' && isPlayerRiding,
          canvassLevel: isPlayerRiding ? 20 + Math.floor(Math.random() * 60) : 0,
          incumbentAdvantage: isPlayerRiding && margin > 8,
        });
      }
    });

    setRidings(generated);
    setInitialized(true);
  }, [gameState, initialized]);

  const playerRidings = ridings.filter(r => r.currentHolder === playerPartyId);
  const vulnerableRidings = playerRidings.filter(r => r.status === 'vulnerable' || r.status === 'competitive');
  const targetRidings = ridings.filter(r => r.currentHolder !== playerPartyId && r.status === 'target' && r.margin < 8);
  const unrespondedIssues = ridings.flatMap(r => r.localIssues).filter(i => !i.responded).length;

  const provinceStats: ProvinceRidingStats[] = REAL_PROVINCES.map(prov => {
    const provRidings = ridings.filter(r => r.provinceCode === prov.code);
    return {
      provinceCode: prov.code,
      name: prov.name,
      totalSeats: prov.seats,
      playerSeats: provRidings.filter(r => r.currentHolder === playerPartyId).length,
      vulnerableCount: provRidings.filter(r => r.currentHolder === playerPartyId && (r.status === 'vulnerable' || r.status === 'competitive')).length,
      targetCount: provRidings.filter(r => r.currentHolder !== playerPartyId && r.margin < 8).length,
    };
  }).filter(p => p.totalSeats > 0);

  const handleAppointCandidate = (ridingId: string, name: string) => {
    if (!name.trim()) {
      showAlert('No Name', 'Enter a candidate name.');
      return;
    }
    setRidings(prev => prev.map(r => r.id === ridingId ? { ...r, candidate: name.trim() } : r));
    setEditingRidingId(null);
    setCustomCandidateName('');
    showAlert('Candidate Appointed', `${name} has been appointed as the ${party?.shortName} candidate for this riding.`);
  };

  const handleFundRiding = (ridingId: string, amount: number) => {
    setRidings(prev => prev.map(r => {
      if (r.id !== ridingId) return r;
      const newFunding = r.funding + amount;
      const canvassBoost = Math.min(100, r.canvassLevel + Math.floor(amount / 5));
      const marginBoost = amount >= 50 ? 2 : amount >= 25 ? 1 : 0;
      return { ...r, funding: newFunding, canvassLevel: canvassBoost, margin: r.margin + marginBoost };
    }));
    showAlert('Riding Funded', `$${amount}K allocated to constituency work. Canvass operations expanded.`);
  };

  const handleRespondToIssue = (ridingId: string, issueId: string, response: string) => {
    setRidings(prev => prev.map(r => {
      if (r.id !== ridingId) return r;
      const marginBoost = 1 + Math.floor(Math.random() * 3);
      return {
        ...r,
        localIssues: r.localIssues.map(i => i.id === issueId ? { ...i, responded: true } : i),
        margin: Math.min(40, r.margin + marginBoost),
      };
    }));
    showAlert('Issue Addressed', `Your intervention on this local issue has been noted. Estimated +${1}–3% margin improvement.`);
  };

  const handlePrioritizeRiding = (ridingId: string) => {
    setRidings(prev => prev.map(r => r.id === ridingId ? { ...r, prioritized: !r.prioritized } : r));
  };

  const filteredRidings = ridings.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.province.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || r.status === filterStatus;
    const isPlayer = r.currentHolder === playerPartyId;
    return matchesSearch && matchesFilter && isPlayer;
  });

  // ── OVERVIEW ────────────────────────────────────────────────────────────────
  if (view === 'overview') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Riding Management</Text>
            <Text style={styles.headerSub}>{playerRidings.length} ridings held by {party?.shortName}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: partyColor }]}>{playerRidings.length}</Text>
              <Text style={styles.statLabel}>Ridings Held</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: Colors.error }]}>{vulnerableRidings.length}</Text>
              <Text style={styles.statLabel}>At Risk</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: Colors.gold }]}>{targetRidings.length}</Text>
              <Text style={styles.statLabel}>Targets</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: Colors.warning }]}>{unrespondedIssues}</Text>
              <Text style={styles.statLabel}>Local Issues</Text>
            </View>
          </View>

          {/* Alerts */}
          {vulnerableRidings.length > 0 ? (
            <Pressable onPress={() => setView('vulnerable')} style={({ pressed }) => [styles.alertCard, pressed && { opacity: 0.85 }]}>
              <MaterialCommunityIcons name="alert" size={16} color={Colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertCardTitle}>{vulnerableRidings.length} At-Risk Riding{vulnerableRidings.length > 1 ? 's' : ''}</Text>
                <Text style={styles.alertCardSub}>These ridings could be lost in the next election. Fund constituency work and appoint strong candidates.</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.error} />
            </Pressable>
          ) : null}

          {unrespondedIssues > 0 ? (
            <Pressable onPress={() => setView('local_issues')} style={({ pressed }) => [styles.issueAlertCard, pressed && { opacity: 0.85 }]}>
              <MaterialCommunityIcons name="map-marker-alert" size={16} color={Colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={styles.issueAlertTitle}>{unrespondedIssues} Unaddressed Local Issue{unrespondedIssues > 1 ? 's' : ''}</Text>
                <Text style={styles.issueAlertSub}>Local issues that go unaddressed cost votes. Respond to constituent concerns.</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.warning} />
            </Pressable>
          ) : null}

          {/* Province breakdown */}
          <Text style={styles.sectionLabel}>PROVINCE-BY-PROVINCE</Text>
          {provinceStats.filter(p => p.playerSeats > 0).map(prov => {
            const pct = Math.round((prov.playerSeats / prov.totalSeats) * 100);
            return (
              <Pressable
                key={prov.provinceCode}
                onPress={() => { setSelectedProvince(prov.provinceCode); setView('province'); }}
                style={({ pressed }) => [styles.provinceCard, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.provinceCardHeader}>
                  <Text style={styles.provinceCode}>{prov.provinceCode}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.provinceName}>{prov.name}</Text>
                    <Text style={styles.provinceSeats}>{prov.playerSeats}/{prov.totalSeats} seats held ({pct}%)</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    {prov.vulnerableCount > 0 ? (
                      <View style={styles.vulnBadge}>
                        <Text style={styles.vulnBadgeText}>{prov.vulnerableCount} at risk</Text>
                      </View>
                    ) : null}
                    {prov.targetCount > 0 ? (
                      <View style={styles.targetBadge}>
                        <Text style={styles.targetBadgeText}>{prov.targetCount} targets</Text>
                      </View>
                    ) : null}
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} />
                </View>
                <View style={styles.provSeatBar}>
                  <View style={[styles.provSeatBarFill, { flex: prov.playerSeats, backgroundColor: partyColor }]} />
                  <View style={{ flex: prov.totalSeats - prov.playerSeats, backgroundColor: Colors.surfaceBorder }} />
                </View>
              </Pressable>
            );
          })}

          {/* Target ridings */}
          {targetRidings.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>TOP PICKUP TARGETS</Text>
              {targetRidings.slice(0, 5).map(riding => (
                <Pressable
                  key={riding.id}
                  onPress={() => {
                    showAlert(
                      `Target: ${riding.name}`,
                      `Currently held by the ${PARTIES.find(p => p.id === riding.currentHolder)?.name || 'other party'} with a ${riding.margin}% margin.\n\nThis riding is winnable. Campaign here to improve chances.`,
                      [
                        { text: 'Close', style: 'cancel' },
                        {
                          text: 'Focus Resources Here',
                          onPress: () => {
                            setRidings(prev => prev.map(r => r.id === riding.id ? { ...r, prioritized: true, candidate: r.candidate || generateCandidate() } : r));
                            showAlert('Riding Targeted', `Resources will be directed to ${riding.name}. A candidate has been appointed.`);
                          },
                        },
                      ]
                    );
                  }}
                  style={({ pressed }) => [styles.targetCard, pressed && { opacity: 0.85 }]}
                >
                  <View style={[styles.targetColorBar, { backgroundColor: Colors.gold }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.targetName}>{riding.name}</Text>
                    <Text style={styles.targetMeta}>{riding.province} · Held by {PARTIES.find(p => p.id === riding.currentHolder)?.shortName}</Text>
                  </View>
                  <View>
                    <Text style={[styles.targetMargin, { color: riding.margin < 5 ? Colors.success : Colors.warning }]}>+{riding.margin}%</Text>
                    <Text style={styles.targetMarginLabel}>opponent margin</Text>
                  </View>
                </Pressable>
              ))}
            </>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  // ── VULNERABLE RIDINGS ──────────────────────────────────────────────────────
  if (view === 'vulnerable') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setView('overview')} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>At-Risk Ridings</Text>
            <Text style={styles.headerSub}>{vulnerableRidings.length} ridings need attention</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="information" size={13} color={Colors.warning} />
            <Text style={styles.infoText}>
              Ridings with margins below 12% are at risk of being lost in the next election. Fund constituency work, appoint strong candidates, and address local issues to improve your standing.
            </Text>
          </View>

          {vulnerableRidings.sort((a, b) => a.margin - b.margin).map(riding => {
            const statusColor = STATUS_COLORS[riding.status];
            const isEditing = editingRidingId === riding.id;

            return (
              <View key={riding.id} style={[styles.ridingCard, { borderColor: statusColor + '44' }]}>
                <View style={styles.ridingCardHeader}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ridingName}>{riding.name}</Text>
                    <Text style={styles.ridingMeta}>{riding.province} · {STATUS_LABELS[riding.status]}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.ridingMargin, { color: statusColor }]}>+{riding.margin}%</Text>
                    <Text style={styles.ridingMarginLabel}>margin</Text>
                  </View>
                </View>

                {/* Candidate */}
                <View style={styles.ridingCandidateRow}>
                  <MaterialCommunityIcons name="account" size={14} color={Colors.textSecondary} />
                  {riding.candidate ? (
                    <Text style={styles.ridingCandidate}>{riding.candidate}</Text>
                  ) : (
                    <Text style={[styles.ridingCandidate, { color: Colors.error }]}>No candidate appointed</Text>
                  )}
                  <Pressable
                    onPress={() => setEditingRidingId(isEditing ? null : riding.id)}
                    style={styles.editCandidateBtn}
                  >
                    <MaterialCommunityIcons name={isEditing ? 'close' : 'pencil'} size={13} color={partyColor} />
                  </Pressable>
                </View>

                {isEditing ? (
                  <View style={styles.candidateInputRow}>
                    <TextInput
                      style={styles.candidateInput}
                      placeholder="Enter candidate name"
                      placeholderTextColor={Colors.textMuted}
                      value={customCandidateName}
                      onChangeText={setCustomCandidateName}
                    />
                    <Pressable
                      onPress={() => handleAppointCandidate(riding.id, customCandidateName || generateCandidate())}
                      style={[styles.appointBtn, { backgroundColor: partyColor }]}
                    >
                      <Text style={styles.appointBtnText}>Appoint</Text>
                    </Pressable>
                  </View>
                ) : null}

                {/* Canvass level */}
                <View style={styles.canvassRow}>
                  <Text style={styles.canvassLabel}>Canvass Coverage</Text>
                  <View style={styles.canvassBar}>
                    <View style={[styles.canvassBarFill, { flex: riding.canvassLevel, backgroundColor: partyColor }]} />
                    <View style={{ flex: 100 - riding.canvassLevel }} />
                  </View>
                  <Text style={styles.canvassValue}>{riding.canvassLevel}%</Text>
                </View>

                {/* Funding */}
                <View style={styles.fundingRow}>
                  <MaterialCommunityIcons name="currency-usd" size={13} color={Colors.success} />
                  <Text style={styles.fundingText}>${riding.funding}K allocated</Text>
                  <View style={styles.fundingBtns}>
                    {[10, 25, 50].map(amt => (
                      <Pressable
                        key={amt}
                        onPress={() => handleFundRiding(riding.id, amt)}
                        style={({ pressed }) => [styles.fundBtn, pressed && { opacity: 0.8 }]}
                      >
                        <Text style={styles.fundBtnText}>+${amt}K</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Local issues */}
                {riding.localIssues.filter(i => !i.responded).map(issue => (
                  <View key={issue.id} style={styles.localIssueCard}>
                    <MaterialCommunityIcons name="map-marker-alert" size={13} color={Colors.warning} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.localIssueTitle}>{issue.title}</Text>
                      <Text style={styles.localIssueDesc}>{issue.description}</Text>
                    </View>
                    <Pressable
                      onPress={() => showAlert(
                        `Respond to: ${issue.title}`,
                        `This issue is affecting voter confidence. How will you respond?\n\nPotential impact: ${issue.impact}% margin change`,
                        [
                          { text: 'Federal Funding Commitment', onPress: () => handleRespondToIssue(riding.id, issue.id, 'federal_funding') },
                          { text: 'Personal Visit', onPress: () => handleRespondToIssue(riding.id, issue.id, 'personal_visit') },
                          { text: 'Press Statement', onPress: () => handleRespondToIssue(riding.id, issue.id, 'press_statement') },
                        ]
                      )}
                      style={styles.respondBtn}
                    >
                      <Text style={styles.respondBtnText}>Respond</Text>
                    </Pressable>
                  </View>
                ))}

                <Pressable
                  onPress={() => handlePrioritizeRiding(riding.id)}
                  style={[styles.prioritizeBtn, riding.prioritized && { backgroundColor: partyColor + '22', borderColor: partyColor + '55' }]}
                >
                  <MaterialCommunityIcons name={riding.prioritized ? 'star' : 'star-outline'} size={13} color={riding.prioritized ? partyColor : Colors.textMuted} />
                  <Text style={[styles.prioritizeBtnText, riding.prioritized && { color: partyColor }]}>
                    {riding.prioritized ? 'Priority Riding' : 'Mark as Priority'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // ── PROVINCE VIEW ────────────────────────────────────────────────────────────
  if (view === 'province' && selectedProvince) {
    const provRidings = ridings.filter(r => r.provinceCode === selectedProvince && r.currentHolder === playerPartyId);
    const provName = REAL_PROVINCES.find(p => p.code === selectedProvince)?.name || selectedProvince;

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setView('overview')} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{provName}</Text>
            <Text style={styles.headerSub}>{provRidings.length} ridings held</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.filterBar}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search ridings..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <FlatList
          data={provRidings.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => a.margin - b.margin)}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: riding }) => {
            const statusColor = STATUS_COLORS[riding.status];
            return (
              <Pressable
                onPress={() => showAlert(
                  riding.name,
                  `${STATUS_LABELS[riding.status]} — ${riding.margin}% margin\nCandidate: ${riding.candidate || 'None appointed'}\nFunding: $${riding.funding}K\nCanvass: ${riding.canvassLevel}%\nLocal issues: ${riding.localIssues.filter(i => !i.responded).length} unaddressed`,
                  [
                    { text: 'Fund +$25K', onPress: () => handleFundRiding(riding.id, 25) },
                    { text: 'Close', style: 'cancel' },
                  ]
                )}
                style={({ pressed }) => [styles.ridingListRow, pressed && { opacity: 0.85 }]}
              >
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.ridingListName}>{riding.name}</Text>
                  <Text style={styles.ridingListMeta}>
                    {riding.candidate || 'No candidate'} · ${riding.funding}K
                  </Text>
                </View>
                <View style={styles.ridingListRight}>
                  <Text style={[styles.ridingListMargin, { color: statusColor }]}>+{riding.margin}%</Text>
                  {riding.localIssues.filter(i => !i.responded).length > 0 ? (
                    <MaterialCommunityIcons name="alert-circle" size={12} color={Colors.warning} />
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      </View>
    );
  }

  // ── LOCAL ISSUES ─────────────────────────────────────────────────────────────
  if (view === 'local_issues') {
    const allIssues = ridings
      .filter(r => r.currentHolder === playerPartyId)
      .flatMap(r => r.localIssues.filter(i => !i.responded).map(i => ({ ...i, ridingName: r.name, ridingId: r.id })));

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setView('overview')} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Local Issues</Text>
            <Text style={styles.headerSub}>{allIssues.length} unaddressed issues</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {allIssues.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="check-circle" size={48} color={Colors.success} />
              <Text style={styles.emptyTitle}>All Issues Addressed</Text>
              <Text style={styles.emptyDesc}>No outstanding local issues in your ridings.</Text>
            </View>
          ) : (
            allIssues.map(issue => (
              <View key={issue.id} style={styles.issueCard}>
                <View style={styles.issueCardHeader}>
                  <MaterialCommunityIcons name="map-marker-alert" size={16} color={Colors.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.issueCardTitle}>{issue.title}</Text>
                    <Text style={styles.issueCardRiding}>{(issue as any).ridingName}</Text>
                  </View>
                  <View style={styles.impactBadge}>
                    <Text style={styles.impactBadgeText}>{issue.impact}% risk</Text>
                  </View>
                </View>
                <Text style={styles.issueCardDesc}>{issue.description}</Text>
                <View style={styles.issueResponseBtns}>
                  {[
                    { label: 'Federal Funding', icon: 'currency-usd', response: 'federal_funding' },
                    { label: 'Personal Visit', icon: 'account-check', response: 'personal_visit' },
                    { label: 'Press Release', icon: 'newspaper', response: 'press_statement' },
                  ].map(opt => (
                    <Pressable
                      key={opt.response}
                      onPress={() => handleRespondToIssue((issue as any).ridingId, issue.id, opt.response)}
                      style={({ pressed }) => [styles.issueResponseBtn, { borderColor: partyColor + '44', backgroundColor: partyColor + '0D' }, pressed && { opacity: 0.85 }]}
                    >
                      <MaterialCommunityIcons name={opt.icon as any} size={13} color={partyColor} />
                      <Text style={[styles.issueResponseBtnText, { color: partyColor }]}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  content: { padding: Spacing.md, gap: Spacing.sm },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5, marginTop: 8 },
  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  statCard: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm, alignItems: 'center', gap: 2 },
  statValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  statLabel: { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.error + '0D', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.error + '33', padding: Spacing.md, gap: Spacing.sm },
  alertCardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.error },
  alertCardSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  issueAlertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.warning + '0D', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.warning + '33', padding: Spacing.md, gap: Spacing.sm },
  issueAlertTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.warning },
  issueAlertSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  provinceCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  provinceCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  provinceCode: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold, color: Colors.textMuted, width: 30 },
  provinceName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  provinceSeats: { fontSize: FontSize.xs, color: Colors.textSecondary },
  provSeatBar: { flexDirection: 'row', height: 6, backgroundColor: Colors.surfaceBorder, borderRadius: 3, overflow: 'hidden' },
  provSeatBarFill: { height: '100%', borderRadius: 3 },
  vulnBadge: { backgroundColor: Colors.error + '22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  vulnBadgeText: { fontSize: 9, color: Colors.error, fontWeight: FontWeight.bold },
  targetBadge: { backgroundColor: Colors.gold + '22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  targetBadgeText: { fontSize: 9, color: Colors.gold, fontWeight: FontWeight.bold },
  targetCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.gold + '33', overflow: 'hidden', gap: Spacing.sm },
  targetColorBar: { width: 4, alignSelf: 'stretch' },
  targetName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  targetMeta: { fontSize: FontSize.xs, color: Colors.textSecondary },
  targetMargin: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold },
  targetMarginLabel: { fontSize: 9, color: Colors.textMuted },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.warning + '08', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.warning + '22' },
  infoText: { flex: 1, fontSize: FontSize.xs, color: Colors.warning, lineHeight: 18 },
  ridingCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  ridingCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  ridingName: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  ridingMeta: { fontSize: FontSize.xs, color: Colors.textSecondary },
  ridingMargin: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold },
  ridingMarginLabel: { fontSize: 9, color: Colors.textMuted },
  ridingCandidateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ridingCandidate: { flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary },
  editCandidateBtn: { padding: 6 },
  candidateInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  candidateInput: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.sm, paddingVertical: 8, fontSize: FontSize.xs, color: Colors.textPrimary },
  appointBtn: { paddingHorizontal: Spacing.sm, paddingVertical: 8, borderRadius: Radius.sm },
  appointBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#fff' },
  canvassRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  canvassLabel: { fontSize: FontSize.xs, color: Colors.textMuted, width: 100 },
  canvassBar: { flex: 1, flexDirection: 'row', height: 6, backgroundColor: Colors.surfaceBorder, borderRadius: 3, overflow: 'hidden' },
  canvassBarFill: { height: '100%', borderRadius: 3, minWidth: 4 },
  canvassValue: { fontSize: FontSize.xs, color: Colors.textSecondary, width: 30, textAlign: 'right' },
  fundingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  fundingText: { flex: 1, fontSize: FontSize.xs, color: Colors.success },
  fundingBtns: { flexDirection: 'row', gap: 6 },
  fundBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm, backgroundColor: Colors.success + '11', borderWidth: 1, borderColor: Colors.success + '33' },
  fundBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.success },
  localIssueCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.warning + '08', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.warning + '22' },
  localIssueTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.warning },
  localIssueDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16, marginTop: 2 },
  respondBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm, backgroundColor: Colors.warning + '22', borderWidth: 1, borderColor: Colors.warning + '44' },
  respondBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.warning },
  prioritizeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.sm, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  prioritizeBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
  // Province ridings list
  filterBar: { paddingHorizontal: Spacing.md, paddingVertical: 8, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  searchInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.sm, paddingVertical: 8, fontSize: FontSize.xs, color: Colors.textPrimary },
  ridingListRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm },
  ridingListName: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  ridingListMeta: { fontSize: FontSize.xs, color: Colors.textMuted },
  ridingListRight: { alignItems: 'flex-end', gap: 2 },
  ridingListMargin: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  // Local issues view
  emptyCard: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  emptyDesc: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  issueCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.warning + '33', padding: Spacing.md, gap: 8 },
  issueCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  issueCardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  issueCardRiding: { fontSize: FontSize.xs, color: Colors.textMuted },
  issueCardDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  issueResponseBtns: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  issueResponseBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: Radius.sm, borderWidth: 1 },
  issueResponseBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  impactBadge: { backgroundColor: Colors.error + '22', paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.full },
  impactBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.error },
});
