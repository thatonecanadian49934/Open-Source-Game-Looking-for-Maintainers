// Powered by OnSpace.AI — News tab with press conferences, interviews, outlet requests
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, ScrollView, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useGame } from '@/hooks/useGame';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '@/constants/theme';
import { OUTLET_PROFILES } from '@/services/newsService';
import { PARTIES } from '@/constants/parties';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

type NewsFilter = 'all' | 'positive' | 'negative' | 'neutral' | string;
type TopicFilter = 'all' | string;
type NewsView = 'feed' | 'conference' | 'interview';

const TOPICS = ['All', 'Economy', 'Politics', 'Parliament', 'Housing', 'Healthcare', 'Environment', 'Defence', 'Policy', 'International', 'Scandal'];

interface InterviewSession {
  outletName: string;
  outletColor: string;
  type: 'press_conference' | 'interview';
  questions: Array<{ question: string; askedBy: string; topic: string }>;
  answers: string[];
  statementText: string;
  currentQ: number;
  completed: boolean;
}

interface OutletRequest {
  outletName: string;
  outletColor: string;
  outletLogo: string;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
  type: 'press_conference' | 'interview';
}

function generateOutletRequests(gameState: any): OutletRequest[] {
  const requests: OutletRequest[] = [];
  const news = gameState.newsHistory || [];
  const negativeCount = news.filter((n: any) => n.sentiment === 'negative').length;

  // If there's a scandal or approval is low, outlets request interviews
  if (negativeCount > 5 || gameState.stats.approvalRating < 30) {
    requests.push({
      outletName: 'CBC News',
      outletColor: '#CC0000',
      outletLogo: 'television',
      reason: `Your approval rating has dropped to ${Math.round(gameState.stats.approvalRating)}%. CBC requests a sit-down interview to address public concerns.`,
      urgency: 'high',
      type: 'interview',
    });
  }
  if (gameState.stats.gdpGrowth < 0) {
    requests.push({
      outletName: 'The Globe and Mail',
      outletColor: '#003366',
      outletLogo: 'newspaper',
      reason: `With GDP growth at ${gameState.stats.gdpGrowth.toFixed(1)}%, the Globe requests an interview on your economic plan.`,
      urgency: 'medium',
      type: 'interview',
    });
  }
  if (gameState.isGoverning && Math.random() > 0.6) {
    requests.push({
      outletName: 'CTV News',
      outletColor: '#2B6CB0',
      outletLogo: 'broadcast',
      reason: `CTV News is scheduling leadership interview segments for all party leaders ahead of the upcoming session.`,
      urgency: 'low',
      type: 'interview',
    });
  }
  return requests.slice(0, 3);
}

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const { gameState, issuePressStatement } = useGame();
  const supabase = getSupabaseClient();

  const [selectedOutlet, setSelectedOutlet] = useState<NewsFilter>('all');
  const [selectedTopic, setSelectedTopic] = useState<TopicFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newsView, setNewsView] = useState<NewsView>('feed');
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [statementText, setStatementText] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [selectedOutletForEvent, setSelectedOutletForEvent] = useState<string | null>(null);

  if (!gameState) return null;

  const party = PARTIES.find(p => p.id === gameState.playerPartyId);
  const partyColor = party?.color || Colors.gold;
  const articles = gameState.newsHistory;
  const outletRequests = generateOutletRequests(gameState);

  // Apply filters
  const filtered = articles.filter((a: any) => {
    const outletMatch = selectedOutlet === 'all' ? true : selectedOutlet === 'positive' ? a.sentiment === 'positive' : selectedOutlet === 'negative' ? a.sentiment === 'negative' : selectedOutlet === 'neutral' ? a.sentiment === 'neutral' : a.outlet === selectedOutlet;
    const topicMatch = selectedTopic === 'all' ? true : a.topic?.toLowerCase() === selectedTopic.toLowerCase();
    return outletMatch && topicMatch;
  });

  const positiveCount = articles.filter((a: any) => a.sentiment === 'positive').length;
  const negativeCount = articles.filter((a: any) => a.sentiment === 'negative').length;
  const neutralCount = articles.filter((a: any) => a.sentiment === 'neutral').length;
  const total = articles.length;
  const posPct = total > 0 ? (positiveCount / total) * 100 : 0;
  const negPct = total > 0 ? (negativeCount / total) * 100 : 0;
  const neuPct = total > 0 ? (neutralCount / total) * 100 : 0;

  const outletLatest: Record<string, { sentiment: string; count: number }> = {};
  OUTLET_PROFILES.forEach(o => {
    const outletArticles = articles.filter((a: any) => a.outlet === o.name);
    if (outletArticles.length > 0) {
      const sentiments = outletArticles.reduce((acc: any, a: any) => { acc[a.sentiment] = (acc[a.sentiment] || 0) + 1; return acc; }, {} as Record<string, number>);
      const dominant = Object.entries(sentiments).sort(([, a], [, b]) => (b as number) - (a as number))[0][0];
      outletLatest[o.name] = { sentiment: dominant, count: outletArticles.length };
    }
  });

  const fetchInterviewQuestions = async (outletName: string, type: 'press_conference' | 'interview') => {
    setLoadingAI(true);
    const numQuestions = type === 'press_conference' ? 4 : 5;
    try {
      const { data, error } = await supabase.functions.invoke('ai-question-period', {
        body: {
          partyName: party?.name,
          leaderName: gameState.playerName,
          isGoverning: gameState.isGoverning,
          stats: gameState.stats,
          currentEvents: gameState.currentEvents.slice(0, 3),
          rivals: gameState.rivals.slice(0, 3).map((r: any) => ({ name: r.name, party: r.party, approval: r.approval })),
          weekNumber: gameState.currentWeek,
          parliamentNumber: gameState.parliamentNumber,
          recentNewsHeadlines: gameState.newsHistory.slice(0, 5).map((n: any) => n.headline),
          context: `This is a ${type === 'press_conference' ? 'press conference' : 'media interview'} with ${outletName}. Questions should be specific to their editorial bias.`,
        },
      });
      if (!error && data?.questions) {
        const outlet = OUTLET_PROFILES.find(o => o.name === outletName);
        setSession({
          outletName,
          outletColor: outlet?.color || Colors.textSecondary,
          type,
          questions: data.questions.slice(0, numQuestions).map((q: any) => ({ question: q.question, askedBy: q.askedBy || outletName, topic: q.topic || 'General' })),
          answers: [],
          statementText: '',
          currentQ: 0,
          completed: false,
        });
        setNewsView('interview');
      }
    } catch {}
    setLoadingAI(false);
  };

  const startPressConference = async (outletName?: string) => {
    const outlet = outletName || 'CBC News';
    setSelectedOutletForEvent(outlet);
    await fetchInterviewQuestions(outlet, 'press_conference');
  };

  const startInterview = async (outletName: string) => {
    setSelectedOutletForEvent(outletName);
    await fetchInterviewQuestions(outletName, 'interview');
  };

  const handleSubmitAnswer = (answer: string) => {
    if (!session) return;
    const newAnswers = [...session.answers, answer];
    const isLast = newAnswers.length >= session.questions.length;
    setSession(prev => prev ? { ...prev, answers: newAnswers, currentQ: prev.currentQ + 1, completed: isLast } : null);
    if (isLast) {
      issuePressStatement(`${session.type === 'press_conference' ? 'Press Conference' : 'Interview'} with ${session.outletName}: addressed key issues.`);
    }
  };

  // ── INTERVIEW / PRESS CONFERENCE VIEW ──
  if (newsView === 'interview' && session) {
    const currentQObj = session.questions[session.currentQ];
    if (session.completed) {
      return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={[styles.sessionHeader, { borderBottomColor: session.outletColor + '44' }]}>
            <Pressable onPress={() => { setNewsView('feed'); setSession(null); }} style={styles.backBtn}>
              <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
            </Pressable>
            <Text style={styles.sessionHeaderTitle}>{session.type === 'press_conference' ? 'Press Conference' : 'Media Interview'} Complete</Text>
            <View style={{ width: 40 }} />
          </View>
          <ScrollView contentContainerStyle={[styles.sessionContent, { paddingBottom: insets.bottom + 40 }]}>
            <View style={[styles.completedCard, { borderColor: session.outletColor + '55' }]}>
              <MaterialCommunityIcons name="check-circle" size={48} color={session.outletColor} />
              <Text style={[styles.completedTitle, { color: session.outletColor }]}>{session.type === 'press_conference' ? 'Press Conference' : 'Interview'} Concluded</Text>
              <Text style={styles.completedOutlet}>{session.outletName}</Text>
              <Text style={styles.completedDesc}>Your responses have been recorded. AI media coverage has been generated based on your answers.</Text>
            </View>
            <View style={styles.answerReviewCard}>
              <Text style={styles.sectionLabel}>Q&A RECAP</Text>
              {session.questions.map((q, idx) => (
                <View key={idx} style={styles.answerReviewItem}>
                  <Text style={styles.answerReviewQ}>Q: {q.question}</Text>
                  <Text style={styles.answerReviewA}>A: {session.answers[idx] || '(no answer)'}</Text>
                </View>
              ))}
            </View>
            <Pressable onPress={() => { setNewsView('feed'); setSession(null); }} style={({ pressed }) => [styles.doneBtn, { backgroundColor: session.outletColor }, pressed && { opacity: 0.85 }]}>
              <Text style={styles.doneBtnText}>Return to News Feed</Text>
            </Pressable>
          </ScrollView>
        </View>
      );
    }

    return (
      <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.sessionHeader, { borderBottomColor: session.outletColor + '44' }]}>
          <Pressable onPress={() => { setNewsView('feed'); setSession(null); }} style={styles.backBtn}>
            <MaterialCommunityIcons name="close" size={22} color={Colors.textSecondary} />
          </Pressable>
          <View style={styles.sessionHeaderCenter}>
            <View style={[styles.outletBadge, { backgroundColor: session.outletColor + '22' }]}>
              <Text style={[styles.outletBadgeText, { color: session.outletColor }]}>{session.outletName}</Text>
            </View>
            <Text style={styles.sessionHeaderTitle}>{session.type === 'press_conference' ? 'Press Conference' : 'Media Interview'}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Statement (press conference only - shown first) */}
        {session.type === 'press_conference' && session.currentQ === 0 && session.answers.length === 0 && !session.statementText ? (
          <ScrollView contentContainerStyle={[styles.sessionContent, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
            <View style={[styles.statementSection]}>
              <Text style={styles.statementTitle}>OPENING STATEMENT</Text>
              <Text style={styles.statementDesc}>Deliver a brief statement before taking questions from the press gallery. 2–5 sentences recommended.</Text>
              <TextInput
                style={styles.statementInput}
                multiline
                placeholder="Begin your opening remarks to the press gallery..."
                placeholderTextColor={Colors.textMuted}
                value={statementText}
                onChangeText={setStatementText}
                textAlignVertical="top"
              />
              <Pressable
                onPress={() => setSession(prev => prev ? { ...prev, statementText: statementText } : null)}
                disabled={!statementText.trim()}
                style={({ pressed }) => [styles.nextBtn, { backgroundColor: session.outletColor }, !statementText.trim() && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}
              >
                <MaterialCommunityIcons name="microphone" size={16} color="#fff" />
                <Text style={styles.nextBtnText}>Deliver Statement — Take Questions</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={[styles.sessionContent, { paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
            {/* Progress */}
            <View style={styles.qProgress}>
              {session.questions.map((_, idx) => (
                <View key={idx} style={[styles.qProgressDot, session.currentQ > idx && { backgroundColor: Colors.success }, session.currentQ === idx && { backgroundColor: session.outletColor }]} />
              ))}
              <Text style={styles.qProgressText}>Question {Math.min(session.currentQ + 1, session.questions.length)}/{session.questions.length}</Text>
            </View>

            {/* Current question */}
            {currentQObj ? (
              <View style={[styles.questionCard, { borderColor: session.outletColor + '44' }]}>
                <View style={styles.questionAskerRow}>
                  <MaterialCommunityIcons name="account-tie" size={14} color={session.outletColor} />
                  <Text style={[styles.questionAsker, { color: session.outletColor }]}>{currentQObj.askedBy}</Text>
                  <View style={styles.topicPill}>
                    <Text style={styles.topicPillText}>{currentQObj.topic}</Text>
                  </View>
                </View>
                <Text style={styles.questionText}>{currentQObj.question}</Text>
              </View>
            ) : null}

            {/* Previous answers */}
            {session.answers.length > 0 ? (
              <View style={styles.prevAnswers}>
                <Text style={styles.sectionLabel}>PREVIOUS ANSWERS</Text>
                {session.questions.slice(0, session.answers.length).map((q, idx) => (
                  <View key={idx} style={styles.prevAnswerItem}>
                    <Text style={styles.prevQ} numberOfLines={1}>{q.question}</Text>
                    <Text style={styles.prevA} numberOfLines={2}>{session.answers[idx]}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            <AnswerInput outletColor={session.outletColor} onSubmit={handleSubmitAnswer} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    );
  }

  // ── SCHEDULE VIEW ──
  if (newsView === 'conference') {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setNewsView('feed')} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>Media Events</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={[styles.scheduleContent, { paddingBottom: insets.bottom + 40 }]} showsVerticalScrollIndicator={false}>
          {/* Outlet Requests */}
          {outletRequests.length > 0 ? (
            <View style={styles.scheduleSection}>
              <Text style={styles.sectionLabel}>OUTLET INTERVIEW REQUESTS</Text>
              {outletRequests.map((req, idx) => (
                <View key={idx} style={[styles.requestCard, { borderColor: req.urgency === 'high' ? Colors.error + '44' : req.urgency === 'medium' ? Colors.warning + '44' : Colors.surfaceBorder }]}>
                  <View style={styles.requestHeader}>
                    <MaterialCommunityIcons name={req.outletLogo as any} size={18} color={req.outletColor} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.requestOutlet, { color: req.outletColor }]}>{req.outletName}</Text>
                      <Text style={styles.requestReason}>{req.reason}</Text>
                    </View>
                    <View style={[styles.urgencyBadge, { backgroundColor: (req.urgency === 'high' ? Colors.error : req.urgency === 'medium' ? Colors.warning : Colors.textMuted) + '22' }]}>
                      <Text style={[styles.urgencyText, { color: req.urgency === 'high' ? Colors.error : req.urgency === 'medium' ? Colors.warning : Colors.textMuted }]}>{req.urgency.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => startInterview(req.outletName)}
                    disabled={loadingAI}
                    style={({ pressed }) => [styles.acceptBtn, { backgroundColor: req.outletColor }, pressed && { opacity: 0.85 }]}
                  >
                    <MaterialCommunityIcons name="microphone" size={14} color="#fff" />
                    <Text style={styles.acceptBtnText}>{loadingAI ? 'Generating questions...' : `Accept ${req.type === 'press_conference' ? 'Press Conference' : 'Interview'}`}</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {/* Schedule Press Conference */}
          <View style={styles.scheduleSection}>
            <Text style={styles.sectionLabel}>SCHEDULE A PRESS CONFERENCE</Text>
            <Text style={styles.scheduleNote}>A press conference opens with your statement, then 4 AI-generated questions from the press gallery. Choose your outlet carefully — each has a different editorial bias.</Text>
            {OUTLET_PROFILES.slice(0, 6).map(outlet => (
              <Pressable
                key={outlet.name}
                onPress={() => startPressConference(outlet.name)}
                disabled={loadingAI}
                style={({ pressed }) => [styles.outletEventCard, pressed && { opacity: 0.85 }]}
              >
                <MaterialCommunityIcons name={outlet.logo as any} size={18} color={outlet.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.outletEventName, { color: outlet.color }]}>{outlet.name}</Text>
                  <Text style={styles.outletEventBias}>{outlet.bias} · Press Conference (1 statement + 4 questions)</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} />
              </Pressable>
            ))}
          </View>

          {/* Schedule Interview */}
          <View style={styles.scheduleSection}>
            <Text style={styles.sectionLabel}>SCHEDULE AN INTERVIEW</Text>
            <Text style={styles.scheduleNote}>A one-on-one interview features 5 AI-generated questions from a specific outlet, tailored to their editorial stance.</Text>
            {OUTLET_PROFILES.slice(0, 6).map(outlet => (
              <Pressable
                key={outlet.name}
                onPress={() => startInterview(outlet.name)}
                disabled={loadingAI}
                style={({ pressed }) => [styles.outletEventCard, pressed && { opacity: 0.85 }]}
              >
                <MaterialCommunityIcons name={outlet.logo as any} size={18} color={outlet.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.outletEventName, { color: outlet.color }]}>{outlet.name}</Text>
                  <Text style={styles.outletEventBias}>{outlet.bias} · Interview (5 questions)</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.textMuted} />
              </Pressable>
            ))}
          </View>

          {loadingAI ? (
            <View style={styles.loadingBanner}>
              <MaterialCommunityIcons name="robot" size={16} color={Colors.gold} />
              <Text style={styles.loadingText}>Generating AI questions based on your game context...</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  // ── MAIN NEWS FEED ──
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Media Coverage</Text>
          <Text style={styles.headerSub}>{total} article{total !== 1 ? 's' : ''} — Week {gameState.currentWeek}</Text>
        </View>
        <View style={styles.headerActions}>
          {outletRequests.length > 0 ? (
            <View style={styles.requestBadge}>
              <Text style={styles.requestBadgeText}>{outletRequests.length}</Text>
            </View>
          ) : null}
          <Pressable onPress={() => setNewsView('conference')} style={({ pressed }) => [styles.mediaEventBtn, pressed && { opacity: 0.8 }]}>
            <MaterialCommunityIcons name="microphone" size={14} color={partyColor} />
            <Text style={[styles.mediaEventBtnText, { color: partyColor }]}>Media Events</Text>
          </Pressable>
        </View>
      </View>

      {/* Outlet request notification */}
      {outletRequests.length > 0 ? (
        <Pressable onPress={() => setNewsView('conference')} style={({ pressed }) => [styles.requestNotif, pressed && { opacity: 0.85 }]}>
          <MaterialCommunityIcons name="bell-ring" size={14} color={Colors.warning} />
          <Text style={styles.requestNotifText}>{outletRequests.length} outlet{outletRequests.length > 1 ? 's' : ''} requesting {outletRequests.length > 1 ? 'interviews' : 'an interview'} — tap to respond</Text>
          <MaterialCommunityIcons name="chevron-right" size={14} color={Colors.warning} />
        </Pressable>
      ) : null}

      {/* Sentiment dashboard */}
      {total > 0 ? (
        <View style={styles.sentimentDashboard}>
          <View style={styles.sentimentBar}>
            <View style={[styles.sentimentSegPos, { flex: posPct }]} />
            <View style={[styles.sentimentSegNeu, { flex: neuPct }]} />
            <View style={[styles.sentimentSegNeg, { flex: negPct }]} />
          </View>
          <View style={styles.sentimentCounts}>
            <Pressable onPress={() => setSelectedOutlet(prev => prev === 'positive' ? 'all' : 'positive')} style={[styles.sentimentCount, selectedOutlet === 'positive' && styles.sentimentCountActive]}>
              <MaterialCommunityIcons name="trending-up" size={14} color={Colors.success} />
              <Text style={[styles.sentimentNum, { color: Colors.success }]}>{positiveCount}</Text>
              <Text style={styles.sentimentLabel}>Positive</Text>
            </Pressable>
            <Pressable onPress={() => setSelectedOutlet(prev => prev === 'neutral' ? 'all' : 'neutral')} style={[styles.sentimentCount, selectedOutlet === 'neutral' && styles.sentimentCountActive]}>
              <MaterialCommunityIcons name="minus" size={14} color={Colors.textSecondary} />
              <Text style={[styles.sentimentNum, { color: Colors.textSecondary }]}>{neutralCount}</Text>
              <Text style={styles.sentimentLabel}>Neutral</Text>
            </Pressable>
            <Pressable onPress={() => setSelectedOutlet(prev => prev === 'negative' ? 'all' : 'negative')} style={[styles.sentimentCount, selectedOutlet === 'negative' && styles.sentimentCountActive]}>
              <MaterialCommunityIcons name="trending-down" size={14} color={Colors.error} />
              <Text style={[styles.sentimentNum, { color: Colors.error }]}>{negativeCount}</Text>
              <Text style={styles.sentimentLabel}>Negative</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Outlet filter strip */}
      {total > 0 ? (
        <View style={styles.outletStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.outletStripContent}>
            <Pressable onPress={() => setSelectedOutlet('all')} style={[styles.outletChip, selectedOutlet === 'all' && [styles.outletChipActive, { borderColor: Colors.gold }]]}>
              <MaterialCommunityIcons name="newspaper-variant" size={13} color={selectedOutlet === 'all' ? Colors.gold : Colors.textMuted} />
              <Text style={[styles.outletChipText, selectedOutlet === 'all' && { color: Colors.gold }]}>All</Text>
            </Pressable>
            {OUTLET_PROFILES.map(outlet => {
              const info = outletLatest[outlet.name];
              if (!info) return null;
              const isSelected = selectedOutlet === outlet.name;
              const sentColor = info.sentiment === 'positive' ? Colors.success : info.sentiment === 'negative' ? Colors.error : Colors.textMuted;
              return (
                <Pressable key={outlet.name} onPress={() => setSelectedOutlet(isSelected ? 'all' : outlet.name)} style={[styles.outletChip, isSelected && [styles.outletChipActive, { borderColor: outlet.color }]]}>
                  <MaterialCommunityIcons name={outlet.logo as any} size={13} color={isSelected ? outlet.color : Colors.textMuted} />
                  <View style={styles.outletChipContent}>
                    <Text style={[styles.outletChipText, isSelected && { color: outlet.color }]} numberOfLines={1}>{outlet.name.replace(' News', '').replace(' and ', ' & ')}</Text>
                    <View style={[styles.outletSentDot, { backgroundColor: sentColor }]} />
                  </View>
                  <View style={[styles.outletCount, { backgroundColor: outlet.color + '33' }]}>
                    <Text style={[styles.outletCountText, { color: outlet.color }]}>{info.count}</Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Topic filter */}
      {total > 0 ? (
        <View style={styles.topicStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.topicStripContent}>
            {TOPICS.map(topic => {
              const id = topic.toLowerCase() === 'all' ? 'all' : topic.toLowerCase();
              const isActive = selectedTopic === id;
              return (
                <Pressable key={topic} onPress={() => setSelectedTopic(isActive ? 'all' : id)} style={[styles.topicChip, isActive && styles.topicChipActive]}>
                  <Text style={[styles.topicChipText, isActive && { color: Colors.textPrimary, fontWeight: FontWeight.bold }]}>{topic}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Articles list */}
      <FlatList
        data={filtered}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="newspaper-variant-outline" size={64} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>{total === 0 ? 'No News Yet' : 'No Matching Articles'}</Text>
            <Text style={styles.emptySubtitle}>{total === 0 ? 'Take actions — press statements, event responses, policies generate AI media coverage.' : 'Try a different filter.'}</Text>
            <Pressable onPress={() => setNewsView('conference')} style={styles.scheduleBtn}>
              <MaterialCommunityIcons name="microphone" size={14} color={partyColor} />
              <Text style={[styles.scheduleBtnText, { color: partyColor }]}>Schedule a Press Conference</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }: { item: any }) => (
          <ExpandableNewsCard article={item} isExpanded={expandedId === item.id} onToggle={() => setExpandedId(prev => prev === item.id ? null : item.id)} />
        )}
      />
    </View>
  );
}

function AnswerInput({ outletColor, onSubmit }: { outletColor: string; onSubmit: (answer: string) => void }) {
  const [answer, setAnswer] = useState('');
  return (
    <View style={styles.answerInputSection}>
      <Text style={styles.sectionLabel}>YOUR ANSWER:</Text>
      <TextInput
        style={styles.answerTextInput}
        multiline
        placeholder="Type your response to the journalist's question..."
        placeholderTextColor={Colors.textMuted}
        value={answer}
        onChangeText={setAnswer}
        textAlignVertical="top"
      />
      <Pressable
        onPress={() => { if (answer.trim()) { onSubmit(answer); setAnswer(''); } }}
        disabled={!answer.trim()}
        style={({ pressed }) => [styles.submitBtn, { backgroundColor: outletColor }, !answer.trim() && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}
      >
        <MaterialCommunityIcons name="send" size={16} color="#fff" />
        <Text style={styles.submitBtnText}>Submit Answer</Text>
      </Pressable>
    </View>
  );
}

function ExpandableNewsCard({ article, isExpanded, onToggle }: { article: any; isExpanded: boolean; onToggle: () => void }) {
  const outlet = OUTLET_PROFILES.find(o => o.name === article.outlet);
  const sentimentColor = article.sentiment === 'positive' ? Colors.success : article.sentiment === 'negative' ? Colors.error : Colors.textSecondary;
  const sentimentIcon = article.sentiment === 'positive' ? 'trending-up' : article.sentiment === 'negative' ? 'trending-down' : 'minus';
  return (
    <Pressable onPress={onToggle} style={({ pressed }) => [styles.newsCard, pressed && { opacity: 0.95 }]}>
      <View style={styles.newsCardHeader}>
        <View style={[styles.newsOutletBadge, { backgroundColor: (outlet?.color || '#333') + '22' }]}>
          <MaterialCommunityIcons name={(outlet?.logo as any) || 'newspaper'} size={13} color={outlet?.color || Colors.textSecondary} />
          <Text style={[styles.newsOutletName, { color: outlet?.color || Colors.textSecondary }]}>{article.outlet}</Text>
        </View>
        <View style={styles.newsCardRight}>
          <View style={[styles.sentimentBadge, { backgroundColor: sentimentColor + '22', borderColor: sentimentColor + '44' }]}>
            <MaterialCommunityIcons name={sentimentIcon as any} size={11} color={sentimentColor} />
            <Text style={[styles.sentimentBadgeText, { color: sentimentColor }]}>{article.sentiment.toUpperCase()}</Text>
          </View>
          <Text style={styles.newsWeek}>Wk {article.week}</Text>
        </View>
      </View>
      {outlet ? (
        <View style={styles.biasRow}>
          <View style={styles.biasBar}>
            <View style={[styles.biasIndicator, { left: `${Math.max(0, Math.min(90, ((outlet.spinFactor + 1) / 2) * 90))}%` as any, backgroundColor: outlet.color }]} />
          </View>
          <Text style={styles.biasLabel}>{outlet.bias}</Text>
        </View>
      ) : null}
      <Text style={styles.newsHeadline}>{article.headline}</Text>
      {isExpanded && article.body ? <Text style={styles.newsBody}>{article.body}</Text> : null}
      <View style={styles.newsCardFooter}>
        <View style={[styles.topicTag, { backgroundColor: Colors.surfaceElevated }]}>
          <Text style={styles.topicTagText}>{article.topic?.toUpperCase()}</Text>
        </View>
        <MaterialCommunityIcons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, backgroundColor: Colors.surface },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8, position: 'relative' },
  requestBadge: { position: 'absolute', top: -6, right: -6, width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  requestBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, color: '#fff' },
  mediaEventBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: Colors.surfaceBorder },
  mediaEventBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  requestNotif: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md, paddingVertical: 8, backgroundColor: Colors.warning + '11', borderBottomWidth: 1, borderBottomColor: Colors.warning + '33' },
  requestNotifText: { flex: 1, fontSize: FontSize.xs, color: Colors.warning, fontWeight: FontWeight.medium },
  sentimentDashboard: { backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder, gap: 8 },
  sentimentBar: { height: 8, flexDirection: 'row', borderRadius: 4, overflow: 'hidden', backgroundColor: Colors.surfaceBorder },
  sentimentSegPos: { backgroundColor: Colors.success },
  sentimentSegNeu: { backgroundColor: Colors.textMuted },
  sentimentSegNeg: { backgroundColor: Colors.error },
  sentimentCounts: { flexDirection: 'row' },
  sentimentCount: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 4, borderRadius: Radius.sm },
  sentimentCountActive: { backgroundColor: Colors.surfaceElevated },
  sentimentNum: { fontSize: FontSize.base, fontWeight: FontWeight.bold },
  sentimentLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  outletStrip: { height: 52, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  outletStripContent: { flexDirection: 'row', paddingHorizontal: Spacing.md, paddingVertical: 8, gap: 8, alignItems: 'center' },
  outletChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  outletChipActive: {},
  outletChipContent: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  outletChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
  outletSentDot: { width: 6, height: 6, borderRadius: 3 },
  outletCount: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: Radius.full, minWidth: 18, alignItems: 'center' },
  outletCountText: { fontSize: 9, fontWeight: FontWeight.bold },
  topicStrip: { height: 44, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.surfaceBorder },
  topicStripContent: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 6, alignItems: 'center', paddingVertical: 6 },
  topicChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.surfaceBorder },
  topicChipActive: { backgroundColor: Colors.gold + '22', borderColor: Colors.gold + '66' },
  topicChipText: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textMuted },
  listContent: { padding: Spacing.md, gap: Spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: Spacing.xl, gap: Spacing.md },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textSecondary },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.surfaceBorder },
  scheduleBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  newsCard: { backgroundColor: Colors.card, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.surfaceBorder, gap: 8 },
  newsCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newsOutletBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.full },
  newsOutletName: { fontSize: 11, fontWeight: FontWeight.semibold },
  newsCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sentimentBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  sentimentBadgeText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.3 },
  newsWeek: { fontSize: FontSize.xs, color: Colors.textMuted },
  biasRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  biasBar: { flex: 1, height: 3, backgroundColor: Colors.surfaceBorder, borderRadius: 2, position: 'relative', overflow: 'hidden' },
  biasIndicator: { position: 'absolute', width: 8, height: 8, borderRadius: 4, top: -2.5, marginLeft: -4 },
  biasLabel: { fontSize: 9, color: Colors.textMuted, width: 70, textAlign: 'right' },
  newsHeadline: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, lineHeight: 22 },
  newsBody: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  newsCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topicTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  topicTagText: { fontSize: 10, fontWeight: FontWeight.medium, color: Colors.textSecondary, letterSpacing: 0.5 },
  // Session view
  sessionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, backgroundColor: Colors.surface },
  sessionHeaderCenter: { flex: 1, alignItems: 'center', gap: 4 },
  sessionHeaderTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  outletBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  outletBadgeText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  sessionContent: { padding: Spacing.md, gap: Spacing.md },
  statementSection: { gap: Spacing.sm },
  statementTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  statementDesc: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18 },
  statementInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 120, lineHeight: 22 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md },
  nextBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  qProgress: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qProgressDot: { width: 20, height: 6, borderRadius: 3, backgroundColor: Colors.surfaceBorder },
  qProgressText: { fontSize: FontSize.xs, color: Colors.textMuted, marginLeft: 'auto' },
  questionCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: 8 },
  questionAskerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  questionAsker: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, flex: 1 },
  topicPill: { backgroundColor: Colors.surfaceElevated, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.surfaceBorder },
  topicPillText: { fontSize: 9, color: Colors.textMuted },
  questionText: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary, lineHeight: 24 },
  prevAnswers: { gap: 6 },
  prevAnswerItem: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.sm, padding: Spacing.sm, gap: 4 },
  prevQ: { fontSize: FontSize.xs, color: Colors.textMuted, fontStyle: 'italic' },
  prevA: { fontSize: FontSize.xs, color: Colors.textSecondary },
  answerInputSection: { gap: 8 },
  answerTextInput: { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 100, lineHeight: 22 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing.md, borderRadius: Radius.md },
  submitBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, letterSpacing: 1.5 },
  completedCard: { borderRadius: Radius.xl, borderWidth: 2, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card },
  completedTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, textAlign: 'center' },
  completedOutlet: { fontSize: FontSize.sm, color: Colors.textSecondary },
  completedDesc: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  answerReviewCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, gap: Spacing.sm },
  answerReviewItem: { gap: 4, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: Colors.divider },
  answerReviewQ: { fontSize: FontSize.xs, color: Colors.textMuted, fontStyle: 'italic' },
  answerReviewA: { fontSize: FontSize.xs, color: Colors.textSecondary },
  doneBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md, borderRadius: Radius.md },
  doneBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: '#fff' },
  // Schedule view
  scheduleContent: { padding: Spacing.md, gap: Spacing.md },
  scheduleSection: { gap: Spacing.sm },
  scheduleNote: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18 },
  requestCard: { backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  requestHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  requestOutlet: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  requestReason: { fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 17, marginTop: 2, flex: 1 },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  urgencyText: { fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  acceptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: Radius.sm },
  acceptBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: '#fff' },
  outletEventCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.card, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md },
  outletEventName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  outletEventBias: { fontSize: FontSize.xs, color: Colors.textMuted },
  loadingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.gold + '11', borderRadius: Radius.sm, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.gold + '22' },
  loadingText: { fontSize: FontSize.xs, color: Colors.gold, flex: 1 },
});
