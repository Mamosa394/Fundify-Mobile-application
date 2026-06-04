import React, {
  useState, useEffect, useRef, useCallback,
} from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  Pressable, KeyboardAvoidingView, Platform,
  Animated, ActivityIndicator, FlatList, Dimensions,
} from 'react-native';
import { LinearGradient }    from 'expo-linear-gradient';
import { Ionicons }          from '@expo/vector-icons';
import * as Haptics          from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar }         from 'expo-status-bar';
import { useFocusEffect }    from '@react-navigation/native';
import { auth }              from '../../services/firebase';
import { getCurrentBudget, getExpenses } from '../../services/budgetService';
import {
  generateInsights, streamChatMessage,
  getStoredApiKey, saveApiKey, clearApiKey,
} from '../../../src/services/geminiService';

const { width } = Dimensions.get('window');

// ─── Design Tokens ────────────────────────────────────────────────────────────
const COLORS = {
  background: '#F8FAFC', surface: '#FFFFFF', text: '#0F172A',
  muted: '#64748B', positive: '#34C759', negative: '#FF3B30',
  accent: '#1C1C1E', warning: '#F5A623', border: '#E2E8F0', inputBg: '#F8FAFC',
};
const FONTS = { bold: 'JosefinSans-Bold', semiBold: 'JosefinSans-SemiBold' };

const INSIGHT_THEME = {
  warning:  { bg: '#FEF3C7', border: '#F59E0B', text: '#B45309' },
  tip:      { bg: '#EFF6FF', border: '#3B82F6', text: '#1D4ED8' },
  positive: { bg: '#F0FDF4', border: '#22C55E', text: '#15803D' },
  alert:    { bg: '#FFF1F2', border: '#F43F5E', text: '#BE123C' },
};

const SUGGESTED_QUESTIONS = [
  'How can I save more this month?',
  'Am I spending too much on food?',
  'How do I budget for transport?',
  'What should I cut back on?',
];

// ─── InsightCard ──────────────────────────────────────────────────────────────
function InsightCard({ insight, index }) {
  const slideY  = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideY,  { toValue: 0, delay: index * 110, tension: 80, friction: 12, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, delay: index * 110, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  const theme = INSIGHT_THEME[insight.type] || INSIGHT_THEME.tip;

  return (
    <Animated.View style={[
      styles.insightCard,
      { backgroundColor: theme.bg, borderLeftColor: theme.border, opacity, transform: [{ translateY: slideY }] },
    ]}>
      <View style={styles.insightHeader}>
        <Text style={styles.insightEmoji}>{insight.emoji}</Text>
        <Text style={[styles.insightTitle, { color: theme.text }]}>{insight.title}</Text>
      </View>
      <Text style={styles.insightMessage}>{insight.message}</Text>
      {insight.action ? (
        <View style={[styles.insightAction, { backgroundColor: theme.border + '22' }]}>
          <Ionicons name="arrow-forward-circle" size={13} color={theme.border} />
          <Text style={[styles.insightActionText, { color: theme.text }]}>{insight.action}</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

// ─── ScoreBadge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score, label, summary }) {
  const color = score >= 80 ? COLORS.positive : score >= 60 ? COLORS.warning : COLORS.negative;
  return (
    <View style={styles.scoreBadge}>
      <LinearGradient colors={['#1C1C1E', '#2C2C2E']} style={styles.scoreGradient}>
        <View style={styles.scoreLeft}>
          <Text style={styles.scoreNumber}>{score}</Text>
          <Text style={styles.scoreOutOf}>/100</Text>
        </View>
        <View style={styles.scoreDivider} />
        <View style={styles.scoreRight}>
          <Text style={[styles.scoreLabel, { color }]}>{label}</Text>
          <Text style={styles.scoreSummary} numberOfLines={3}>{summary}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── TypingIndicator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  const d = [0, 1, 2].map(() => useRef(new Animated.Value(0)).current);
  useEffect(() => {
    d.forEach((dot, i) => {
      Animated.loop(Animated.sequence([
        Animated.delay(i * 140),
        Animated.timing(dot, { toValue: -5, duration: 270, useNativeDriver: true }),
        Animated.timing(dot, { toValue: 0,  duration: 270, useNativeDriver: true }),
        Animated.delay(480),
      ])).start();
    });
    return () => d.forEach(dot => dot.stopAnimation());
  }, []);

  return (
    <View style={styles.bubbleRow}>
      <View style={styles.aiAvatar}><Text style={styles.aiAvatarText}>F</Text></View>
      <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble]}>
        {d.map((dot, i) => (
          <Animated.View key={i} style={[styles.typingDot, { transform: [{ translateY: dot }] }]} />
        ))}
      </View>
    </View>
  );
}

// ─── ChatBubble ───────────────────────────────────────────────────────────────
function ChatBubble({ message, isStreaming }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.aiAvatar}><Text style={styles.aiAvatarText}>F</Text></View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {message.content}
          {isStreaming && message.content ? <Text style={styles.cursor}>▌</Text> : null}
        </Text>
      </View>
    </View>
  );
}

// ─── SetupBanner ──────────────────────────────────────────────────────────────
function SetupBanner({ onSaved }) {
  const [key,     setKey]     = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const valid = key.trim().length > 30;

  const handleSave = async () => {
    if (!valid) return;
    setSaving(true);
    setError('');
    try {
      await saveApiKey(key.trim());
      onSaved(key.trim());
    } catch (e) {
      setError('Could not save key. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.setupBanner}>
      <LinearGradient colors={['#1C1C1E', '#2C2C2E']} style={styles.setupGradient}>
        <Ionicons name="key-outline" size={36} color="#FFF" />
        <Text style={styles.setupTitle}>Connect Gemini AI</Text>
        <Text style={styles.setupSubtitle}>
          Get a FREE key from{'\n'}
          <Text style={{ color: '#60A5FA' }}>aistudio.google.com/apikey</Text>
          {'\n'}Completely free — no payment needed!
        </Text>

        <View style={styles.setupInputRow}>
          <TextInput
            style={styles.setupInput}
            value={key}
            onChangeText={setKey}
            placeholder="AIza... (paste your key here)"
            placeholderTextColor="rgba(255,255,255,0.25)"
            secureTextEntry={!showKey}
            autoCapitalize="none"
            autoCorrect={false}
            selectionColor="#FFF"
          />
          <Pressable onPress={() => setShowKey(v => !v)} style={styles.eyeBtn}>
            <Ionicons
              name={showKey ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color="rgba(255,255,255,0.5)"
            />
          </Pressable>
        </View>

        {error ? <Text style={styles.setupError}>{error}</Text> : null}

        <Pressable
          style={[styles.setupBtn, (!valid || saving) && { opacity: 0.4 }]}
          onPress={handleSave}
          disabled={!valid || saving}
        >
          <Text style={styles.setupBtnText}>
            {saving ? 'Saving…' : 'Activate AI Advisor'}
          </Text>
        </Pressable>

        <View style={styles.setupNote}>
          <Ionicons name="lock-closed-outline" size={12} color="rgba(255,255,255,0.4)" />
          <Text style={styles.setupNoteText}>Stored in secure device storage — never in your code</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AIAdvisorScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [activeTab,      setActiveTab]      = useState('insights');
  const [apiKey,         setApiKey]         = useState(null);
  const [hasKey,         setHasKey]         = useState(false);
  const [budgetData,     setBudgetData]     = useState(null);
  const [expenses,       setExpenses]       = useState([]);
  const [insights,       setInsights]       = useState(null);
  const [insightsError,  setInsightsError]  = useState(null);
  const [loadingData,    setLoadingData]    = useState(true);
  const [loadingAI,      setLoadingAI]      = useState(false);

  // Chat state
  const [chatMessages,   setChatMessages]   = useState([]);
  const [chatInput,      setChatInput]      = useState('');
  const [isTyping,       setIsTyping]       = useState(false);
  const [streamingId,    setStreamingId]    = useState(null);
  const [isStreamingActive, setIsStreamingActive] = useState(false);

  const chatRef   = useRef(null);
  const userId    = auth.currentUser?.uid;

  // ── Bootstrap ──
  useEffect(() => {
    (async () => {
      try {
        const [key, budget, expData] = await Promise.all([
          getStoredApiKey(),
          getCurrentBudget(userId),
          getExpenses(userId),
        ]);

        if (key) {
          setApiKey(key);
          setHasKey(true);
          setBudgetData(budget);
          setExpenses(expData || []);
          // Generate insights immediately
          runInsights(key, budget, expData || []);
        } else {
          setBudgetData(budget);
          setExpenses(expData || []);
        }
      } catch (e) {
        console.error('AIAdvisor init:', e);
      } finally {
        setLoadingData(false);
      }
    })();
  }, []);

  useFocusEffect(useCallback(() => {
    // Refresh budget data when tab refocused
    (async () => {
      try {
        const [budget, expData] = await Promise.all([
          getCurrentBudget(userId), 
          getExpenses(userId),
        ]);
        setBudgetData(budget);
        setExpenses(expData || []);
        
        // Refresh insights if we have a key and budget data
        if (hasKey && budget) {
          runInsights(apiKey, budget, expData || []);
        }
      } catch (e) { 
        console.log('Refresh error:', e);
      }
    })();
  }, [userId, hasKey]));

  const runInsights = async (key, budget, expData) => {
    if (!key || !budget) return;
    
    setLoadingAI(true);
    setInsightsError(null);
    try {
      const result = await generateInsights(budget, expData, key);
      setInsights(result);
    } catch (e) {
      console.error('Insights error:', e);
      setInsightsError(e.message || 'Could not load insights. Check your API key.');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleKeySaved = (key) => {
    setApiKey(key);
    setHasKey(true);
    if (budgetData) runInsights(key, budgetData, expenses);
  };

  // ── Send chat message ──
  const sendMessage = async (text) => {
    const msg = (text ?? chatInput).trim();
    if (!msg || isTyping || isStreamingActive) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChatInput('');

    const userMsg = { role: 'user', content: msg, id: `u${Date.now()}` };
    const updatedLog = [...chatMessages, userMsg];
    setChatMessages(updatedLog);
    setIsTyping(true);
    setIsStreamingActive(true);

    const streamId = `a${Date.now()}`;
    setChatMessages(prev => [...prev, { role: 'assistant', content: '', id: streamId }]);
    setStreamingId(streamId);
    
    setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 80);

    const apiMsgs = updatedLog.map(({ role, content }) => ({ role, content }));

    try {
      await streamChatMessage(
        apiMsgs, budgetData, expenses, apiKey,
        (chunk, fullText) => {
          setChatMessages(prev =>
            prev.map(m => m.id === streamId ? { ...m, content: fullText } : m)
          );
          chatRef.current?.scrollToEnd({ animated: false });
        },
        (finalText) => {
          setChatMessages(prev =>
            prev.map(m => m.id === streamId ? { ...m, content: finalText } : m)
          );
          setStreamingId(null);
          setIsTyping(false);
          setIsStreamingActive(false);
          chatRef.current?.scrollToEnd({ animated: true });
        },
        (err) => {
          console.error('chat stream error:', err);
          let errorMessage = 'Sorry, something went wrong. Please try again.';
          
          if (err.message?.includes('API key not valid') || err.message?.includes('403')) {
            errorMessage = '⚠️ Invalid API key. Please go back and re-enter your Gemini key.';
          } else if (err.message?.includes('quota') || err.message?.includes('429')) {
            errorMessage = '⏳ Rate limit reached. Please wait a moment and try again.';
          } else if (err.message?.includes('network') || err.message?.includes('fetch')) {
            errorMessage = '📡 Network error. Check your connection and try again.';
          }
          
          setChatMessages(prev =>
            prev.map(m => m.id === streamId
              ? { ...m, content: errorMessage, error: true }
              : m
            )
          );
          setStreamingId(null);
          setIsTyping(false);
          setIsStreamingActive(false);
        },
      );
    } catch (error) {
      console.error('Send message error:', error);
      setIsTyping(false);
      setIsStreamingActive(false);
      setStreamingId(null);
    }
  };

  // ── Loading screen ──
  if (loadingData) {
    return (
      <LinearGradient colors={['#F8FAFC', '#E2E8F0']} style={styles.flex}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading advisor…</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#F8FAFC', '#E2E8F0', '#CBD5E1']} style={styles.flex}>
      <StatusBar style="dark" />

      {/* Nav Header */}
      <View style={[styles.navHeader, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
        >
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </Pressable>

        <View style={styles.navCenter}>
          <Text style={styles.navTitle}>AI Advisor</Text>
          <View style={styles.finBadge}>
            <Text style={styles.finBadgeText}>Fin</Text>
          </View>
        </View>

        {hasKey ? (
          <Pressable
            style={styles.refreshBtn}
            onPress={() => runInsights(apiKey, budgetData, expenses)}
          >
            <Ionicons name="refresh-outline" size={20} color={COLORS.muted} />
          </Pressable>
        ) : <View style={{ width: 40 }} />}
      </View>

      {/* Tab Bar */}
      {hasKey && (
        <View style={styles.tabBar}>
          {[
            { key: 'insights', label: 'Insights', icon: 'bulb-outline' },
            { key: 'chat',     label: 'Ask Fin',  icon: 'chatbubble-ellipses-outline' },
          ].map(tab => (
            <Pressable
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab.key);
              }}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={activeTab === tab.key ? COLORS.text : COLORS.muted}
              />
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* ─────────────── No API Key ─────────────── */}
      {!hasKey ? (
        <ScrollView
          contentContainerStyle={[styles.setupScroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          <SetupBanner onSaved={handleKeySaved} />
        </ScrollView>

      /* ─────────────── Insights Tab ─────────────── */
      ) : activeTab === 'insights' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.insightsScroll, { paddingBottom: insets.bottom + 24 }]}
        >
          {loadingAI ? (
            <View style={styles.aiLoadingBox}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.aiLoadingTitle}>Analysing your budget…</Text>
              <Text style={styles.aiLoadingSubtitle}>
                Fin is reviewing your spending patterns
              </Text>
            </View>
          ) : insightsError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={40} color={COLORS.negative} />
              <Text style={styles.errorText}>{insightsError}</Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => runInsights(apiKey, budgetData, expenses)}
              >
                <Text style={styles.retryBtnText}>Try Again</Text>
              </Pressable>
            </View>
          ) : insights ? (
            <>
              <ScoreBadge
                score={insights.score}
                label={insights.scoreLabel}
                summary={insights.summary}
              />
              <Text style={styles.insightsSectionTitle}>Personalised Insights</Text>
              {insights.insights?.map((item, i) => (
                <InsightCard key={item.id || i} insight={item} index={i} />
              ))}

              {/* Settings row */}
              <Pressable
                style={styles.keySettingsRow}
                onPress={async () => {
                  await clearApiKey();
                  setHasKey(false);
                  setApiKey(null);
                  setInsights(null);
                  setChatMessages([]);
                }}
              >
                <Ionicons name="key-outline" size={14} color={COLORS.muted} />
                <Text style={styles.keySettingsText}>Change API Key</Text>
              </Pressable>
            </>
          ) : null}
        </ScrollView>

      /* ─────────────── Chat Tab ─────────────── */
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={insets.top + 110}
        >
          <FlatList
            ref={chatRef}
            data={chatMessages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <ChatBubble
                message={item}
                isStreaming={item.id === streamingId}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.chatContent,
              chatMessages.length === 0 && styles.chatContentEmpty,
            ]}
            ListEmptyComponent={
              <View style={styles.chatEmptyState}>
                <Text style={styles.chatEmptyEmoji}>🎓</Text>
                <Text style={styles.chatEmptyTitle}>Ask Fin anything</Text>
                <Text style={styles.chatEmptySubtitle}>
                  Your personal student budget advisor
                </Text>
                <View style={styles.suggestionsWrap}>
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <Pressable
                      key={i}
                      style={styles.suggestionChip}
                      onPress={() => sendMessage(q)}
                    >
                      <Text style={styles.suggestionText}>{q}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            }
            ListFooterComponent={isTyping && !streamingId ? <TypingIndicator /> : null}
          />

          {/* Input bar */}
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.chatInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Ask about your budget…"
                placeholderTextColor="#94A3B8"
                multiline
                maxLength={300}
                selectionColor={COLORS.accent}
              />
              <Pressable
                style={[styles.sendBtn, (!chatInput.trim() || isTyping || isStreamingActive) && styles.sendBtnDisabled]}
                onPress={() => sendMessage()}
                disabled={!chatInput.trim() || isTyping || isStreamingActive}
              >
                <Ionicons name="arrow-up" size={18} color="#FFF" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1 },

  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12,
  },
  loadingText: {
    fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.muted,
  },

  // ── Nav ──
  navHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#CBD5E1', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 2,
  },
  navCenter:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  navTitle:    { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text, letterSpacing: -0.3 },
  finBadge:    { backgroundColor: COLORS.accent, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  finBadgeText:{ fontSize: 12, fontFamily: FONTS.bold, color: COLORS.positive },
  refreshBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  // ── Tabs ──
  tabBar: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14, padding: 4, gap: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10,
  },
  tabActive:     { backgroundColor: COLORS.surface, shadowColor: '#CBD5E1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText:       { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.muted },
  tabTextActive: { color: COLORS.text },

  // ── Setup banner ──
  setupScroll: { padding: 20 },
  setupBanner: { borderRadius: 24, overflow: 'hidden' },
  setupGradient: {
    padding: 28, alignItems: 'center', gap: 12,
  },
  setupTitle: {
    fontSize: 24, fontFamily: FONTS.bold, color: '#FFF', letterSpacing: -0.5, textAlign: 'center',
  },
  setupSubtitle: {
    fontSize: 14, fontFamily: FONTS.semiBold, color: 'rgba(255,255,255,0.55)',
    textAlign: 'center', lineHeight: 22,
  },
  setupInputRow: {
    flexDirection: 'row', alignItems: 'center', width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 14,
    marginTop: 4,
  },
  setupInput: {
    flex: 1, fontSize: 14, fontFamily: FONTS.semiBold,
    color: '#FFF', paddingVertical: 14,
  },
  eyeBtn:      { padding: 8 },
  setupError:  { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.negative },
  setupBtn: {
    width: '100%', backgroundColor: COLORS.positive, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  setupBtnText: { fontSize: 16, fontFamily: FONTS.bold, color: '#FFF' },
  setupNote:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  setupNoteText: {
    fontSize: 11, fontFamily: FONTS.semiBold, color: 'rgba(255,255,255,0.35)',
  },

  // ── Insights ──
  insightsScroll: { paddingTop: 4 },

  scoreBadge:   { marginHorizontal: 16, marginBottom: 20, borderRadius: 22, overflow: 'hidden' },
  scoreGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 18, padding: 22,
  },
  scoreLeft:   { alignItems: 'center' },
  scoreNumber: { fontSize: 46, fontFamily: FONTS.bold, color: '#FFF', lineHeight: 50 },
  scoreOutOf:  { fontSize: 13, fontFamily: FONTS.semiBold, color: 'rgba(255,255,255,0.35)' },
  scoreDivider:{ width: 1, height: 52, backgroundColor: 'rgba(255,255,255,0.15)' },
  scoreRight:  { flex: 1 },
  scoreLabel:  { fontSize: 17, fontFamily: FONTS.bold, marginBottom: 6 },
  scoreSummary:{ fontSize: 12, fontFamily: FONTS.semiBold, color: 'rgba(255,255,255,0.5)', lineHeight: 18 },

  insightsSectionTitle: {
    fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text,
    marginHorizontal: 16, marginBottom: 12,
  },

  insightCard: {
    marginHorizontal: 16, marginBottom: 10, borderRadius: 16,
    padding: 16, borderLeftWidth: 3,
  },
  insightHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
  },
  insightEmoji: { fontSize: 20 },
  insightTitle: { fontSize: 14, fontFamily: FONTS.bold, flex: 1 },
  insightMessage: {
    fontSize: 13, fontFamily: FONTS.semiBold, color: '#374151', lineHeight: 20, marginBottom: 8,
  },
  insightAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  insightActionText: { fontSize: 12, fontFamily: FONTS.semiBold },

  aiLoadingBox: {
    alignItems: 'center', paddingVertical: 60, gap: 12,
  },
  aiLoadingTitle: {
    fontSize: 17, fontFamily: FONTS.bold, color: COLORS.text,
  },
  aiLoadingSubtitle: {
    fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.muted,
  },

  errorBox: {
    alignItems: 'center', padding: 32, gap: 12,
  },
  errorText: {
    fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.muted,
    textAlign: 'center', lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: COLORS.accent, borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 12,
  },
  retryBtnText: { fontSize: 15, fontFamily: FONTS.bold, color: '#FFF' },

  keySettingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'center', padding: 12, marginTop: 4,
  },
  keySettingsText: { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.muted },

  // ── Chat ──
  chatContent:      { paddingVertical: 12, gap: 8 },
  chatContentEmpty: { flex: 1 },

  chatEmptyState: {
    alignItems: 'center', paddingHorizontal: 24, paddingTop: 40, gap: 8,
  },
  chatEmptyEmoji:    { fontSize: 44 },
  chatEmptyTitle:    { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text, letterSpacing: -0.4 },
  chatEmptySubtitle: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.muted, marginBottom: 8 },

  suggestionsWrap: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4,
  },
  suggestionChip: {
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: COLORS.border,
  },
  suggestionText: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.text },

  bubbleRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, marginBottom: 4,
  },
  bubbleRowUser: { flexDirection: 'row-reverse' },
  aiAvatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  aiAvatarText: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.positive },

  bubble: {
    maxWidth: width * 0.72, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18,
  },
  bubbleAI: {
    backgroundColor: COLORS.surface, borderBottomLeftRadius: 4,
    shadowColor: '#CBD5E1', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 1,
  },
  bubbleUser: {
    backgroundColor: COLORS.accent, borderBottomRightRadius: 4,
  },
  bubbleText:     { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.text, lineHeight: 20 },
  bubbleTextUser: { color: '#FFF' },
  cursor:         { color: COLORS.muted, opacity: 0.8 },

  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  typingDot: {
    width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#94A3B8',
  },

  inputBar: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingHorizontal: 12, paddingTop: 10,
  },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    backgroundColor: COLORS.inputBg, borderRadius: 24,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  chatInput: {
    flex: 1, fontSize: 15, fontFamily: FONTS.semiBold,
    color: COLORS.text, maxHeight: 100, padding: 0,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.accent, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.35 },
});