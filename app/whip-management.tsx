// Powered by OnSpace.AI — Party Whip Management Screen
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, FlatList, Modal, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';
import { REAL_PROVINCES } from '@/constants/provinces';

// ── MP Types ───────────────────────────────────────────────────────────────────
export interface CaucusMember {
  id: string;
  name: string;
  riding: string;
  province: string;
  role: 'cabinet_minister' | 'parliamentary_secretary' | 'committee_chair' | 'backbencher';
  loyalty: number;       // 0–100
  competence: number;    // 0–100
  seniority: number;     // years
  rebellions: number;    // times voted against whip
  hasCrossed: boolean;
  isSuspended: boolean;
  committeePosition?: string;
  incentiveGiven?: string;
  warningCount: number;
}

type Tab = 'roster' | 'rebels' | 'history';
type SortKey = 'loyalty' | 'name' | 'role' | 'rebellion';

const ROLE_LABELS: Record<CaucusMember['role'], string> = {
  cabinet_minister: 'Cabinet Minister',
  parliamentary_secretary: 'Parl. Secretary',
  committee_chair: 'Committee Chair',
  backbencher: 'Backbencher',
};

const ROLE_COLORS: Record<CaucusMember['role'], string> = {
  cabinet_minister: Colors.gold,
  parliamentary_secretary: Colors.info,
  committee_chair: Colors.success,
  backbencher: Colors.textMuted,
};

const COMMITTEE_POSITIONS = [
  'Finance Committee (FINA)', 'Justice Committee (JUST)', 'Health Committee (HESA)',
  'Environment Committee (ENVI)', 'Public Accounts (PACP)', 'Procedure & House Affairs (PROC)',
  'Human Resources (HUMA)', 'Foreign Affairs (FAAE)', 'National Defence (NDDN)',
  'Agriculture Committee (AGRI)',
];

const MP_FIRST_NAMES = [
  'James', 'Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Emily',
  'William', 'Amanda', 'Thomas', 'Rachel', 'Kevin', 'Patricia', 'Daniel', 'Michelle',
  'Christopher', 'Angela', 'Andrew', 'Jessica', 'Matthew', 'Sandra', 'Anthony', 'Karen',
  'Mark', 'Donna', 'Donald', 'Carol', 'Steven', 'Ruth', 'Paul', 'Sharon', 'Kenneth',
  'Michelle', 'Joshua', 'Laura', 'Brian', 'Priya', 'Ahmed', 'Elena',
];

const MP_LAST_NAMES = [
  'Chen', 'Williams', 'MacDonald', 'Tremblay', 'Singh', 'Okafor', 'Leblanc', 'Park',
  'Wilson', 'Kumar', 'Martin', 'Thompson', 'White', 'Harris', 'Jackson', 'Taylor',
  'Anderson', 'Moore', 'Garcia', 'Martinez', 'Robinson', 'Walker', 'Perez', 'Hall',
  'Young', 'Allen', 'Sanchez', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Kim', 'Patel',
  'Fontaine', 'Bergeron', 'Lavoie', 'Bouchard', 'Roy', 'Gagnon', 'Côté',
];

const RIDING_NAMES_BY_PROVINCE: Record<string, string[]> = {
  ON: ['Ajax', 'Burlington', 'Cambridge', 'Durham', 'Guelph', 'Hamilton Centre', 'Kingston', 'London North', 'Markham', 'Mississauga Centre', 'Newmarket', 'Oshawa', 'Ottawa Centre', 'Peterborough', 'Richmond Hill', 'Scarborough Centre', 'Thunder Bay', 'Toronto Centre', 'Waterloo', 'Windsor West'],
  QC: ['Abitibi', 'Beauce', 'Chicoutimi', 'Drummond', 'Hochelaga', 'Jonquière', 'Lac-Saint-Jean', 'Laval Nord', 'Lévis', 'Longueuil', 'Montarville', 'Papineau', 'Québec', 'Repentigny', 'Rimouski', 'Sherbrooke', 'Terrebonne', 'Trois-Rivières', 'Vimy'],
  BC: ['Abbotsford', 'Burnaby North', 'Burnaby South', 'Chilliwack', 'Coquitlam', 'Kelowna', 'Nanaimo', 'New Westminster', 'North Vancouver', 'Richmond Centre', 'Saanich', 'Skeena', 'Surrey Centre', 'Vancouver Centre', 'Vancouver East', 'Victoria'],
  AB: ['Banff—Airdrie', 'Calgary Centre', 'Calgary East', 'Calgary Heritage', 'Edmonton Centre', 'Edmonton Griesbach', 'Edmonton Strathcona', 'Fort McMurray', 'Grande Prairie', 'Lethbridge', 'Red Deer'],
  MB: ['Brandon', 'Churchill', 'Elmwood', 'Kildonan', 'Portage', 'Provencher', 'Winnipeg Centre', 'Winnipeg North', 'Winnipeg South'],
  SK: ['Battlefords', 'Moose Jaw', 'Prince Albert', 'Regina Centre', 'Saskatoon West', 'Yorkton'],
  NS: ['Cape Breton', 'Central Nova', 'Cumberland', 'Dartmouth', 'Halifax', 'Kings—Hants'],
  NB: ['Acadie—Bathurst', 'Beauséjour', 'Fredericton', 'Fundy Royal', 'Moncton', 'Saint John'],
  NL: ['Avalon', 'Bonavista', 'Labrador', 'St. John\'s East', 'St. John\'s South'],
  PE: ['Cardigan', 'Charlottetown', 'Egmont', 'Malpeque'],
};

// Deterministic seeded random using party + index
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// Generate caucus roster from party seats
function generateCaucusRoster(
  playerPartyId: string,
  seats: number,
  cabinet: { portfolio: string; name: string; loyalty: number }[],
  whipEvents: { mpName: string; event: string; week: number; description: string }[]
): CaucusMember[] {
  const roster: CaucusMember[] = [];
  const cabinetNames = new Set(cabinet.map(c => c.name));
  const crossedNames = new Set(
    whipEvents.filter(e => e.event === 'floor_crossing').map(e => e.mpName)
  );
  const rebelNames = new Set(
    whipEvents.filter(e => e.event === 'rebel_vote').map(e => e.mpName)
  );

  // Province distribution proportional
  const provinces = REAL_PROVINCES;
  let assigned = 0;

  for (let i = 0; i < Math.min(seats, 120); i++) {
    const r1 = seededRandom(i * 7 + 1);
    const r2 = seededRandom(i * 7 + 2);
    const r3 = seededRandom(i * 7 + 3);
    const r4 = seededRandom(i * 7 + 4);
    const r5 = seededRandom(i * 7 + 5);
    const r6 = seededRandom(i * 7 + 6);

    const firstName = MP_FIRST_NAMES[Math.floor(r1 * MP_FIRST_NAMES.length)];
    const lastName = MP_LAST_NAMES[Math.floor(r2 * MP_LAST_NAMES.length)];
    const name = `${firstName} ${lastName}`;

    const province = provinces[Math.floor(r3 * provinces.length)];
    const ridingsForProv = RIDING_NAMES_BY_PROVINCE[province.code] || ['Unknown Riding'];
    const riding = ridingsForProv[Math.floor(r4 * ridingsForProv.length)];

    // Match against cabinet
    const matchingMinister = cabinet.find(c => {
      const nameParts = c.name.split(' ');
      return nameParts.some(part => name.includes(part));
    });

    const hasCrossed = crossedNames.has(name);
    const hasRebelled = rebelNames.has(name);

    const baseRole: CaucusMember['role'] = i < cabinet.length
      ? 'cabinet_minister'
      : i < cabinet.length + 15
      ? 'parliamentary_secretary'
      : i < cabinet.length + 25
      ? 'committee_chair'
      : 'backbencher';

    const loyalty = Math.max(10, Math.min(99,
      Math.floor(r5 * 60) + 35 // range 35–94
      - (hasCrossed ? 50 : 0)
      - (hasRebelled ? 20 : 0)
      + (matchingMinister ? (matchingMinister.loyalty - 70) : 0)
    ));

    roster.push({
      id: `mp_${playerPartyId}_${i}`,
      name,
      riding,
      province: province.code,
      role: baseRole,
      loyalty,
      competence: Math.floor(r6 * 40) + 50,
      seniority: Math.floor(seededRandom(i * 7 + 7) * 20) + 1,
      rebellions: hasRebelled ? Math.floor(seededRandom(i * 7 + 8) * 3) + 1 : 0,
      hasCrossed,
      isSuspended: false,
      warningCount: 0,
      committeePosition: baseRole === 'committee_chair'
        ? COMMITTEE_POSITIONS[Math.floor(r4 * COMMITTEE_POSITIONS.length)]
        : undefined,
    });
  }

  return roster;
}

const LOYALTY_BANDS = [
  { min: 0, max: 30, label: 'Critical Risk', color: Colors.error },
  { min: 31, max: 50, label: 'At Risk', color: Colors.warning },
  { min: 51, max: 70, label: 'Stable', color: Colors.info },
  { min: 71, max: 85, label: 'Loyal', color: Colors.success },
  { min: 86, max: 100, label: 'Core Supporter', color: Colors.gold },
];

function getLoyaltyBand(loyalty: number) {
  return LOYALTY_BANDS.find(b => loyalty >= b.min && loyalty <= b.max) || LOYALTY_BANDS[4];
}

export default function WhipManagementScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, whipEvents, triggerWhipWarning, recordFloorCrossing, logAction } = useGame();
  const { showAlert } = useAlert();

  const [activeTab, setActiveTab] = useState<Tab>('roster');
  const [sortKey, setSortKey] = useState<SortKey>('loyalty');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedMP, setSelectedMP] = useState<CaucusMember | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [localRoster, setLocalRoster] = useState<CaucusMember[] | null>(null);
  const [showIncentiveModal, setShowIncentiveModal] = useState(false);
  const [incentiveTarget, setIncentiveTarget] = useState<CaucusMember | null>(null);

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const playerSeats = gameState.seats[gameState.playerPartyId] || 0;

  // Generate roster once per mount (or use local state if modified)
  const baseRoster = useMemo(() => generateCaucusRoster(
    gameState.playerPartyId,
    playerSeats,
    gameState.cabinet || [],
    whipEvents || []
  ), [gameState.playerPartyId, playerSeats, gameState.cabinet?.length, whipEvents.length]);

  const roster = localRoster || baseRoster;

  const updateMP = useCallback((id: string, update: Partial<CaucusMember>) => {
    setLocalRoster(prev => (prev || baseRoster).map(mp =>
      mp.id === id ? { ...mp, ...update } : mp
    ));
  }, [baseRoster]);

  // ── SORTED + FILTERED ROSTER ────────────────────────────────────────────────
  const sortedRoster = useMemo(() => {
    let filtered = roster.filter(mp =>
      !mp.isSuspended &&
      (searchQuery === '' ||
        mp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mp.riding.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    filtered = filtered.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'loyalty') cmp = a.loyalty - b.loyalty;
      else if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'role') cmp = a.role.localeCompare(b.role);
      else if (sortKey === 'rebellion') cmp = a.rebellions - b.rebellions;
      return sortAsc ? cmp : -cmp;
    });

    return filtered;
  }, [roster, searchQuery, sortKey, sortAsc]);

  // At-risk MPs
  const atRiskMPs = roster.filter(mp => mp.loyalty < 50 && !mp.isSuspended && !mp.hasCrossed);
  const rebellionHistory = whipEvents.filter(e => e.event === 'rebel_vote' || e.event === 'floor_crossing');
  const expelledMPs = roster.filter(mp => mp.isSuspended);

  // ── ACTIONS ───────────────────────────────────────────────────────────────
  const handleWarnMP = (mp: CaucusMember) => {
    showAlert(
      `Warn ${mp.name}?`,
      `Issue a formal Whip warning to ${mp.name} (Loyalty: ${mp.loyalty}%). Warnings reduce loyalty further but put the MP on notice.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Issue Warning',
          style: 'destructive',
          onPress: () => {
            triggerWhipWarning?.(mp.name, mp.loyalty);
            updateMP(mp.id, {
              loyalty: Math.max(5, mp.loyalty - 8),
              warningCount: mp.warningCount + 1,
            });
            showAlert('Warning Issued', `Formal whip warning issued to ${mp.name}.`);
          },
        },
      ]
    );
  };

  const handleExpelMP = (mp: CaucusMember) => {
    showAlert(
      `Expel ${mp.name} from Caucus?`,
      `This will remove ${mp.name} from the ${party?.name} caucus. The seat will be held by an independent MP. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Expel from Caucus',
          style: 'destructive',
          onPress: () => {
            updateMP(mp.id, { isSuspended: true, hasCrossed: false });
            logAction?.({
              action: 'MP Expelled from Caucus',
              category: 'other',
              description: `${mp.name} (${mp.riding}, ${mp.province}) expelled — seat becomes independent`,
              impact: `-1 seat for ${party?.shortName}`,
              severity: 'high',
            });
            setSelectedMP(null);
            showAlert('Expelled', `${mp.name} has been expelled from caucus and will sit as an independent. Your seat count has decreased by 1.`);
          },
        },
      ]
    );
  };

  const handleOfferIncentive = (mp: CaucusMember) => {
    setIncentiveTarget(mp);
    setShowIncentiveModal(true);
  };

  const applyIncentive = (type: string, label: string, loyaltyBonus: number) => {
    if (!incentiveTarget) return;
    const mp = incentiveTarget;
    updateMP(mp.id, {
      loyalty: Math.min(99, mp.loyalty + loyaltyBonus),
      incentiveGiven: label,
      role: type === 'committee' ? 'committee_chair' : type === 'parls' ? 'parliamentary_secretary' : mp.role,
      committeePosition: type === 'committee' ? COMMITTEE_POSITIONS[Math.floor(Math.random() * COMMITTEE_POSITIONS.length)] : mp.committeePosition,
    });
    logAction?.({
      action: 'Whip Incentive Offered',
      category: 'cabinet',
      description: `${label} offered to ${mp.name} — loyalty +${loyaltyBonus}%`,
      severity: 'low',
    });
    setShowIncentiveModal(false);
    setIncentiveTarget(null);
    showAlert('Incentive Applied', `${label} offered to ${mp.name}. Loyalty improved by +${loyaltyBonus}%.`);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(prev => !prev);
    else { setSortKey(key); setSortAsc(true); }
  };

  // ── LOYALTY SUMMARY ────────────────────────────────────────────────────────
  const loyaltySummary = useMemo(() => {
    return LOYALTY_BANDS.map(band => ({
      ...band,
      count: roster.filter(mp => mp.loyalty >= band.min && mp.loyalty <= band.max && !mp.isSuspended).length,
    }));
  }, [roster]);

  const avgLoyalty = roster.length > 0
    ? Math.round(roster.filter(m => !m.isSuspended).reduce((s, m) => s + m.loyalty, 0) / Math.max(1, roster.filter(m => !m.isSuspended).length))
    : 0;

  // ── MP DETAIL MODAL ────────────────────────────────────────────────────────
  const renderMPDetail = () => {
    if (!selectedMP) return null;
    const band = getLoyaltyBand(selectedMP.loyalty);
    return (
      <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedMP(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.mpDetailModal}>
            <View style={styles.mpDetailHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.mpDetailName}>{selectedMP.name}</Text>
                <Text style={styles.mpDetailRiding}>{selectedMP.riding}, {selectedMP.province}</Text>
                <Text style={[styles.mpDetailRole, { color: ROLE_COLORS[selectedMP.role] }]}>
                  {ROLE_LABELS[selectedMP.role]}
                </Text>
              </View>
              <Pressable onPress={() => setSelectedMP(null)} style={styles.modalCloseBtn}>
                <MaterialCommunityIcons name="close" size={20} color={Colors.textMuted} />
              </Pressable>
            </View>

            {/* Stats */}
            <View style={styles.mpDetailStats}>
              <View style={styles.mpDetailStat}>
                <Text style={[styles.mpDetailStatValue, { color: band.color }]}>{selectedMP.loyalty}%</Text>
                <Text style={styles.mpDetailStatLabel}>Loyalty</Text>
                <View style={[styles.mpDetailStatBadge, { backgroundColor: band.color + '22' }]}>
                  <Text style={[styles.mpDetailStatBadgeText, { color: band.color }]}>{band.label}</Text>
                </View>
              </View>
              <View style={styles.mpDetailStat}>
                <Text style={[styles.mpDetailStatValue, { color: Colors.info }]}>{selectedMP.competence}%</Text>
                <Text style={styles.mpDetailStatLabel}>Competence</Text>
              </View>
              <View style={styles.mpDetailStat}>
                <Text style={[styles.mpDetailStatValue, { color: Colors.textSecondary }]}>{selectedMP.seniority}yr</Text>
                <Text style={styles.mpDetailStatLabel}>Seniority</Text>
              </View>
              <View style={styles.mpDetailStat}>
                <Text style={[styles.mpDetailStatValue, { color: selectedMP.rebellions > 0 ? Colors.error : Colors.success }]}>
                  {selectedMP.rebellions}
                </Text>
                <Text style={styles.mpDetailStatLabel}>Rebellions</Text>
              </View>
            </View>

            {/* Loyalty bar */}
            <View style={styles.loyaltyBarContainer}>
              <Text style={styles.loyaltyBarLabel}>Loyalty Level</Text>
              <View style={styles.loyaltyBarBg}>
                <View style={[styles.loyaltyBarFill, {
                  width: `${selectedMP.loyalty}%` as any,
                  backgroundColor: band.color,
                }]} />
                {/* Threshold markers */}
                <View style={[styles.loyaltyMarker, { left: '30%' as any }]} />
                <View style={[styles.loyaltyMarker, { left: '50%' as any }]} />
                <View style={[styles.loyaltyMarker, { left: '70%' as any }]} />
                <View style={[styles.loyaltyMarker, { left: '85%' as any }]} />
              </View>
              <View style={styles.loyaltyMarkerLabels}>
                <Text style={[styles.loyaltyMarkerLabel, { color: Colors.error }]}>Danger</Text>
                <Text style={[styles.loyaltyMarkerLabel, { color: Colors.warning }]}>At Risk</Text>
                <Text style={[styles.loyaltyMarkerLabel, { color: Colors.info }]}>Stable</Text>
                <Text style={[styles.loyaltyMarkerLabel, { color: Colors.success }]}>Loyal</Text>
                <Text style={[styles.loyaltyMarkerLabel, { color: Colors.gold }]}>Core</Text>
              </View>
            </View>

            {selectedMP.committeePosition ? (
              <View style={styles.mpDetailCommittee}>
                <MaterialCommunityIcons name="account-group" size={12} color={Colors.success} />
                <Text style={styles.mpDetailCommitteeText}>{selectedMP.committeePosition}</Text>
              </View>
            ) : null}

            {selectedMP.incentiveGiven ? (
              <View style={styles.mpDetailIncentive}>
                <MaterialCommunityIcons name="gift" size={12} color={Colors.gold} />
                <Text style={styles.mpDetailIncentiveText}>Incentive: {selectedMP.incentiveGiven}</Text>
              </View>
            ) : null}

            {selectedMP.warningCount > 0 ? (
              <View style={styles.mpDetailWarning}>
                <MaterialCommunityIcons name="alert" size={12} color={Colors.error} />
                <Text style={styles.mpDetailWarningText}>{selectedMP.warningCount} formal warning(s) issued</Text>
              </View>
            ) : null}

            {/* Actions */}
            <Text style={styles.mpDetailActionsTitle}>WHIP ACTIONS</Text>
            <View style={styles.mpDetailActions}>
              <Pressable
                onPress={() => { setSelectedMP(null); handleWarnMP(selectedMP); }}
                style={({ pressed }) => [styles.mpAction, { backgroundColor: Colors.warning + '22', borderColor: Colors.warning + '44' }, pressed && { opacity: 0.8 }]}
              >
                <MaterialCommunityIcons name="alert-outline" size={18} color={Colors.warning} />
                <Text style={[styles.mpActionLabel, { color: Colors.warning }]}>Issue Warning</Text>
                <Text style={styles.mpActionDesc}>Loyalty −8%</Text>
              </Pressable>

              <Pressable
                onPress={() => { setSelectedMP(null); handleOfferIncentive(selectedMP); }}
                style={({ pressed }) => [styles.mpAction, { backgroundColor: Colors.success + '11', borderColor: Colors.success + '33' }, pressed && { opacity: 0.8 }]}
              >
                <MaterialCommunityIcons name="gift" size={18} color={Colors.success} />
                <Text style={[styles.mpActionLabel, { color: Colors.success }]}>Offer Incentive</Text>
                <Text style={styles.mpActionDesc}>Loyalty +bonus</Text>
              </Pressable>

              {selectedMP.loyalty < 40 ? (
                <Pressable
                  onPress={() => { setSelectedMP(null); handleExpelMP(selectedMP); }}
                  style={({ pressed }) => [styles.mpAction, { backgroundColor: Colors.error + '0D', borderColor: Colors.error + '44' }, pressed && { opacity: 0.8 }]}
                >
                  <MaterialCommunityIcons name="account-remove" size={18} color={Colors.error} />
                  <Text style={[styles.mpActionLabel, { color: Colors.error }]}>Expel from Caucus</Text>
                  <Text style={styles.mpActionDesc}>−1 seat (independent)</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ── INCENTIVE MODAL ─────────────────────────────────────────────────────────
  const renderIncentiveModal = () => {
    if (!incentiveTarget) return null;
    const incentives = [
      { type: 'committee', label: 'Committee Chair Appointment', desc: 'Appoint to chair a standing committee.', loyalty: 15, icon: 'account-group' },
      { type: 'parls', label: 'Parliamentary Secretary Role', desc: 'Appoint as parliamentary secretary to a minister.', loyalty: 12, icon: 'briefcase-outline' },
      { type: 'delegation', label: 'International Delegation', desc: 'Send on a prestigious international parliamentary delegation.', loyalty: 8, icon: 'earth' },
      { type: 'constituency', label: 'Riding Infrastructure Grant', desc: 'Priority infrastructure funding for their riding.', loyalty: 10, icon: 'home-city' },
      { type: 'speaking', label: 'Prime Question Period Slot', desc: 'Guarantee high-profile QP slots for public profile.', loyalty: 6, icon: 'microphone' },
      { type: 'caucus', label: 'Caucus Executive Role', desc: 'Appoint to caucus executive committee.', loyalty: 9, icon: 'star-circle' },
    ];

    return (
      <Modal visible={showIncentiveModal} transparent animationType="slide" onRequestClose={() => setShowIncentiveModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.incentiveModal}>
            <View style={styles.incentiveModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.incentiveModalTitle}>Offer Incentive</Text>
                <Text style={styles.incentiveModalSub}>to {incentiveTarget.name} — Current loyalty: {incentiveTarget.loyalty}%</Text>
              </View>
              <Pressable onPress={() => setShowIncentiveModal(false)} style={styles.modalCloseBtn}>
                <MaterialCommunityIcons name="close" size={18} color={Colors.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.incentiveNote}>
              Offering incentives builds loyalty and reduces rebellion risk. The Whip uses these strategically to maintain caucus discipline.
            </Text>

            {incentives.map(inc => (
              <Pressable
                key={inc.type}
                onPress={() => applyIncentive(inc.type, inc.label, inc.loyalty)}
                style={({ pressed }) => [styles.incentiveOption, pressed && { opacity: 0.8 }]}
              >
                <View style={[styles.incentiveIcon, { backgroundColor: Colors.success + '22' }]}>
                  <MaterialCommunityIcons name={inc.icon as any} size={20} color={Colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.incentiveLabel}>{inc.label}</Text>
                  <Text style={styles.incentiveDesc}>{inc.desc}</Text>
                </View>
                <View style={[styles.incentiveBonusBadge, { backgroundColor: Colors.success + '22' }]}>
                  <Text style={styles.incentiveBonusText}>+{inc.loyalty}%</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    );
  };

  // ── RENDER MP ROW ──────────────────────────────────────────────────────────
  const renderMPRow = ({ item }: { item: CaucusMember }) => {
    const band = getLoyaltyBand(item.loyalty);
    return (
      <Pressable
        onPress={() => setSelectedMP(item)}
        style={({ pressed }) => [
          styles.mpRow,
          item.loyalty < 40 && { borderColor: Colors.error + '44', backgroundColor: Colors.error + '05' },
          item.hasCrossed && { borderColor: Colors.warning + '55', backgroundColor: Colors.warning + '05' },
          pressed && { opacity: 0.85 },
        ]}
      >
        {/* Loyalty bar strip on left */}
        <View style={[styles.mpRowLoyltyBar, { backgroundColor: band.color, height: `${item.loyalty}%` as any }]} />

        <View style={styles.mpRowContent}>
          <View style={styles.mpRowTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mpRowName}>{item.name}</Text>
              <Text style={styles.mpRowRiding} numberOfLines={1}>{item.riding}, {item.province}</Text>
            </View>
            <View style={styles.mpRowRight}>
              <Text style={[styles.mpRowLoyalty, { color: band.color }]}>{item.loyalty}%</Text>
              <Text style={[styles.mpRowLoyaltyLabel, { color: band.color }]}>{band.label}</Text>
            </View>
          </View>

          <View style={styles.mpRowMeta}>
            <View style={[styles.mpRoleBadge, { backgroundColor: ROLE_COLORS[item.role] + '22' }]}>
              <Text style={[styles.mpRoleBadgeText, { color: ROLE_COLORS[item.role] }]}>
                {ROLE_LABELS[item.role]}
              </Text>
            </View>
            {item.rebellions > 0 ? (
              <View style={styles.rebellionBadge}>
                <MaterialCommunityIcons name="vote-outline" size={9} color={Colors.error} />
                <Text style={styles.rebellionBadgeText}>{item.rebellions} rebel vote{item.rebellions > 1 ? 's' : ''}</Text>
              </View>
            ) : null}
            {item.committeePosition ? (
              <View style={styles.committeeBadge}>
                <MaterialCommunityIcons name="account-group" size={9} color={Colors.success} />
                <Text style={styles.committeeBadgeText} numberOfLines={1}>Cmte. Chair</Text>
              </View>
            ) : null}
            {item.hasCrossed ? (
              <View style={[styles.rebellionBadge, { backgroundColor: Colors.warning + '22' }]}>
                <MaterialCommunityIcons name="transfer-right" size={9} color={Colors.warning} />
                <Text style={[styles.rebellionBadgeText, { color: Colors.warning }]}>Crossed floor</Text>
              </View>
            ) : null}
          </View>

          {/* Loyalty bar */}
          <View style={styles.mpLoyaltyBarBg}>
            <View style={[styles.mpLoyaltyBarFill, { width: `${item.loyalty}%` as any, backgroundColor: band.color }]} />
          </View>
        </View>

        <MaterialCommunityIcons name="chevron-right" size={14} color={Colors.textMuted} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: partyColor + '44' }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Party Whip Management</Text>
          <Text style={styles.headerSub}>{party?.name} Caucus — {playerSeats} MPs</Text>
        </View>
        <View style={[styles.avgLoyaltyBadge, {
          backgroundColor: avgLoyalty > 65 ? Colors.success + '22' : avgLoyalty > 45 ? Colors.warning + '22' : Colors.error + '22',
        }]}>
          <Text style={[styles.avgLoyaltyLabel, {
            color: avgLoyalty > 65 ? Colors.success : avgLoyalty > 45 ? Colors.warning : Colors.error,
          }]}>Avg {avgLoyalty}%</Text>
        </View>
      </View>

      {/* Loyalty summary bar */}
      <View style={styles.loyaltySummary}>
        {loyaltySummary.map(band => (
          <View key={band.label} style={[styles.loyaltySummaryItem, { flex: Math.max(1, band.count) }]}>
            <View style={[styles.loyaltySumBar, { backgroundColor: band.color }]} />
            <Text style={[styles.loyaltySumCount, { color: band.color }]}>{band.count}</Text>
            <Text style={styles.loyaltySumLabel}>{band.label.split(' ')[0]}</Text>
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['roster', 'rebels', 'history'] as Tab[]).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabBtn, activeTab === tab && { borderBottomColor: partyColor, borderBottomWidth: 2 }]}
          >
            <MaterialCommunityIcons
              name={tab === 'roster' ? 'account-group' : tab === 'rebels' ? 'vote-outline' : 'history'}
              size={14}
              color={activeTab === tab ? partyColor : Colors.textMuted}
            />
            <Text style={[styles.tabBtnText, activeTab === tab && { color: partyColor }]}>
              {tab === 'roster' ? `Roster (${sortedRoster.length})` : tab === 'rebels' ? `At Risk (${atRiskMPs.length})` : `History (${rebellionHistory.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── ROSTER TAB ───────────────────────────────────────────────────────── */}
      {activeTab === 'roster' ? (
        <>
          {/* Search + Sort */}
          <View style={styles.rosterControls}>
            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={15} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search MP or riding..."
                placeholderTextColor={Colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={15} color={Colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.sortBtns}>
              {(['loyalty', 'name', 'rebellion'] as SortKey[]).map(key => (
                <Pressable
                  key={key}
                  onPress={() => handleSort(key)}
                  style={[styles.sortBtn, sortKey === key && { backgroundColor: partyColor + '22', borderColor: partyColor }]}
                >
                  <Text style={[styles.sortBtnText, sortKey === key && { color: partyColor }]}>
                    {key === 'loyalty' ? 'Loyalty' : key === 'name' ? 'Name' : 'Rebel'}
                  </Text>
                  {sortKey === key ? (
                    <MaterialCommunityIcons name={sortAsc ? 'arrow-up' : 'arrow-down'} size={10} color={partyColor} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>

          <FlatList
            data={sortedRoster}
            keyExtractor={item => item.id}
            renderItem={renderMPRow}
            contentContainerStyle={[styles.rosterList, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <MaterialCommunityIcons name="account-off" size={36} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No MPs found</Text>
              </View>
            }
          />
        </>
      ) : null}

      {/* ── AT RISK TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'rebels' ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {atRiskMPs.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="check-circle" size={40} color={Colors.success} />
              <Text style={styles.emptyText}>Caucus discipline is strong. No MPs at risk.</Text>
            </View>
          ) : (
            <>
              <View style={styles.riskAlert}>
                <MaterialCommunityIcons name="alert-circle" size={15} color={Colors.error} />
                <Text style={styles.riskAlertText}>
                  {atRiskMPs.length} MP{atRiskMPs.length > 1 ? 's' : ''} with loyalty below 50% — risk of rebel votes or floor crossing.
                </Text>
              </View>

              {atRiskMPs
                .sort((a, b) => a.loyalty - b.loyalty)
                .map(mp => {
                  const band = getLoyaltyBand(mp.loyalty);
                  return (
                    <View key={mp.id} style={[styles.riskCard, { borderColor: band.color + '44' }]}>
                      <View style={styles.riskCardLeft}>
                        <Text style={styles.riskMPName}>{mp.name}</Text>
                        <Text style={styles.riskMPRiding}>{mp.riding}, {mp.province}</Text>
                        <View style={styles.riskMeta}>
                          <View style={[styles.mpRoleBadge, { backgroundColor: ROLE_COLORS[mp.role] + '22' }]}>
                            <Text style={[styles.mpRoleBadgeText, { color: ROLE_COLORS[mp.role] }]}>{ROLE_LABELS[mp.role]}</Text>
                          </View>
                          {mp.rebellions > 0 ? (
                            <Text style={styles.riskRebellions}>{mp.rebellions} rebel vote(s)</Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.riskCardRight}>
                        <Text style={[styles.riskLoyalty, { color: band.color }]}>{mp.loyalty}%</Text>
                        <Text style={[styles.riskLoyaltyLabel, { color: band.color }]}>{band.label}</Text>
                        <View style={styles.riskActions}>
                          <Pressable
                            onPress={() => handleWarnMP(mp)}
                            style={({ pressed }) => [styles.riskActionBtn, { backgroundColor: Colors.warning + '22' }, pressed && { opacity: 0.8 }]}
                          >
                            <MaterialCommunityIcons name="alert-outline" size={13} color={Colors.warning} />
                            <Text style={[styles.riskActionBtnText, { color: Colors.warning }]}>Warn</Text>
                          </Pressable>
                          <Pressable
                            onPress={() => handleOfferIncentive(mp)}
                            style={({ pressed }) => [styles.riskActionBtn, { backgroundColor: Colors.success + '22' }, pressed && { opacity: 0.8 }]}
                          >
                            <MaterialCommunityIcons name="gift" size={13} color={Colors.success} />
                            <Text style={[styles.riskActionBtnText, { color: Colors.success }]}>Incentive</Text>
                          </Pressable>
                        </View>
                        {mp.loyalty < 30 ? (
                          <Pressable
                            onPress={() => handleExpelMP(mp)}
                            style={({ pressed }) => [styles.expelBtn, pressed && { opacity: 0.8 }]}
                          >
                            <MaterialCommunityIcons name="account-remove" size={11} color={Colors.error} />
                            <Text style={styles.expelBtnText}>Expel</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  );
                })}

              {/* Expelled MPs */}
              {expelledMPs.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>EXPELLED MEMBERS</Text>
                  {expelledMPs.map(mp => (
                    <View key={mp.id} style={[styles.riskCard, { borderColor: Colors.textMuted + '44', opacity: 0.7 }]}>
                      <MaterialCommunityIcons name="account-off" size={14} color={Colors.textMuted} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.riskMPName, { color: Colors.textMuted }]}>{mp.name}</Text>
                        <Text style={styles.riskMPRiding}>{mp.riding}, {mp.province} — Sitting as Independent</Text>
                      </View>
                    </View>
                  ))}
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      ) : null}

      {/* ── HISTORY TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'history' ? (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {rebellionHistory.length === 0 ? (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="history" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No caucus discipline incidents recorded yet.</Text>
            </View>
          ) : (
            <>
              <View style={styles.historyStats}>
                <View style={styles.historyStat}>
                  <Text style={[styles.historyStatValue, { color: Colors.error }]}>
                    {whipEvents.filter(e => e.event === 'floor_crossing').length}
                  </Text>
                  <Text style={styles.historyStatLabel}>Floor Crossings</Text>
                </View>
                <View style={styles.historyStat}>
                  <Text style={[styles.historyStatValue, { color: Colors.warning }]}>
                    {whipEvents.filter(e => e.event === 'rebel_vote').length}
                  </Text>
                  <Text style={styles.historyStatLabel}>Rebel Votes</Text>
                </View>
                <View style={styles.historyStat}>
                  <Text style={[styles.historyStatValue, { color: Colors.textMuted }]}>
                    {whipEvents.filter(e => e.event === 'warned').length}
                  </Text>
                  <Text style={styles.historyStatLabel}>Warnings</Text>
                </View>
                <View style={styles.historyStat}>
                  <Text style={[styles.historyStatValue, { color: Colors.error }]}>
                    {whipEvents.filter(e => e.event === 'expelled').length}
                  </Text>
                  <Text style={styles.historyStatLabel}>Expelled</Text>
                </View>
              </View>

              {whipEvents.map((ev, idx) => {
                const evColor = ev.event === 'floor_crossing' ? Colors.error
                  : ev.event === 'rebel_vote' ? Colors.warning
                  : ev.event === 'expelled' ? Colors.error
                  : Colors.textMuted;
                const evIcon = ev.event === 'floor_crossing' ? 'transfer-right'
                  : ev.event === 'rebel_vote' ? 'vote-outline'
                  : ev.event === 'expelled' ? 'account-remove'
                  : 'alert-outline';
                return (
                  <View key={idx} style={[styles.historyEntry, { borderLeftColor: evColor }]}>
                    <View style={[styles.historyEntryIcon, { backgroundColor: evColor + '22' }]}>
                      <MaterialCommunityIcons name={evIcon as any} size={14} color={evColor} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyEntryName}>{ev.mpName}</Text>
                      <Text style={styles.historyEntryDesc}>{ev.description}</Text>
                    </View>
                    <Text style={styles.historyEntryWeek}>W{ev.week}</Text>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      ) : null}

      {/* Modals */}
      {renderMPDetail()}
      {renderIncentiveModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, backgroundColor: Colors.surface },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  avgLoyaltyBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  avgLoyaltyLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  loyaltySummary: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: 8, gap: 4 },
  loyaltySummaryItem: { alignItems: 'center', gap: 2, minWidth: 44 },
  loyaltySumBar: { height: 4, width: '80%', borderRadius: 2 },
  loyaltySumCount: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold },
  loyaltySumLabel: { fontSize: 8, color: Colors.textMuted, textAlign: 'center' },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textMuted },
  content: { padding: Spacing.md, gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5, marginTop: 8 },
  rosterControls: { padding: Spacing.sm, gap: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: Colors.surfaceBorder },
  searchInput: { flex: 1, fontSize: FontSize.xs, color: Colors.textPrimary },
  sortBtns: { flexDirection: 'row', gap: 6 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  sortBtnText: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
  rosterList: { padding: Spacing.sm, gap: 6 },
  mpRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingVertical: Spacing.sm, paddingRight: Spacing.sm, overflow: 'hidden' },
  mpRowLoyltyBar: { width: 4, borderRadius: 2, marginRight: 6, marginLeft: 4, alignSelf: 'flex-end', minHeight: 8 },
  mpRowContent: { flex: 1, gap: 4 },
  mpRowTop: { flexDirection: 'row', alignItems: 'flex-start' },
  mpRowName: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  mpRowRiding: { fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  mpRowRight: { alignItems: 'flex-end' },
  mpRowLoyalty: { fontSize: FontSize.base, fontWeight: FontWeight.extrabold },
  mpRowLoyaltyLabel: { fontSize: 9, fontWeight: FontWeight.medium },
  mpRowMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  mpRoleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  mpRoleBadgeText: { fontSize: 8, fontWeight: FontWeight.bold },
  rebellionBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: Radius.full, backgroundColor: Colors.error + '22' },
  rebellionBadgeText: { fontSize: 8, fontWeight: FontWeight.bold, color: Colors.error },
  committeeBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 5, paddingVertical: 2, borderRadius: Radius.full, backgroundColor: Colors.success + '22' },
  committeeBadgeText: { fontSize: 8, color: Colors.success, fontWeight: FontWeight.medium },
  mpLoyaltyBarBg: { height: 3, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden' },
  mpLoyaltyBarFill: { height: '100%', borderRadius: 2 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: Spacing.lg },
  // At Risk tab
  riskAlert: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.error + '0D', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.error + '33' },
  riskAlertText: { flex: 1, fontSize: FontSize.xs, color: Colors.error, lineHeight: 17 },
  riskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.sm, gap: 8 },
  riskCardLeft: { flex: 1, gap: 4 },
  riskMPName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  riskMPRiding: { fontSize: 10, color: Colors.textMuted },
  riskMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  riskRebellions: { fontSize: 9, color: Colors.error, fontWeight: FontWeight.bold },
  riskCardRight: { alignItems: 'flex-end', gap: 4 },
  riskLoyalty: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  riskLoyaltyLabel: { fontSize: 9, fontWeight: FontWeight.bold },
  riskActions: { flexDirection: 'row', gap: 4 },
  riskActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 4, borderRadius: Radius.sm },
  riskActionBtnText: { fontSize: 9, fontWeight: FontWeight.bold },
  expelBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.error + '11', paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.error + '44' },
  expelBtnText: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.error },
  // History tab
  historyStats: { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, marginBottom: 4 },
  historyStat: { flex: 1, alignItems: 'center' },
  historyStatValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  historyStatLabel: { fontSize: 9, color: Colors.textMuted, textAlign: 'center', marginTop: 2 },
  historyEntry: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, borderLeftWidth: 3, padding: Spacing.sm },
  historyEntryIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  historyEntryName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  historyEntryDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16, marginTop: 2 },
  historyEntryWeek: { fontSize: FontSize.xs, color: Colors.textMuted },
  // MP Detail Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  mpDetailModal: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, gap: Spacing.sm, maxHeight: '85%' },
  mpDetailHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  mpDetailName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  mpDetailRiding: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  mpDetailRole: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, marginTop: 4 },
  modalCloseBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  mpDetailStats: { flexDirection: 'row', backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, padding: Spacing.md },
  mpDetailStat: { flex: 1, alignItems: 'center', gap: 2 },
  mpDetailStatValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  mpDetailStatLabel: { fontSize: 9, color: Colors.textMuted },
  mpDetailStatBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full, marginTop: 2 },
  mpDetailStatBadgeText: { fontSize: 8, fontWeight: FontWeight.bold },
  loyaltyBarContainer: { gap: 6 },
  loyaltyBarLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted },
  loyaltyBarBg: { height: 12, backgroundColor: Colors.surfaceBorder, borderRadius: 6, overflow: 'visible', position: 'relative' },
  loyaltyBarFill: { height: '100%', borderRadius: 6, position: 'absolute', left: 0 },
  loyaltyMarker: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: Colors.background + 'AA' },
  loyaltyMarkerLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  loyaltyMarkerLabel: { fontSize: 8, fontWeight: FontWeight.medium },
  mpDetailCommittee: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.success + '0D', borderRadius: Radius.sm, padding: 6 },
  mpDetailCommitteeText: { fontSize: FontSize.xs, color: Colors.success },
  mpDetailIncentive: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.gold + '0D', borderRadius: Radius.sm, padding: 6 },
  mpDetailIncentiveText: { fontSize: FontSize.xs, color: Colors.gold },
  mpDetailWarning: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.error + '0D', borderRadius: Radius.sm, padding: 6 },
  mpDetailWarningText: { fontSize: FontSize.xs, color: Colors.error },
  mpDetailActionsTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  mpDetailActions: { gap: Spacing.sm },
  mpAction: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md },
  mpActionLabel: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  mpActionDesc: { fontSize: FontSize.xs, color: Colors.textMuted },
  // Incentive Modal
  incentiveModal: { backgroundColor: Colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: Spacing.lg, gap: Spacing.sm, maxHeight: '80%' },
  incentiveModalHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  incentiveModalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  incentiveModalSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  incentiveNote: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, padding: Spacing.sm },
  incentiveOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm },
  incentiveIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  incentiveLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  incentiveDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, lineHeight: 16 },
  incentiveBonusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  incentiveBonusText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, color: Colors.success },
});
