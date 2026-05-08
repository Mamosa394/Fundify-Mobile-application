import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  StatusBar,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import ScreenWrapper from '../../components/layout/ScreenWrapper';
import BudgetGalaxy from '../../components/three/BudgetGalaxy';

const { width } = Dimensions.get('window');

const COLORS = {
  background: '#C9D1D6',

  card: '#D9DEE2',
  cardDark: '#748A98',

  border: 'rgba(255,255,255,0.5)',

  text: '#2F3A40',
  muted: '#6B7E89',

  white: '#F8FAFC',

  financial: '#738A98',
  academic: '#8599A5',
  scholarship: '#617987',
  engagement: '#4B5F6A',
};

const MOCK = {
  financial: {
    monthlyBudget: 2400,
    spentToDate: 1375,
  },

  academic: {
    gpa: 3.42,
    attendancePct: 78,
  },

  scholarship: {
    progressPct: 62,
    nextDeadlineDays: 9,
  },

  engagement: {
    streakDays: 6,
    nextBestAction: 'Submit missing documents',
  },
};

function fmtMoney(n) {
  return `M${n.toLocaleString()}`;
}

export default function DashboardScreen() {
  const [activeWidget, setActiveWidget] = useState('financial');

  const budgetLeft =
    MOCK.financial.monthlyBudget -
    MOCK.financial.spentToDate;

  const widgets = useMemo(() => {
    return [
      {
        key: 'financial',
        title: 'Financial Pulse',
        value: `${fmtMoney(budgetLeft)} left`,
        meta: 'Spent 57% this month',
        icon: 'wallet-outline',
        color: COLORS.financial,
      },

      {
        key: 'academic',
        title: 'Academic Health',
        value: `${MOCK.academic.gpa} GPA`,
        meta: '78% attendance',
        icon: 'book-outline',
        color: COLORS.academic,
      },

      {
        key: 'scholarship',
        title: 'Scholarship Progress',
        value: `${MOCK.scholarship.progressPct}%`,
        meta: 'Deadline in 9 days',
        icon: 'ribbon-outline',
        color: COLORS.scholarship,
      },

      {
        key: 'engagement',
        title: 'Engagement',
        value: `${MOCK.engagement.streakDays} day streak`,
        meta: MOCK.engagement.nextBestAction,
        icon: 'flame-outline',
        color: COLORS.engagement,
      },
    ];
  }, []);

  const onSelectWidget = (key) => {
    setActiveWidget(key);

    Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Light
    ).catch(() => {});
  };

  return (
    <ScreenWrapper>
      <StatusBar barStyle="dark-content" />

      {/* FIXES RANDOM WHITE MARGINS */}
      <View style={styles.safeBackground}>
        <LinearGradient
          colors={['#C9D1D6', '#BCC6CC']}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* HEADER */}
            <View style={styles.header}>
              <View>
                <Text style={styles.logo}>EduFlow</Text>

                <Text style={styles.subtitle}>
                  Student Ecosystem
                </Text>
              </View>

              <View style={styles.headerRight}>
                <Pressable style={styles.iconBtn}>
                  <Ionicons
                    name="notifications-outline"
                    size={22}
                    color={COLORS.text}
                  />
                </Pressable>

                <View style={styles.avatar} />
              </View>
            </View>

            {/* HERO CARD */}
            <View style={styles.heroCard}>
              <BudgetGalaxy
                mode={activeWidget}
                budgetProgress={0.57}
                scholarshipUrgency={0.6}
                academicRisk={0.3}
                engagement={0.4}
              />

              <LinearGradient
                colors={[
                  'transparent',
                  'rgba(20,30,40,0.55)',
                ]}
                style={styles.heroOverlay}
              />

              <View style={styles.heroContent}>
                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>
                    Live Intelligence
                  </Text>
                </View>

                <Text style={styles.heroTitle}>
                  Everything in orbit.
                </Text>

                <Text style={styles.heroSub}>
                  Everything in sync.
                </Text>

                <View style={styles.pagination}>
                  <View style={styles.pageActive} />
                  <View style={styles.pageDot} />
                  <View style={styles.pageDot} />
                  <View style={styles.pageDot} />
                </View>
              </View>
            </View>

            {/* SYSTEM CARD */}
            <View style={styles.systemCard}>
              <View style={styles.systemLeft}>
                <View style={styles.sparkle}>
                  <Ionicons
                    name="sparkles-outline"
                    size={18}
                    color={COLORS.white}
                  />
                </View>

                <View>
                  <Text style={styles.systemTitle}>
                    System Overview
                  </Text>

                  <Text style={styles.systemText}>
                    Your ecosystem is running smoothly.
                  </Text>
                </View>
              </View>

              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />

                <Text style={styles.statusText}>Good</Text>
              </View>
            </View>

            {/* GRID */}
            <View style={styles.grid}>
              {widgets.map((item) => {
                const active =
                  activeWidget === item.key;

                return (
                  <Pressable
                    key={item.key}
                    style={[
                      styles.widget,
                      active && {
                        borderColor: item.color,
                      },
                    ]}
                    onPress={() =>
                      onSelectWidget(item.key)
                    }
                  >
                    <View style={styles.widgetTop}>
                      <View
                        style={[
                          styles.widgetIconWrap,
                          {
                            backgroundColor:
                              'rgba(255,255,255,0.45)',
                          },
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={20}
                          color={item.color}
                        />
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color={COLORS.white}
                      />
                    </View>

                    <Text style={styles.widgetTitle}>
                      {item.title}
                    </Text>

                    <Text style={styles.widgetValue}>
                      {item.value}
                    </Text>

                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width:
                              item.key === 'financial'
                                ? '57%'
                                : item.key ===
                                  'academic'
                                ? '78%'
                                : item.key ===
                                  'scholarship'
                                ? '62%'
                                : '50%',
                          },
                        ]}
                      />
                    </View>

                    <Text style={styles.widgetMeta}>
                      {item.meta}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* QUICK ACTIONS */}
            <View style={styles.quickCard}>
              <View style={styles.quickHeader}>
                <Text style={styles.quickTitle}>
                  Quick Actions
                </Text>

                <Text style={styles.seeAll}>
                  See all
                </Text>
              </View>

              <View style={styles.quickGrid}>
                {[
                  {
                    icon: 'wallet-outline',
                    label: 'Budget',
                  },
                  {
                    icon: 'ribbon-outline',
                    label: 'Scholarships',
                  },
                  {
                    icon: 'calendar-outline',
                    label: 'Planner',
                  },
                ].map((item) => (
                  <Pressable
                    key={item.label}
                    style={styles.quickBtn}
                  >
                    <View style={styles.quickIcon}>
                      <Ionicons
                        name={item.icon}
                        size={22}
                        color={COLORS.white}
                      />
                    </View>

                    <Text style={styles.quickLabel}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* OVERVIEW */}
            <View style={styles.overviewCard}>
              <Text style={styles.overviewTitle}>
                Upcoming & Overview
              </Text>

              {[
                {
                  icon: 'calendar-outline',
                  title: 'Next Assignment',
                  value: 'Database Systems',
                  tag: '3 days',
                },

                {
                  icon: 'cash-outline',
                  title: 'Upcoming Expense',
                  value: 'Transport top-up',
                  tag: '5 days',
                },

                {
                  icon: 'bookmark-outline',
                  title: 'Scholarship Stage',
                  value: 'Awaiting payment confirmation',
                },
              ].map((item) => (
                <View
                  key={item.title}
                  style={styles.overviewRow}
                >
                  <View style={styles.overviewLeft}>
                    <View style={styles.overviewIcon}>
                      <Ionicons
                        name={item.icon}
                        size={22}
                        color={COLORS.white}
                      />
                    </View>

                    <View>
                      <Text
                        style={styles.overviewLabel}
                      >
                        {item.title}
                      </Text>

                      <Text
                        style={styles.overviewValue}
                      >
                        {item.value}
                      </Text>
                    </View>
                  </View>

                  {item.tag && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>
                        {item.tag}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </LinearGradient>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  safeBackground: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 120,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  logo: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -1,
  },

  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: '#DDE5EA',
    fontWeight: '500',
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  iconBtn: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
  },

  heroCard: {
    height: 380,
    borderRadius: 34,
    overflow: 'hidden',
    marginBottom: 18,
    backgroundColor: '#16232D',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },

  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },

  heroContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
  },

  liveBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 18,
  },

  liveBadgeText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },

  heroTitle: {
    color: COLORS.white,
    fontSize: 38,
    fontWeight: '900',
    lineHeight: 42,
    letterSpacing: -1,
  },

  heroSub: {
    color: '#D8E0E5',
    fontSize: 30,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: -0.5,
  },

  pagination: {
    flexDirection: 'row',
    marginTop: 18,
    gap: 10,
  },

  pageActive: {
    width: 36,
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.white,
  },

  pageDot: {
    width: 26,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  systemCard: {
    backgroundColor: 'rgba(100,120,140,0.35)',
    borderRadius: 28,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },

  systemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  sparkle: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  systemTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '800',
  },

  systemText: {
    color: '#DCE4E9',
    marginTop: 4,
    fontSize: 15,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.white,
  },

  statusText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
  },

  widget: {
    width: CARD_WIDTH,
    backgroundColor: 'rgba(110,130,145,0.45)',
    borderRadius: 30,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    minHeight: 250,
  },

  widgetTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
  },

  widgetIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  widgetTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
  },

  widgetValue: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '900',
    marginTop: 24,
    lineHeight: 36,
  },

  progressBar: {
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginTop: 24,
  },

  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#E8EEF2',
  },

  widgetMeta: {
    marginTop: 16,
    color: '#D9E0E5',
    fontSize: 15,
    lineHeight: 22,
  },

  quickCard: {
    marginTop: 20,
    backgroundColor: 'rgba(80,100,120,0.4)',
    borderRadius: 34,
    padding: 20,
  },

  quickHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },

  quickTitle: {
    color: COLORS.white,
    fontSize: 30,
    fontWeight: '800',
  },

  seeAll: {
    color: '#E4EBEF',
    fontSize: 18,
    fontWeight: '600',
  },

  quickGrid: {
    flexDirection: 'row',
    gap: 14,
  },

  quickBtn: {
    flex: 1,
    height: 120,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },

  quickIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  quickLabel: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 18,
  },

  overviewCard: {
    marginTop: 20,
    backgroundColor: 'rgba(60,80,100,0.45)',
    borderRadius: 34,
    padding: 22,
  },

  overviewTitle: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 18,
  },

  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },

  overviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  overviewIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  overviewLabel: {
    color: '#DCE4E9',
    fontSize: 15,
    marginBottom: 4,
  },

  overviewValue: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '700',
  },

  tag: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },

  tagText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});