// Powered by OnSpace.AI — Party Whip Screen
// Caucus members with loyalty ratings, whip warnings, rebel MPs, floor-crossing, expulsion
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';

interface CaucusMember {
  id: string;
  name: string;
  province: string;
  riding: string;
  loyalty: number; // 0-100
  attendance: number; // 0-100
  isRebel: boolean;
  isWarned: boolean;
  hasFloorCrossed: boolean;
  rebelCount: number;
  portfolioShadow: string | null;
  isMinister: boolean;
  yearsAsMP: number;
}

const PROVINCES = ['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE', 'YT', 'NT', 'NU'];
const FIRST_NAMES = [
  'James', 'Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Emily', 'William', 'Amanda',
  'Hassan', 'Priya', 'Marcus', 'Claire', 'Jean-François', 'Aisha', 'Derek', 'Monica', 'Tyler', 'Nadia',
  'Kevin', 'Rachel', 'André', 'Fatima', 'Patrick', 'Maria', 'François', 'Wei', 'Diane', 'Carlos',
  'Sandra', 'Thomas', 'Anita', 'Raymond', 'Janet', 'Roderick', 'Louise', 'Ibrahim', 'Grace', 'Ivan',
];
const LAST_NAMES = [
  'Chen', 'Williams', 'MacDonald', 'Tremblay', 'Singh', 'Okafor', 'Leblanc', 'Park', 'Wilson', 'Kumar',
  'Bergeron', 'Patel', 'Thompson', 'Dupont', 'Fraser', 'Nguyen', 'Morrison', 'Lapointe', 'Santos', 'Kim',
  'Fontaine', 'Ahmed', 'Richardson', 'Bouchard', 'Walsh', 'Sharma', 'Martin', 'Kowalski', 'Crawford', 'Li',
  'Sinclair', 'Beaumont', 'Whitmore', 'Rajput', 'Kowalski', 'Moreau', 'Tran', 'Nguyen', 'Lebrun', 'Diallo',
];

const RIDING_NAMES: Record<string, string[]> = {
  ON: ['Toronto Centre', 'Ottawa West', 'Hamilton East', 'Mississauga North', 'Brampton East', 'Kingston', 'Barrie'],
  QC: ['Montréal Centre', 'Québec Est', 'Laval Nord', 'Sherbrooke', 'Gatineau', 'Jonquière'],
  BC: ['Vancouver Centre', 'Surrey North', 'Burnaby East', 'Victoria', 'Kelowna', 'Prince George'],
  AB: ['Calgary Centre', 'Edmonton North', 'Red Deer', 'Lethbridge', 'Fort McMurray'],
  MB: ['Winnipeg Centre', 'Brandon East', 'Portage—Lisgar'],
  SK: ['Saskatoon East', 'Regina North', 'Moose Jaw'],
  NS: ['Halifax Centre', 'Cape Breton', 'Annapolis Valley'],
  NB: ['Fredericton', 'Moncton East', 'Saint John'],
  NL: ['St. John\'s East', 'Avalon', 'Labrador'],
  PE: ['Malpeque', 'Charlottetown'],
  YT: ['Yukon'], NT: ['Northwest Territories'], NU: ['Nunavut'],
};

function generateMPName(seed: number): string {
  const first = FIRST_NAMES[seed % FIRST_NAMES.length];
  const last = LAST_NAMES[Math.floor(seed * 1.7) % LAST_NAMES.length];
  return `${first} ${last}`;
}

function generateCaucus(seats: number, partyId: string, cabinetMembers: string[]): CaucusMember[] {
  const members: CaucusMember[] = [];
  let seatCounter = 0;

  PROVINCES.forEach(prov => {
    const provRidings = RIDING_NAMES[prov] || [`${prov} Riding`];
    const provCount = Math.max(0, Math.round((seats / 338) * (prov === 'ON' ? 40 : prov === 'QC' ? 30 : prov === 'BC' ? 15 : prov === 'AB' ? 12 : 5)));

    for (let i = 0; i < Math.min(provCount, provRidings.length); i++) {
      if (seatCounter >= seats) break;
      const seed = seatCounter * 7 + i * 3;
      const name = generateMPName(seed);
      const isMinister = cabinetMembers.some(m => m.toLowerCase().includes(name.toLowerCase().split(' ')[1]));
      const loyalty = isMinister ? 70 + Math.floor(Math.random() * 25) : 30 + Math.floor(Math.random() * 60);
      const rebelCount = loyalty < 40 ? Math.floor(Math.random() * 4) : loyalty < 55 ? Math.floor(Math.random() * 2) : 0;

      members.push({
        id: `mp_${partyId}_${seatCounter}`,
        name,
        province: prov,
        riding: provRidings[i % provRidings.length] || `${prov} Riding ${i + 1}`,
        loyalty,
        attendance: 60 + Math.floor(Math.random() * 35),
        isRebel: rebelCount > 2,
        isWarned: loyalty < 40 && rebelCount > 0,
        hasFloorCrossed: false,
        rebelCount,
        portfolioShadow: null,
        isMinister,
        yearsAsMP: 1 + Math.floor(Math.random() * 15),
      });
      seatCounter++;
    }
  });

  // Fill remaining seats
  while (seatCounter < seats && seatCounter < 100) {
    const seed = seatCounter * 13;
    members.push({
      id: `mp_${partyId}_${seatCounter}`,
      name: generateMPName(seed),
      province: PROVINCES[seatCounter % PROVINCES.length],
      riding: `Riding ${seatCounter + 1}`,
      loyalty: 35 + Math.floor(Math.random() * 55),
      attendance: 65 + Math.floor(Math.random() * 30),
      isRebel: Math.random() < 0.1,
      isWarned: Math.random() < 0.08,
      hasFloorCrossed: false,
      rebelCount: Math.floor(Math.random() * 3),
      portfolioShadow: null,
      isMinister: false,
      yearsAsMP: 1 + Math.floor(Math.random() * 10),
    });
    seatCounter++;
  }

  return members;
}

type WhipFilter = 'all' | 'loyal' | 'rebel' | 'warned' | 'ministers';

export default function PartyWhipScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, whipEvents, triggerWhipWarning, recordFloorCrossing } = useGame();
  const { showAlert } = useAlert();

  const [filter, setFilter] = useState<WhipFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<CaucusMember | null>(null);

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const playerSeats = gameState.seats[gameState.playerPartyId] || 0;
  const cabinetMemberNames = gameState.cabinet.map(m => m.name);

  const caucus = useMemo(() =>
    generateCaucus(Math.min(playerSeats, 100), gameState.playerPartyId, cabinetMemberNames),
    [playerSeats, gameState.playerPartyId]
  );

  const loyalMembers = caucus.filter(m => m.loyalty >= 70);
  const rebelMembers = caucus.filter(m => m.isRebel || m.loyalty < 40);
  const warnedMembers = caucus.filter(m => m.isWarned);
  const avgLoyalty = Math.round(caucus.reduce((s, m) => s + m.loyalty, 0) / Math.max(1, caucus.length));

  const filteredCaucus = caucus.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.riding.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.province.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' ? true
      : filter === 'loyal' ? m.loyalty >= 70
      : filter === 'rebel' ? (m.isRebel || m.loyalty < 40)
      : filter === 'warned' ? m.isWarned
      : filter === 'ministers' ? m.isMinister
      : true;
    return matchesSearch && matchesFilter;
  });

  const getLoyaltyColor = (loyalty: number) => {
    if (loyalty >= 75) return Colors.success;
    if (loyalty >= 55) return Colors.info;
    if (loyalty >= 40) return Colors.warning;
    return Colors.error;
  };

  const getLoyaltyLabel = (loyalty: number) => {
    if (loyalty >= 80) return 'LOYAL';
    if (loyalty >= 65) return 'SUPPORTIVE';
    if (loyalty >= 50) return 'UNCERTAIN';
    if (loyalty >= 35) return 'DISLOYAL';
    return 'REBEL';
  };

  const handleIssueWhipWarning = (member: CaucusMember) => {
    showAlert(
      `Issue Whip Warning to ${member.name}?`,
      `${member.name} (${member.riding}) has a loyalty score of ${member.loyalty}/100 and has rebelled ${member.rebelCount} time(s).\n\nA formal whip warning will be placed on their file. Continued rebellion can result in removal from caucus.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Issue Warning',
          onPress: () => {
            triggerWhipWarning?.(member.name, member.loyalty);
            setSelectedMember(null);
            showAlert('Warning Issued', `${member.name} has received a formal party whip warning. Their future voting behaviour will be monitored.`);
          },
        },
      ]
    );
  };

  const handleFloorCrossing = (member: CaucusMember) => {
    const rivalParties = PARTIES.filter(p => p.id !== gameState.playerPartyId && (gameState.seats[p.id] || 0) > 0);
    if (rivalParties.length === 0) return;

    showAlert(
      `Floor Crossing — ${member.name}`,
      `You can facilitate ${member.name} crossing the floor to another party, or they may do so independently.\n\n⚠️ This will cost your party 1 seat and reduce approval.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Allow Floor Crossing',
          style: 'destructive',
          onPress: () => {
            const targetParty = rivalParties[0];
            recordFloorCrossing?.(member.name, gameState.playerPartyId, targetParty.id);
            setSelectedMember(null);
            showAlert(
              'MP Crosses the Floor',
              `${member.name} has crossed the floor from ${party?.name} to ${targetParty.name}. This costs your party 1 seat.`
            );
          },
        },
      ]
    );
  };

  const handleExpelFromCaucus = (member: CaucusMember) => {
    showAlert(
      `Expel ${member.name} from Caucus?`,
      `Expelling ${member.name} removes them from the caucus. They will sit as an Independent MP. Your party loses 1 effective seat.\n\nThis is a drastic measure — use only for serious disciplinary situations.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Expel from Caucus',
          style: 'destructive',
          onPress: () => {
            recordFloorCrossing?.(member.name, gameState.playerPartyId, 'independent');
            setSelectedMember(null);
            showAlert('MP Expelled', `${member.name} has been expelled from the ${party?.name} caucus and will sit as an Independent.`);
          },
        },
      ]
    );
  };

  const handleOfferFloorCross = (member: CaucusMember) => {
    // Opposition strategy: convince someone to cross TO us
    showAlert(
      `Recruit ${member.name}?`,
      `You can reach out to this member about potentially crossing the floor to ${party?.name}. Success depends on their current party's standing.\n\nThis is a major diplomatic operation — media coverage is likely.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Initiate Approach',
          onPress: () => {
            const success = Math.random() > 0.65;
            if (success) {
              showAlert('Floor Crossing Successful', `${member.name} has agreed to cross the floor to ${party?.name}. Your caucus grows by 1 seat!`);
            } else {
              showAlert('Approach Rejected', `${member.name} declined to cross the floor. They may have shared your approach with their whip. Media coverage is possible.`);
            }
            setSelectedMember(null);
          },
        },
      ]
    );
  };

  // ── MEMBER DETAIL ────────────────────────────────────────────────────────────
  if (selectedMember) {
    const loyaltyColor = getLoyaltyColor(selectedMember.loyalty);
    const loyaltyLabel = getLoyaltyLabel(selectedMember.loyalty);
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setSelectedMember(null)} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{selectedMember.name}</Text>
            <Text style={styles.headerSub}>{selectedMember.riding} · {selectedMember.province}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Loyalty gauge */}
          <View style={[styles.loyaltyCard, { borderColor: loyaltyColor + '44' }]}>
            <View style={styles.loyaltyCardHeader}>
              <MaterialCommunityIcons name="account-check" size={20} color={loyaltyColor} />
              <View style={{ flex: 1 }}>
                <Text style={styles.mpName}>{selectedMember.name}</Text>
                <Text style={styles.mpMeta}>
                  {selectedMember.isMinister ? 'Cabinet Minister · ' : ''}{selectedMember.yearsAsMP} yrs as MP
                </Text>
              </View>
              <View style={[styles.loyaltyBadge, { backgroundColor: loyaltyColor + '22' }]}>
                <Text style={[styles.loyaltyBadgeText, { color: loyaltyColor }]}>{loyaltyLabel}</Text>
              </View>
            </View>
            <View style={styles.loyaltyBarRow}>
              <Text style={styles.loyaltyBarLabel}>LOYALTY</Text>
              <View style={styles.loyaltyBar}>
                <View style={[styles.loyaltyBarFill, { flex: selectedMember.loyalty, backgroundColor: loyaltyColor }]} />
                <View style={{ flex: 100 - selectedMember.loyalty }} />
              </View>
              <Text style={[styles.loyaltyBarValue, { color: loyaltyColor }]}>{selectedMember.loyalty}/100</Text>
            </View>
            <View style={styles.loyaltyBarRow}>
              <Text style={styles.loyaltyBarLabel}>ATTENDANCE</Text>
              <View style={styles.loyaltyBar}>
                <View style={[styles.loyaltyBarFill, { flex: selectedMember.attendance, backgroundColor: Colors.info }]} />
                <View style={{ flex: 100 - selectedMember.attendance }} />
              </View>
              <Text style={[styles.loyaltyBarValue, { color: Colors.info }]}>{selectedMember.attendance}%</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.mpStatsRow}>
            <View style={styles.mpStatCard}>
              <Text style={[styles.mpStatValue, { color: Colors.error }]}>{selectedMember.rebelCount}</Text>
              <Text style={styles.mpStatLabel}>Rebel Votes</Text>
            </View>
            <View style={styles.mpStatCard}>
              <Text style={[styles.mpStatValue, { color: Colors.warning }]}>{selectedMember.isWarned ? '1' : '0'}</Text>
              <Text style={styles.mpStatLabel}>Warnings</Text>
            </View>
            <View style={styles.mpStatCard}>
              <Text style={[styles.mpStatValue, { color: Colors.gold }]}>{selectedMember.yearsAsMP}</Text>
              <Text style={styles.mpStatLabel}>Yrs as MP</Text>
            </View>
          </View>

          {/* Status flags */}
          {selectedMember.isRebel ? (
            <View style={styles.flagCard}>
              <MaterialCommunityIcons name="alert-circle" size={14} color={Colors.error} />
              <Text style={styles.flagText}>Classified as a rebel MP — has voted against the party multiple times.</Text>
            </View>
          ) : null}
          {selectedMember.isWarned ? (
            <View style={[styles.flagCard, { backgroundColor: Colors.warning + '0D', borderColor: Colors.warning + '33' }]}>
              <MaterialCommunityIcons name="alert" size={14} color={Colors.warning} />
              <Text style={[styles.flagText, { color: Colors.warning }]}>Has received a formal whip warning.</Text>
            </View>
          ) : null}
          {selectedMember.isMinister ? (
            <View style={[styles.flagCard, { backgroundColor: Colors.success + '0D', borderColor: Colors.success + '33' }]}>
              <MaterialCommunityIcons name="briefcase" size={14} color={Colors.success} />
              <Text style={[styles.flagText, { color: Colors.success }]}>Cabinet Minister — removal would trigger by-election and media attention.</Text>
            </View>
          ) : null}

          {/* Actions */}
          <Text style={styles.sectionLabel}>WHIP ACTIONS</Text>
          <Pressable
            onPress={() => handleIssueWhipWarning(selectedMember)}
            style={({ pressed }) => [styles.actionBtn, { borderColor: Colors.warning + '55' }, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="alert-box" size={18} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionBtnLabel, { color: Colors.warning }]}>Issue Formal Whip Warning</Text>
              <Text style={styles.actionBtnDesc}>Places a formal warning on their party file. Public record if they rebel again.</Text>
            </View>
          </Pressable>

          {selectedMember.loyalty < 35 ? (
            <Pressable
              onPress={() => handleExpelFromCaucus(selectedMember)}
              style={({ pressed }) => [styles.actionBtn, { borderColor: Colors.error + '55' }, pressed && { opacity: 0.85 }]}
            >
              <MaterialCommunityIcons name="account-remove" size={18} color={Colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionBtnLabel, { color: Colors.error }]}>Expel from Caucus</Text>
                <Text style={styles.actionBtnDesc}>Remove from the party caucus. They sit as Independent. You lose 1 effective seat.</Text>
              </View>
            </Pressable>
          ) : null}

          {selectedMember.loyalty < 45 && !selectedMember.isMinister ? (
            <Pressable
              onPress={() => handleFloorCrossing(selectedMember)}
              style={({ pressed }) => [styles.actionBtn, { borderColor: Colors.error + '33' }, pressed && { opacity: 0.85 }]}
            >
              <MaterialCommunityIcons name="transfer" size={18} color={Colors.error} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.actionBtnLabel, { color: Colors.error }]}>Manage Floor Crossing</Text>
                <Text style={styles.actionBtnDesc}>This MP is at risk of crossing the floor. Address the situation proactively.</Text>
              </View>
            </Pressable>
          ) : null}

          <Pressable
            onPress={() => {
              showAlert(
                'Meet with MP',
                `Schedule a private meeting with ${selectedMember.name} to discuss their concerns. This costs political capital but builds loyalty.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Schedule Meeting (+8 loyalty)',
                    onPress: () => {
                      setSelectedMember(null);
                      showAlert('Meeting Scheduled', `Your meeting with ${selectedMember.name} is scheduled for this week. Loyalty improved.`);
                    },
                  },
                ]
              );
            }}
            style={({ pressed }) => [styles.actionBtn, { borderColor: Colors.success + '44' }, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="account-voice" size={18} color={Colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionBtnLabel, { color: Colors.success }]}>Private Meeting</Text>
              <Text style={styles.actionBtnDesc}>Meet privately with this MP to address their concerns and build loyalty.</Text>
            </View>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // ── MAIN LIST ────────────────────────────────────────────────────────────────
  const filters: { id: WhipFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All MPs', count: caucus.length },
    { id: 'loyal', label: 'Loyal', count: loyalMembers.length },
    { id: 'rebel', label: 'Rebels', count: rebelMembers.length },
    { id: 'warned', label: 'Warned', count: warnedMembers.length },
    { id: 'ministers', label: 'Ministers', count: caucus.filter(m => m.isMinister).length },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Party Whip — Caucus</Text>
          <Text style={styles.headerSub}>{playerSeats} MPs · Avg loyalty {avgLoyalty}%</Text>
        </View>
        <View style={[styles.loyaltyOverallBadge, { backgroundColor: getLoyaltyColor(avgLoyalty) + '22' }]}>
          <Text style={[styles.loyaltyOverallText, { color: getLoyaltyColor(avgLoyalty) }]}>{avgLoyalty}%</Text>
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.success }]}>{loyalMembers.length}</Text>
          <Text style={styles.summaryLabel}>Loyal</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.error }]}>{rebelMembers.length}</Text>
          <Text style={styles.summaryLabel}>Rebels</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.warning }]}>{warnedMembers.length}</Text>
          <Text style={styles.summaryLabel}>Warned</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.gold }]}>{caucus.filter(m => m.isMinister).length}</Text>
          <Text style={styles.summaryLabel}>Ministers</Text>
        </View>
      </View>

      {/* Recent whip events */}
      {whipEvents.length > 0 ? (
        <View style={styles.whipEventBanner}>
          <MaterialCommunityIcons name="alert-circle" size={13} color={Colors.error} />
          <Text style={styles.whipEventText} numberOfLines={1}>
            Latest: {whipEvents[0].description}
          </Text>
        </View>
      ) : null}

      {/* Search + filter */}
      <View style={styles.searchBar}>
        <MaterialCommunityIcons name="magnify" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search MPs..."
          placeholderTextColor={Colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScrollContainer}
        contentContainerStyle={styles.filterRow}
      >
        {filters.map(f => (
          <Pressable
            key={f.id}
            onPress={() => setFilter(f.id)}
            style={[styles.filterChip, filter === f.id && [styles.filterChipActive, { borderColor: partyColor }]]}
          >
            <Text style={[styles.filterChipText, filter === f.id && { color: partyColor, fontWeight: FontWeight.bold }]}>
              {f.label}
            </Text>
            {f.count > 0 ? (
              <View style={[styles.filterCount, filter === f.id && { backgroundColor: partyColor }]}>
                <Text style={styles.filterCountText}>{f.count}</Text>
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {filteredCaucus.map(member => {
          const loyaltyColor = getLoyaltyColor(member.loyalty);
          const loyaltyLabel = getLoyaltyLabel(member.loyalty);
          return (
            <Pressable
              key={member.id}
              onPress={() => setSelectedMember(member)}
              style={({ pressed }) => [
                styles.memberCard,
                member.isRebel && { borderColor: Colors.error + '44' },
                member.isWarned && { borderColor: Colors.warning + '44' },
                pressed && { opacity: 0.85 },
              ]}
            >
              <View style={[styles.memberLoyaltyBar, { backgroundColor: loyaltyColor }]} style={{ width: 4, backgroundColor: loyaltyColor, alignSelf: 'stretch', borderRadius: 2, marginRight: Spacing.sm }} />
              <View style={{ flex: 1 }}>
                <View style={styles.memberHeaderRow}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {member.isMinister ? <MaterialCommunityIcons name="briefcase" size={11} color={Colors.success} /> : null}
                    {member.isRebel ? <MaterialCommunityIcons name="alert-circle" size={11} color={Colors.error} /> : null}
                    {member.isWarned ? <MaterialCommunityIcons name="alert" size={11} color={Colors.warning} /> : null}
                  </View>
                </View>
                <Text style={styles.memberMeta}>{member.riding} · {member.province}</Text>
                <View style={styles.memberLoyaltyRow}>
                  <View style={styles.memberLoyaltyBarContainer}>
                    <View style={[styles.memberLoyaltyBarFill, { flex: member.loyalty, backgroundColor: loyaltyColor }]} />
                    <View style={{ flex: 100 - member.loyalty }} />
                  </View>
                  <Text style={[styles.memberLoyaltyValue, { color: loyaltyColor }]}>{member.loyalty}%</Text>
                  <View style={[styles.loyaltySmallBadge, { backgroundColor: loyaltyColor + '22' }]}>
                    <Text style={[styles.loyaltySmallText, { color: loyaltyColor }]}>{loyaltyLabel}</Text>
                  </View>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={14} color={Colors.textMuted} />
            </Pressable>
          );
        })}

        {filteredCaucus.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="account-group" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No MPs match this filter</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  loyaltyOverallBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
  loyaltyOverallText: { fontSize: FontSize.sm, fontWeight: FontWeight.extrabold },
  summaryBar: { flexDirection: 'row', backgroundColor: Colors.surface, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  summaryLabel: { fontSize: 10, color: Colors.textMuted },
  summaryDivider: { width: 1, height: '80%', backgroundColor: Colors.surfaceBorder, alignSelf: 'center' },
  whipEventBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md, paddingVertical: 8, backgroundColor: Colors.error + '0D', borderBottomWidth: 1, borderBottomColor: Colors.error + '22' },
  whipEventText: { flex: 1, fontSize: FontSize.xs, color: Colors.error },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md, paddingVertical: 8, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  searchInput: { flex: 1, fontSize: FontSize.xs, color: Colors.textPrimary },
  filterScrollContainer: { backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, maxHeight: 46 },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 8, alignItems: 'center', paddingVertical: 6 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  filterChipActive: {},
  filterChipText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  filterCount: { backgroundColor: Colors.textMuted, borderRadius: 8, minWidth: 16, paddingHorizontal: 4, height: 16, alignItems: 'center', justifyContent: 'center' },
  filterCountText: { fontSize: 9, fontWeight: FontWeight.bold, color: '#fff' },
  listContent: { padding: Spacing.md, gap: 6 },
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingVertical: Spacing.sm, paddingRight: Spacing.sm, overflow: 'hidden' },
  memberHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberLoyaltyBar: { width: 4, alignSelf: 'stretch' },
  memberName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary, flex: 1 },
  memberMeta: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1 },
  memberLoyaltyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  memberLoyaltyBarContainer: { flex: 1, flexDirection: 'row', height: 4, backgroundColor: Colors.surfaceBorder, borderRadius: 2, overflow: 'hidden' },
  memberLoyaltyBarFill: { height: '100%', borderRadius: 2, minWidth: 4 },
  memberLoyaltyValue: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 30 },
  loyaltySmallBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  loyaltySmallText: { fontSize: 9, fontWeight: FontWeight.bold },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted },
  // Detail
  content: { padding: Spacing.md, gap: Spacing.md },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  loyaltyCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 12 },
  loyaltyCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mpName: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  mpMeta: { fontSize: FontSize.xs, color: Colors.textSecondary },
  loyaltyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  loyaltyBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, letterSpacing: 0.5 },
  loyaltyBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loyaltyBarLabel: { fontSize: 9, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0.5, width: 75 },
  loyaltyBar: { flex: 1, flexDirection: 'row', height: 8, backgroundColor: Colors.surfaceBorder, borderRadius: 4, overflow: 'hidden' },
  loyaltyBarFill: { height: '100%', borderRadius: 4, minWidth: 4 },
  loyaltyBarValue: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, width: 50, textAlign: 'right' },
  mpStatsRow: { flexDirection: 'row', gap: Spacing.sm },
  mpStatCard: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm, alignItems: 'center', gap: 2 },
  mpStatValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  mpStatLabel: { fontSize: 9, color: Colors.textMuted },
  flagCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.error + '0D', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.error + '33' },
  flagText: { flex: 1, fontSize: FontSize.xs, color: Colors.error, lineHeight: 17 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  actionBtnLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, marginBottom: 2 },
  actionBtnDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 16 },
});
