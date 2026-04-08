// Powered by OnSpace.AI — Standing Committee System
// 10 real Canadian committees with clause-by-clause review, witnesses, amendments, filibuster, studies
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput,
  FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useGame } from '@/hooks/useGame';
import { useAlert } from '@/template';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { PARTIES } from '@/constants/parties';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

// ── 10 Real Canadian Standing Committees ────────────────────────────────────
const COMMITTEES = [
  {
    id: 'FINA',
    name: 'Finance',
    fullName: 'Standing Committee on Finance',
    acronym: 'FINA',
    mandate: 'Reviews federal budgets, taxation, fiscal policy, and public finance. Studies Main and Supplementary Estimates. Examines the Bank of Canada.',
    icon: 'cash-multiple',
    color: Colors.success,
    topics: ['Federal Budget', 'Taxation Policy', 'Bank of Canada', 'Fiscal Projections', 'Main Estimates', 'Economic Statement'],
    members: 12,
  },
  {
    id: 'JUST',
    name: 'Justice & HR',
    fullName: 'Standing Committee on Justice and Human Rights',
    acronym: 'JUST',
    mandate: 'Studies legislation related to criminal law, the judiciary, Charter rights, human rights, and the Department of Justice.',
    icon: 'scale-balance',
    color: Colors.gold,
    topics: ['Criminal Code Amendments', 'Charter Rights', 'Judicial Appointments', 'Indigenous Justice', 'RCMP Oversight'],
    members: 11,
  },
  {
    id: 'HUMA',
    name: 'Human Resources',
    fullName: 'Standing Committee on Human Resources, Skills and Social Development',
    acronym: 'HUMA',
    mandate: 'Studies employment, labour standards, social programs, housing, disability, and the Canada Labour Code.',
    icon: 'account-group',
    color: Colors.info,
    topics: ['Employment Insurance', 'Housing Policy', 'Disability Benefits', 'Labour Standards', 'Poverty Reduction'],
    members: 11,
  },
  {
    id: 'PROC',
    name: 'Procedure & HA',
    fullName: 'Standing Committee on Procedure and House Affairs',
    acronym: 'PROC',
    mandate: 'Oversees the conduct of House business, electoral matters, MP privileges, and the Standing Orders of the House of Commons.',
    icon: 'gavel',
    color: Colors.liberal,
    topics: ['Standing Orders', 'Electoral Redistribution', 'MP Privileges', 'House Operations', 'Parliamentary Reform'],
    members: 10,
  },
  {
    id: 'ETHI',
    name: 'Ethics',
    fullName: 'Standing Committee on Access to Information, Privacy and Ethics',
    acronym: 'ETHI',
    mandate: 'Studies ethics legislation, the Conflict of Interest Act, privacy laws, and the activities of the Ethics Commissioner.',
    icon: 'eye-check',
    color: Colors.warning,
    topics: ['Conflict of Interest', 'Privacy Legislation', 'Data Protection', 'Lobbying Rules', 'Ethics Commissioner'],
    members: 11,
  },
  {
    id: 'NDDN',
    name: 'National Defence',
    fullName: 'Standing Committee on National Defence',
    acronym: 'NDDN',
    mandate: 'Studies defence policy, Canadian Armed Forces operations, procurement, veterans affairs, and security alliances.',
    icon: 'shield-star',
    color: Colors.conservative,
    topics: ['CAF Procurement', 'NATO Commitments', 'Cyber Security', 'Arctic Sovereignty', 'Veterans Policy'],
    members: 11,
  },
  {
    id: 'ENVI',
    name: 'Environment',
    fullName: 'Standing Committee on Environment and Sustainable Development',
    acronym: 'ENVI',
    mandate: 'Studies environmental legislation, climate change policy, species at risk, and Canada\'s international environmental commitments.',
    icon: 'leaf',
    color: Colors.green,
    topics: ['Carbon Pricing', 'Species at Risk', 'Clean Energy Transition', 'International Climate Agreements', 'Plastic Pollution'],
    members: 11,
  },
  {
    id: 'TRAN',
    name: 'Transport',
    fullName: 'Standing Committee on Transport, Infrastructure and Communities',
    acronym: 'TRAN',
    mandate: 'Studies federal transportation, infrastructure funding, rail safety, aviation, marine shipping, and urban transit.',
    icon: 'train',
    color: Colors.ndp,
    topics: ['High-Speed Rail', 'Airport Privatization', 'Bridge and Road Infrastructure', 'Port Operations', 'Urban Transit Funding'],
    members: 11,
  },
  {
    id: 'INDU',
    name: 'Industry',
    fullName: 'Standing Committee on Industry and Technology',
    acronym: 'INDU',
    mandate: 'Studies federal economic development, innovation policy, copyright, telecommunications, and the Competition Act.',
    icon: 'factory',
    color: Colors.gold,
    topics: ['Telecom Regulation', 'Competition Policy', 'AI and Technology', 'Copyright Reform', 'Small Business Support'],
    members: 11,
  },
  {
    id: 'SDIR',
    name: 'Subcommittee on HR',
    fullName: 'Subcommittee on International Human Rights',
    acronym: 'SDIR',
    mandate: 'Studies international human rights situations, Canada\'s compliance with treaty obligations, and foreign policy human rights concerns.',
    icon: 'earth',
    color: Colors.info,
    topics: ['Uyghur Rights', 'Magnitsky Sanctions', 'UN Treaty Compliance', 'Foreign Policy Human Rights', 'Refugee Protection'],
    members: 7,
  },
];

type CommitteeView = 'list' | 'committee_detail' | 'bill_review' | 'study' | 'witness';

interface Amendment {
  id: string;
  clause: string;
  proposedBy: string;
  partyId: string;
  text: string;
  status: 'proposed' | 'adopted' | 'defeated';
  votes: { yea: number; nay: number };
}

interface Witness {
  id: string;
  name: string;
  organization: string;
  type: 'government' | 'opposition' | 'expert' | 'civil_society';
  testimony: string;
  submitted: boolean;
}

interface CommitteeStudy {
  id: string;
  committeeId: string;
  title: string;
  topic: string;
  status: 'drafting' | 'hearings' | 'deliberation' | 'report_tabled';
  weeksActive: number;
  witnesses: Witness[];
  recommendations: string[];
}

const WITNESS_POOL: Omit<Witness, 'id' | 'submitted' | 'testimony'>[] = [
  { name: 'Dr. Sarah Nguyen', organization: 'C.D. Howe Institute', type: 'expert' },
  { name: 'James Mackenzie', organization: 'Canadian Chamber of Commerce', type: 'expert' },
  { name: 'Prof. Amina Diallo', organization: 'University of Toronto, School of Public Policy', type: 'expert' },
  { name: 'Marie-Claire Bouchard', organization: 'Quebec Federation of Labour', type: 'civil_society' },
  { name: 'Chief Dene Thundercloud', organization: 'Assembly of First Nations', type: 'civil_society' },
  { name: 'Robert Singh', organization: 'Canadian Taxpayers Federation', type: 'civil_society' },
  { name: 'Deputy Minister Chris Wallace', organization: 'Privy Council Office', type: 'government' },
  { name: 'Bank of Canada Official', organization: 'Bank of Canada', type: 'government' },
  { name: 'Parliamentary Budget Officer', organization: 'Office of the PBO', type: 'expert' },
  { name: 'Auditor General Representative', organization: 'Office of the AG', type: 'government' },
];

export default function StandingCommitteeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { gameState, bills, voteOnBill } = useGame();
  const { showAlert } = useAlert();
  const supabase = getSupabaseClient();

  const [view, setView] = useState<CommitteeView>('list');
  const [selectedCommittee, setSelectedCommittee] = useState<typeof COMMITTEES[0] | null>(null);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [newAmendmentText, setNewAmendmentText] = useState('');
  const [newAmendmentClause, setNewAmendmentClause] = useState('');
  const [studies, setStudies] = useState<CommitteeStudy[]>([]);
  const [selectedStudy, setSelectedStudy] = useState<CommitteeStudy | null>(null);
  const [filibusterActive, setFilibusterActive] = useState(false);
  const [filibusterWeeks, setFilibusterWeeks] = useState(0);
  const [witnesses, setWitnesses] = useState<Witness[]>([]);
  const [studyTopic, setStudyTopic] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiTestimony, setAiTestimony] = useState('');

  if (!gameState) return null;
  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const isGoverning = gameState.isGoverning;

  // Bills at committee stage
  const committeesBills = bills.filter(b =>
    b.stage === 'house_committee' || b.stage === 'senate_committee'
  );

  // Get seat proportions for committee membership
  const totalSeats = Object.values(gameState.seats).reduce((a, b) => a + b, 0);
  const playerSeatPct = Math.round(((gameState.seats[gameState.playerPartyId] || 0) / totalSeats) * 100);

  const proposeAmendment = () => {
    if (!newAmendmentText.trim() || !newAmendmentClause.trim()) {
      showAlert('Complete Amendment', 'Provide both a clause reference and amendment text.');
      return;
    }
    const amendment: Amendment = {
      id: `amend_${Date.now()}`,
      clause: newAmendmentClause,
      proposedBy: gameState.playerName,
      partyId: gameState.playerPartyId,
      text: newAmendmentText,
      status: 'proposed',
      votes: { yea: 0, nay: 0 },
    };
    setAmendments(prev => [...prev, amendment]);
    setNewAmendmentText('');
    setNewAmendmentClause('');
    showAlert('Amendment Proposed', `Your amendment to Clause ${newAmendmentClause} has been tabled. The committee will vote on it during clause-by-clause review.`);
  };

  const voteOnAmendment = (amendmentId: string) => {
    setAmendments(prev => prev.map(a => {
      if (a.id !== amendmentId) return a;
      // Simulate committee vote based on seat proportions
      const govBonus = isGoverning ? 8 : -5;
      const yea = Math.round((playerSeatPct + govBonus + (Math.random() * 20 - 10)));
      const nay = 100 - yea;
      const adopted = yea > nay;
      showAlert(
        adopted ? 'Amendment Adopted ✓' : 'Amendment Defeated ✗',
        `The committee voted ${adopted ? 'to adopt' : 'against'} your amendment to Clause ${a.clause}.\n\nYea: ${yea} | Nay: ${nay}\n\n${adopted ? 'The amendment has been incorporated into the bill.' : 'The original text stands.'}`
      );
      return { ...a, status: adopted ? 'adopted' : 'defeated', votes: { yea, nay } };
    }));
  };

  const callWitness = (witness: Omit<Witness, 'id' | 'submitted' | 'testimony'>) => {
    const newWitness: Witness = {
      ...witness,
      id: `witness_${Date.now()}`,
      submitted: false,
      testimony: '',
    };
    setWitnesses(prev => [...prev, newWitness]);

    // Generate testimony
    setLoadingAI(true);
    const testimonies: Record<string, string[]> = {
      expert: [
        `Thank you, Chair. Based on our analysis, this legislation has several key implications for the Canadian economy. The fiscal impact over 5 years is estimated at $2.1 billion. We recommend three amendments to improve the bill's effectiveness while reducing unintended consequences.`,
        `The research clearly shows that comparable legislation in OECD countries has produced mixed results. Canada's unique context — particularly our federal structure and regional disparities — requires a more nuanced approach than what is currently proposed.`,
      ],
      government: [
        `The Department supports this legislation as drafted. It represents careful deliberation across multiple ministries. Officials are available to answer any technical questions the committee may have.`,
        `This bill implements the government's platform commitment. The regulatory framework will be developed through consultation with affected parties over the next 18 months following royal assent.`,
      ],
      civil_society: [
        `We thank the committee for this opportunity. The communities we represent have serious concerns about this legislation. Without amendments addressing [key concern], this bill will cause significant harm to vulnerable Canadians.`,
        `Our members strongly support the intent of this legislation. However, the implementation timeline is unrealistic. We urge the committee to extend the transition period from 12 to 24 months.`,
      ],
      opposition: [
        `The opposition has serious concerns about the constitutional validity of certain provisions. We will be proposing amendments at clause-by-clause to address these deficiencies.`,
        `While we support the general direction of this legislation, the lack of consultation with affected communities is troubling. We urge the committee to conduct additional hearings before reporting the bill back to the House.`,
      ],
    };
    const pool = testimonies[witness.type] || testimonies.expert;
    const testimony = pool[Math.floor(Math.random() * pool.length)];

    setTimeout(() => {
      setWitnesses(prev => prev.map(w =>
        w.id === newWitness.id ? { ...w, testimony, submitted: true } : w
      ));
      setLoadingAI(false);
    }, 1000);
  };

  const activateFilibuster = () => {
    if (!isGoverning && !filibusterActive) {
      showAlert(
        'Filibuster — Delay Committee Proceedings',
        'As opposition, you can filibuster this committee by scheduling extended witness appearances and procedural motions. This delays the bill by 2-3 additional weeks but may anger the media.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Begin Filibuster',
            style: 'destructive',
            onPress: () => {
              setFilibusterActive(true);
              setFilibusterWeeks(Math.floor(Math.random() * 2) + 2);
              showAlert('Filibuster Activated', 'Your party has begun procedural delay tactics. The committee proceedings are extended by 2-3 weeks. The Speaker may eventually rule the filibuster out of order.');
            },
          },
        ]
      );
    } else if (isGoverning && filibusterActive) {
      showAlert(
        'Invoke Closure on Committee',
        'As the governing party, you can invoke closure to end the filibuster and force clause-by-clause review this week.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Invoke Closure',
            style: 'destructive',
            onPress: () => {
              setFilibusterActive(false);
              showAlert('Closure Invoked', 'The filibuster has been ended by government closure motion. Clause-by-clause review proceeds immediately.');
            },
          },
        ]
      );
    }
  };

  const launchStudy = () => {
    if (!studyTopic.trim() || !selectedCommittee) return;
    const study: CommitteeStudy = {
      id: `study_${Date.now()}`,
      committeeId: selectedCommittee.id,
      title: studyTopic,
      topic: selectedCommittee.topics[0],
      status: 'hearings',
      weeksActive: 0,
      witnesses: [],
      recommendations: [],
    };
    setStudies(prev => [...prev, study]);
    setStudyTopic('');
    showAlert(
      'Study Launched',
      `${selectedCommittee.fullName} will conduct a study on "${studyTopic}". The committee will hear from witnesses over the next 4-6 weeks before tabling a report in the House.`
    );
  };

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Standing Committees</Text>
            <Text style={styles.headerSub}>House of Commons — 45th Parliament</Text>
          </View>
          <View style={[styles.seatPill, { backgroundColor: partyColor + '22' }]}>
            <Text style={[styles.seatPillText, { color: partyColor }]}>{playerSeatPct}% seats</Text>
          </View>
        </View>

        {/* Bills at committee */}
        {committeesBills.length > 0 ? (
          <View style={styles.committeeBillsBanner}>
            <MaterialCommunityIcons name="gavel" size={14} color={Colors.warning} />
            <Text style={styles.committeeBillsText}>
              {committeesBills.length} bill{committeesBills.length > 1 ? 's' : ''} currently at committee stage — clause-by-clause review available
            </Text>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoCard}>
            <MaterialCommunityIcons name="information" size={13} color={Colors.info} />
            <Text style={styles.infoText}>
              Standing committees conduct detailed study of legislation, examine government spending through Estimates, and produce policy studies. Your party holds {playerSeatPct}% of committee seats proportional to your seat count.
            </Text>
          </View>

          <Text style={styles.sectionLabel}>STANDING COMMITTEES — 10th PARLIAMENT</Text>
          {COMMITTEES.map(committee => {
            const activeBill = committeesBills.find(b => true); // Any bill could be referred
            const activeStudy = studies.find(s => s.committeeId === committee.id);
            return (
              <Pressable
                key={committee.id}
                onPress={() => { setSelectedCommittee(committee); setView('committee_detail'); }}
                style={({ pressed }) => [styles.committeeCard, pressed && { opacity: 0.85 }]}
              >
                <View style={[styles.committeeColorBar, { backgroundColor: committee.color }]} />
                <View style={styles.committeeCardContent}>
                  <View style={styles.committeeCardHeader}>
                    <MaterialCommunityIcons name={committee.icon as any} size={18} color={committee.color} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.committeeAcronym}>{committee.acronym}</Text>
                      <Text style={styles.committeeName}>{committee.fullName}</Text>
                    </View>
                    <View style={[styles.membersBadge, { backgroundColor: committee.color + '22' }]}>
                      <Text style={[styles.membersBadgeText, { color: committee.color }]}>{committee.members} MPs</Text>
                    </View>
                  </View>
                  <Text style={styles.committeeMandate} numberOfLines={2}>{committee.mandate}</Text>
                  <View style={styles.committeeTopics}>
                    {committee.topics.slice(0, 3).map(topic => (
                      <View key={topic} style={styles.topicPill}>
                        <Text style={styles.topicPillText}>{topic}</Text>
                      </View>
                    ))}
                  </View>
                  {activeStudy ? (
                    <View style={styles.activeStudyBadge}>
                      <MaterialCommunityIcons name="book-open-variant" size={10} color={Colors.info} />
                      <Text style={styles.activeStudyText}>Study: {activeStudy.title}</Text>
                    </View>
                  ) : null}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // ── COMMITTEE DETAIL VIEW ─────────────────────────────────────────────────
  if (view === 'committee_detail' && selectedCommittee) {
    const committeeStudies = studies.filter(s => s.committeeId === selectedCommittee.id);
    const referredBills = committeesBills;

    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: selectedCommittee.color + '44' }]}>
          <Pressable onPress={() => setView('list')} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{selectedCommittee.acronym}</Text>
            <Text style={styles.headerSub}>{selectedCommittee.fullName}</Text>
          </View>
          <MaterialCommunityIcons name={selectedCommittee.icon as any} size={24} color={selectedCommittee.color} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Mandate */}
          <View style={[styles.mandateCard, { borderColor: selectedCommittee.color + '33', backgroundColor: selectedCommittee.color + '08' }]}>
            <Text style={styles.mandateTitle}>COMMITTEE MANDATE</Text>
            <Text style={styles.mandateText}>{selectedCommittee.mandate}</Text>
            <View style={styles.mandateStats}>
              <View style={styles.mandateStat}>
                <Text style={[styles.mandateStatValue, { color: selectedCommittee.color }]}>{selectedCommittee.members}</Text>
                <Text style={styles.mandateStatLabel}>Members</Text>
              </View>
              <View style={styles.mandateStat}>
                <Text style={[styles.mandateStatValue, { color: selectedCommittee.color }]}>{Math.round(selectedCommittee.members * playerSeatPct / 100)}</Text>
                <Text style={styles.mandateStatLabel}>Your MPs</Text>
              </View>
              <View style={styles.mandateStat}>
                <Text style={[styles.mandateStatValue, { color: selectedCommittee.color }]}>{committeeStudies.length}</Text>
                <Text style={styles.mandateStatLabel}>Studies</Text>
              </View>
            </View>
          </View>

          {/* Bills at this committee */}
          {referredBills.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>BILLS REFERRED TO COMMITTEE</Text>
              {referredBills.map(bill => (
                <Pressable
                  key={bill.id}
                  onPress={() => { setSelectedBillId(bill.id); setAmendments([]); setWitnesses([]); setView('bill_review'); }}
                  style={({ pressed }) => [styles.billCard, pressed && { opacity: 0.85 }]}
                >
                  <View style={styles.billCardHeader}>
                    <MaterialCommunityIcons name="file-document" size={16} color={selectedCommittee.color} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.billCardTitle} numberOfLines={2}>{bill.title}</Text>
                      <Text style={styles.billCardSponsor}>{bill.sponsorName}</Text>
                    </View>
                    <View style={[styles.billStageBadge, { backgroundColor: selectedCommittee.color + '22' }]}>
                      <Text style={[styles.billStageBadgeText, { color: selectedCommittee.color }]}>
                        {bill.stage === 'house_committee' ? 'HOUSE COM.' : 'SENATE COM.'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.billCardActions}>
                    <View style={styles.billCardActionHint}>
                      <MaterialCommunityIcons name="pencil" size={11} color={Colors.textMuted} />
                      <Text style={styles.billCardActionHintText}>Clause-by-clause review • Amendments • Witnesses</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={14} color={Colors.textMuted} />
                  </View>
                </Pressable>
              ))}
            </>
          ) : (
            <View style={styles.noBillsCard}>
              <MaterialCommunityIcons name="file-question" size={32} color={Colors.textMuted} />
              <Text style={styles.noBillsText}>No bills currently referred to this committee</Text>
              <Text style={styles.noBillsSubtext}>Bills reach committee stage after passing 2nd reading in the House or Senate.</Text>
            </View>
          )}

          {/* Launch new study */}
          <Text style={styles.sectionLabel}>COMMITTEE STUDIES</Text>
          <View style={styles.launchStudyCard}>
            <Text style={styles.launchStudyTitle}>Launch New Study</Text>
            <Text style={styles.launchStudyDesc}>Committees can study any topic within their mandate and produce reports with recommendations for government action.</Text>
            <View style={styles.topicsGrid}>
              {selectedCommittee.topics.map(topic => (
                <Pressable
                  key={topic}
                  onPress={() => setStudyTopic(topic)}
                  style={[styles.topicBtn, studyTopic === topic && { backgroundColor: selectedCommittee.color, borderColor: selectedCommittee.color }]}
                >
                  <Text style={[styles.topicBtnText, studyTopic === topic && { color: '#fff' }]}>{topic}</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.studyInput}
              placeholder="Or enter a custom study topic..."
              placeholderTextColor={Colors.textMuted}
              value={studyTopic}
              onChangeText={setStudyTopic}
            />
            <Pressable
              onPress={launchStudy}
              disabled={!studyTopic.trim()}
              style={({ pressed }) => [styles.launchStudyBtn, { backgroundColor: selectedCommittee.color }, !studyTopic.trim() && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}
            >
              <MaterialCommunityIcons name="book-plus" size={16} color="#fff" />
              <Text style={styles.launchStudyBtnText}>Launch Study</Text>
            </Pressable>
          </View>

          {/* Active studies */}
          {committeeStudies.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>ACTIVE STUDIES</Text>
              {committeeStudies.map(study => (
                <View key={study.id} style={styles.studyCard}>
                  <View style={styles.studyCardHeader}>
                    <MaterialCommunityIcons name="book-open-variant" size={15} color={selectedCommittee.color} />
                    <Text style={styles.studyCardTitle}>{study.title}</Text>
                    <View style={[styles.studyStatusBadge, { backgroundColor: Colors.info + '22' }]}>
                      <Text style={[styles.studyStatusText, { color: Colors.info }]}>
                        {study.status === 'hearings' ? 'HEARINGS' : study.status === 'deliberation' ? 'DELIBERATING' : study.status === 'report_tabled' ? 'TABLED' : 'DRAFTING'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.studyWeeks}>Week {study.weeksActive + 1} of study · {study.witnesses.length} witnesses heard</Text>
                  {study.status === 'report_tabled' ? (
                    <View style={styles.studyRecommendations}>
                      {study.recommendations.map((rec, idx) => (
                        <Text key={idx} style={styles.studyRecommendation}>• {rec}</Text>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  // ── BILL CLAUSE-BY-CLAUSE REVIEW ─────────────────────────────────────────
  if (view === 'bill_review' && selectedBillId) {
    const bill = bills.find(b => b.id === selectedBillId);
    if (!bill) return null;
    const adoptedAmendments = amendments.filter(a => a.status === 'adopted');
    const pendingAmendments = amendments.filter(a => a.status === 'proposed');

    const CLAUSES = ['Clause 1', 'Clause 2', 'Clause 3', 'Clause 4', 'Clause 5', 'Clause 6', 'Schedule A', 'Schedule B'];

    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Pressable onPress={() => setView('committee_detail')} style={styles.iconBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Clause-by-Clause Review</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{bill.title}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 60 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Bill info */}
          <View style={styles.billReviewInfo}>
            <View style={styles.billReviewStats}>
              <View style={styles.billReviewStat}>
                <Text style={[styles.billReviewStatValue, { color: Colors.gold }]}>{adoptedAmendments.length}</Text>
                <Text style={styles.billReviewStatLabel}>Amendments Adopted</Text>
              </View>
              <View style={styles.billReviewStat}>
                <Text style={[styles.billReviewStatValue, { color: Colors.warning }]}>{pendingAmendments.length}</Text>
                <Text style={styles.billReviewStatLabel}>Pending Vote</Text>
              </View>
              <View style={styles.billReviewStat}>
                <Text style={[styles.billReviewStatValue, { color: Colors.info }]}>{witnesses.filter(w => w.submitted).length}</Text>
                <Text style={styles.billReviewStatLabel}>Witnesses Heard</Text>
              </View>
            </View>
          </View>

          {/* Filibuster */}
          {!isGoverning || filibusterActive ? (
            <Pressable
              onPress={activateFilibuster}
              style={({ pressed }) => [
                styles.filibusterBtn,
                filibusterActive ? { backgroundColor: Colors.error + '11', borderColor: Colors.error + '44' } : { backgroundColor: Colors.warning + '11', borderColor: Colors.warning + '44' },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons
                name={filibusterActive ? 'timer-sand' : 'timer-pause'}
                size={16}
                color={filibusterActive ? Colors.error : Colors.warning}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.filibusterBtnTitle, { color: filibusterActive ? Colors.error : Colors.warning }]}>
                  {filibusterActive ? `Filibuster Active — ${filibusterWeeks} weeks of delay` : isGoverning ? 'Invoke Closure' : 'Begin Filibuster'}
                </Text>
                <Text style={styles.filibusterBtnSub}>
                  {filibusterActive
                    ? isGoverning ? 'Tap to invoke closure and end the filibuster' : 'Procedural delays are extending committee review'
                    : 'Delay clause-by-clause review by 2-3 weeks through procedural motions'}
                </Text>
              </View>
            </Pressable>
          ) : null}

          {/* Clause list */}
          <Text style={styles.sectionLabel}>BILL CLAUSES — CLAUSE-BY-CLAUSE REVIEW</Text>
          {CLAUSES.map((clause, idx) => {
            const clauseAmendments = amendments.filter(a => a.clause === clause);
            return (
              <View key={clause} style={styles.clauseCard}>
                <View style={styles.clauseHeader}>
                  <View style={styles.clauseNumberBadge}>
                    <Text style={styles.clauseNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.clauseTitle}>{clause}</Text>
                  {clauseAmendments.length > 0 ? (
                    <View style={[styles.clauseAmendBadge, { backgroundColor: clauseAmendments.some(a => a.status === 'adopted') ? Colors.success + '22' : Colors.warning + '22' }]}>
                      <Text style={[styles.clauseAmendBadgeText, { color: clauseAmendments.some(a => a.status === 'adopted') ? Colors.success : Colors.warning }]}>
                        {clauseAmendments.length} amend.
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.clauseDesc}>
                  This clause addresses provisions related to {bill.topic.toLowerCase()} under the proposed legislation. The committee reviews this clause in light of the bill's stated objectives and the testimony received.
                </Text>
                {clauseAmendments.map(amend => (
                  <View key={amend.id} style={[styles.amendmentItem, { borderColor: amend.status === 'adopted' ? Colors.success + '44' : amend.status === 'defeated' ? Colors.error + '44' : Colors.warning + '44' }]}>
                    <View style={styles.amendmentItemHeader}>
                      <MaterialCommunityIcons
                        name={amend.status === 'adopted' ? 'check-circle' : amend.status === 'defeated' ? 'close-circle' : 'clock-outline'}
                        size={13}
                        color={amend.status === 'adopted' ? Colors.success : amend.status === 'defeated' ? Colors.error : Colors.warning}
                      />
                      <Text style={[styles.amendmentStatus, { color: amend.status === 'adopted' ? Colors.success : amend.status === 'defeated' ? Colors.error : Colors.warning }]}>
                        {amend.status.toUpperCase()}
                      </Text>
                      <Text style={styles.amendmentProposer}>{amend.proposedBy}</Text>
                    </View>
                    <Text style={styles.amendmentText}>{amend.text}</Text>
                    {amend.status === 'proposed' ? (
                      <Pressable
                        onPress={() => voteOnAmendment(amend.id)}
                        style={({ pressed }) => [styles.voteAmendBtn, pressed && { opacity: 0.8 }]}
                      >
                        <MaterialCommunityIcons name="vote" size={13} color={partyColor} />
                        <Text style={[styles.voteAmendBtnText, { color: partyColor }]}>Call Amendment Vote</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            );
          })}

          {/* Propose amendment */}
          <Text style={styles.sectionLabel}>PROPOSE AMENDMENT</Text>
          <View style={styles.proposeCard}>
            <Text style={styles.proposeLabel}>Clause Reference</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {CLAUSES.map(clause => (
                  <Pressable
                    key={clause}
                    onPress={() => setNewAmendmentClause(clause)}
                    style={[styles.clauseChip, newAmendmentClause === clause && { backgroundColor: partyColor, borderColor: partyColor }]}
                  >
                    <Text style={[styles.clauseChipText, newAmendmentClause === clause && { color: '#fff' }]}>{clause}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Text style={styles.proposeLabel}>Amendment Text</Text>
            <TextInput
              style={styles.amendmentInput}
              multiline
              numberOfLines={4}
              placeholder="Describe your proposed amendment to this clause. Be specific about what language should be added, removed, or changed..."
              placeholderTextColor={Colors.textMuted}
              value={newAmendmentText}
              onChangeText={setNewAmendmentText}
              textAlignVertical="top"
            />
            <Pressable
              onPress={proposeAmendment}
              disabled={!newAmendmentText.trim() || !newAmendmentClause.trim()}
              style={({ pressed }) => [
                styles.proposeBtn,
                { backgroundColor: partyColor },
                (!newAmendmentText.trim() || !newAmendmentClause.trim()) && { opacity: 0.4 },
                pressed && { opacity: 0.85 },
              ]}
            >
              <MaterialCommunityIcons name="pencil-plus" size={16} color="#fff" />
              <Text style={styles.proposeBtnText}>Propose Amendment</Text>
            </Pressable>
          </View>

          {/* Call witnesses */}
          <Text style={styles.sectionLabel}>CALL WITNESSES</Text>
          <Text style={styles.witnessIntro}>
            Committee can hear from government officials, experts, and civil society organizations before reporting the bill back to the House.
          </Text>
          {WITNESS_POOL.slice(0, 6).map((w, idx) => {
            const alreadyCalled = witnesses.some(ww => ww.name === w.name);
            return (
              <Pressable
                key={idx}
                onPress={() => !alreadyCalled && callWitness(w)}
                style={({ pressed }) => [
                  styles.witnessCard,
                  alreadyCalled && { opacity: 0.6 },
                  pressed && !alreadyCalled && { opacity: 0.8 },
                ]}
              >
                <View style={[styles.witnessTypeIcon, {
                  backgroundColor: w.type === 'government' ? Colors.liberal + '22' : w.type === 'expert' ? Colors.gold + '22' : w.type === 'civil_society' ? Colors.green + '22' : Colors.error + '22',
                }]}>
                  <MaterialCommunityIcons
                    name={w.type === 'government' ? 'domain' : w.type === 'expert' ? 'school' : w.type === 'civil_society' ? 'account-group' : 'gavel'}
                    size={14}
                    color={w.type === 'government' ? Colors.liberal : w.type === 'expert' ? Colors.gold : w.type === 'civil_society' ? Colors.green : Colors.error}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.witnessName}>{w.name}</Text>
                  <Text style={styles.witnessOrg}>{w.organization}</Text>
                </View>
                {alreadyCalled ? (
                  <MaterialCommunityIcons name="check-circle" size={16} color={Colors.success} />
                ) : (
                  <Pressable
                    onPress={() => callWitness(w)}
                    style={({ pressed }) => [styles.callWitnessBtn, { backgroundColor: partyColor + '22', borderColor: partyColor + '44' }, pressed && { opacity: 0.8 }]}
                  >
                    <Text style={[styles.callWitnessBtnText, { color: partyColor }]}>Call</Text>
                  </Pressable>
                )}
              </Pressable>
            );
          })}

          {/* Witness testimonies */}
          {witnesses.filter(w => w.submitted).length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>TESTIMONY RECEIVED</Text>
              {witnesses.filter(w => w.submitted).map(w => (
                <View key={w.id} style={styles.testimonyCard}>
                  <Text style={styles.testimonyName}>{w.name}</Text>
                  <Text style={styles.testimonyOrg}>{w.organization}</Text>
                  <Text style={styles.testimonyText}>"{w.testimony}"</Text>
                </View>
              ))}
            </>
          ) : null}

          {/* Report bill back */}
          <Pressable
            onPress={() => {
              showAlert(
                'Report Bill Back to House',
                `The committee will report ${bill.title} back to the House${adoptedAmendments.length > 0 ? ` with ${adoptedAmendments.length} amendment(s)` : ' without amendments'}. The bill will proceed to ${bill.stage === 'house_committee' ? '3rd Reading' : 'Senate 3rd Reading'}.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Report Back',
                    onPress: () => {
                      setView('committee_detail');
                      showAlert('Bill Reported', `${bill.title} has been reported back to the House. It will proceed to ${bill.stage === 'house_committee' ? 'House 3rd Reading' : 'Senate 3rd Reading'} at the next opportunity.`);
                    },
                  },
                ]
              );
            }}
            style={({ pressed }) => [styles.reportBillBtn, { backgroundColor: partyColor }, pressed && { opacity: 0.85 }]}
          >
            <MaterialCommunityIcons name="file-send" size={16} color="#fff" />
            <Text style={styles.reportBillBtnText}>
              Report Bill Back to House{adoptedAmendments.length > 0 ? ` (with ${adoptedAmendments.length} amendments)` : ''}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
  seatPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  seatPillText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  committeeBillsBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.warning + '11', paddingHorizontal: Spacing.md, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.warning + '22' },
  committeeBillsText: { flex: 1, fontSize: FontSize.xs, color: Colors.warning, fontWeight: FontWeight.medium },
  listContent: { padding: Spacing.md, gap: Spacing.md },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.info + '0D', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.info + '22' },
  infoText: { flex: 1, fontSize: FontSize.xs, color: Colors.info, lineHeight: 18 },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  committeeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, overflow: 'hidden', marginBottom: 2 },
  committeeColorBar: { width: 4, alignSelf: 'stretch' },
  committeeCardContent: { flex: 1, padding: Spacing.md, gap: 6 },
  committeeCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  committeeAcronym: { fontSize: FontSize.xs, fontWeight: FontWeight.extrabold, color: Colors.textMuted, letterSpacing: 1 },
  committeeName: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  membersBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  membersBadgeText: { fontSize: 9, fontWeight: FontWeight.bold },
  committeeMandate: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 17 },
  committeeTopics: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  topicPill: { backgroundColor: Colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surfaceBorder },
  topicPillText: { fontSize: 9, color: Colors.textMuted },
  activeStudyBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.info + '11', borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  activeStudyText: { fontSize: 10, color: Colors.info, fontWeight: FontWeight.medium },
  mandateCard: { borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 8 },
  mandateTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1 },
  mandateText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  mandateStats: { flexDirection: 'row', gap: Spacing.md },
  mandateStat: { alignItems: 'center' },
  mandateStatValue: { fontSize: FontSize.xl, fontWeight: FontWeight.extrabold },
  mandateStatLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  billCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8, marginBottom: 4 },
  billCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  billCardTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  billCardSponsor: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  billStageBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  billStageBadgeText: { fontSize: 9, fontWeight: FontWeight.extrabold, letterSpacing: 0.5 },
  billCardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  billCardActionHint: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  billCardActionHintText: { fontSize: FontSize.xs, color: Colors.textMuted },
  noBillsCard: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.xl, alignItems: 'center', gap: 8 },
  noBillsText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  noBillsSubtext: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
  launchStudyCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 10 },
  launchStudyTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  launchStudyDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  topicsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  topicBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  topicBtnText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  studyInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.sm, paddingVertical: 8, fontSize: FontSize.xs, color: Colors.textPrimary },
  launchStudyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.sm, borderRadius: Radius.sm },
  launchStudyBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
  studyCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 6 },
  studyCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  studyCardTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  studyStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  studyStatusText: { fontSize: 9, fontWeight: FontWeight.extrabold, letterSpacing: 0.5 },
  studyWeeks: { fontSize: FontSize.xs, color: Colors.textMuted },
  studyRecommendations: { gap: 4 },
  studyRecommendation: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  // Bill review
  billReviewInfo: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  billReviewStats: { flexDirection: 'row', justifyContent: 'space-around' },
  billReviewStat: { alignItems: 'center' },
  billReviewStatValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold },
  billReviewStatLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  filibusterBtn: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md },
  filibusterBtnTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  filibusterBtnSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  clauseCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  clauseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  clauseNumberBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder, alignItems: 'center', justifyContent: 'center' },
  clauseNumberText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  clauseTitle: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  clauseAmendBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  clauseAmendBadgeText: { fontSize: 9, fontWeight: FontWeight.bold },
  clauseDesc: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 17 },
  amendmentItem: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, padding: Spacing.sm, gap: 4 },
  amendmentItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amendmentStatus: { fontSize: 9, fontWeight: FontWeight.extrabold, letterSpacing: 0.5 },
  amendmentProposer: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right' },
  amendmentText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17 },
  voteAmendBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  voteAmendBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  proposeCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 8 },
  proposeLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 0.5 },
  clauseChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  clauseChipText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  amendmentInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, fontSize: FontSize.xs, color: Colors.textPrimary, minHeight: 100, lineHeight: 20 },
  proposeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.sm, borderRadius: Radius.sm },
  proposeBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
  witnessIntro: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 17 },
  witnessCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.sm, gap: 8 },
  witnessTypeIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  witnessName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  witnessOrg: { fontSize: FontSize.xs, color: Colors.textMuted },
  callWitnessBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1 },
  callWitnessBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  testimonyCard: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: 4 },
  testimonyName: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  testimonyOrg: { fontSize: FontSize.xs, color: Colors.textMuted },
  testimonyText: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18, fontStyle: 'italic', marginTop: 4 },
  reportBillBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.sm },
  reportBillBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
});
