// src/components/ScrollableTopTabBar.js

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  text: '#0F172A',
  muted: '#94A3B8',
  activeIndicator: '#3B82F6',
  arrowBg: 'rgba(0,0,0,0.06)',
  arrowIcon: '#64748B',
};

export default function ScrollableTopTabBar({ tabs, activeTab, onTabPress, style }) {
  const scrollRef = useRef(null);
  const [tabLayouts, setTabLayouts] = useState([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(SCREEN_WIDTH - 32);

  // Animated values - only use transforms (native driver compatible)
  const underlineX = useRef(new Animated.Value(0)).current;
  const underlineScaleX = useRef(new Animated.Value(0)).current;
  const underlineBaseWidth = useRef(0);

  // Find active tab index
  const activeIndex = tabs.findIndex(tab => tab === activeTab);

  // Measure container width
  const handleContainerLayout = useCallback((e) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  // Measure each tab label
  const handleTabLayout = useCallback((index, event) => {
    const { width, x } = event.nativeEvent.layout;
    setTabLayouts(prev => {
      const updated = [...prev];
      updated[index] = { width, x };
      return updated;
    });
  }, []);

  // Handle content size change
  const handleContentSizeChange = useCallback((w) => {
    setContentWidth(w);
  }, []);

  // Handle scroll position
  const handleScroll = useCallback((event) => {
    const offset = event.nativeEvent.contentOffset.x;
    setScrollOffset(offset);
  }, []);

  // Update scroll arrows visibility
  useEffect(() => {
    if (contentWidth > containerWidth) {
      setCanScrollLeft(scrollOffset > 2);
      setCanScrollRight(scrollOffset + containerWidth < contentWidth - 2);
    } else {
      setCanScrollLeft(false);
      setCanScrollRight(false);
    }
  }, [scrollOffset, contentWidth, containerWidth]);

  // Animate underline when active tab changes
  useEffect(() => {
    if (tabLayouts.length === 0 || activeIndex < 0 || activeIndex >= tabLayouts.length) return;

    const currentTab = tabLayouts[activeIndex];
    if (!currentTab) return;

    underlineBaseWidth.current = currentTab.width;

    Animated.parallel([
      Animated.spring(underlineX, {
        toValue: currentTab.x,
        useNativeDriver: true,
        tension: 120,
        friction: 14,
      }),
      Animated.spring(underlineScaleX, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 14,
      }),
    ]).start();

    // Auto-scroll active tab into view
    if (scrollRef.current && contentWidth > containerWidth) {
      const tabCenter = currentTab.x + currentTab.width / 2;
      const scrollTo = Math.max(0, Math.min(tabCenter - containerWidth / 2, contentWidth - containerWidth));
      scrollRef.current.scrollTo({ x: scrollTo, animated: true });
    }
  }, [activeIndex, tabLayouts, containerWidth, contentWidth, underlineX, underlineScaleX]);

  // Scroll by one tab width
  const scrollByOneTab = (direction) => {
    if (!scrollRef.current || tabLayouts.length === 0) return;
    
    const currentOffset = scrollOffset;
    const tabWidths = tabLayouts.map(t => t.width);
    const avgTabWidth = tabWidths.reduce((a, b) => a + b, 0) / tabWidths.length;
    
    let targetOffset;
    if (direction === 'left') {
      targetOffset = Math.max(0, currentOffset - avgTabWidth - 16);
    } else {
      targetOffset = Math.min(currentOffset + avgTabWidth + 16, contentWidth - containerWidth);
    }
    
    scrollRef.current.scrollTo({ x: targetOffset, animated: true });
  };

  const needsArrows = contentWidth > containerWidth;

  // Calculate underline width for initial render
  const underlineWidth = tabLayouts.length > 0 && activeIndex >= 0 
    ? tabLayouts[activeIndex]?.width || 0 
    : 0;

  return (
    <View style={[styles.container, style]} onLayout={handleContainerLayout}>
      {/* Left Arrow */}
      {needsArrows && canScrollLeft && (
        <View style={[styles.arrowBtn, styles.arrowLeft]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              scrollByOneTab('left');
            }}
            style={styles.arrowPressable}
          >
            <Ionicons name="chevron-back" size={16} color={COLORS.arrowIcon} />
          </Pressable>
        </View>
      )}

      {/* Tab ScrollView */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          // Center tabs when they fit within container
          contentWidth <= containerWidth && { flexGrow: 1, justifyContent: 'space-around' }
        ]}
      >
        {tabs.map((tab, index) => {
          const isActive = tab === activeTab;
          return (
            <Pressable
              key={tab}
              style={[
                styles.tabItem,
                // When tabs fit, use flex to distribute evenly
                contentWidth <= containerWidth && { flex: 1 }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onTabPress(tab);
              }}
              onLayout={(e) => handleTabLayout(index, e)}
            >
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Right Arrow */}
      {needsArrows && canScrollRight && (
        <View style={[styles.arrowBtn, styles.arrowRight]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              scrollByOneTab('right');
            }}
            style={styles.arrowPressable}
          >
            <Ionicons name="chevron-forward" size={16} color={COLORS.arrowIcon} />
          </Pressable>
        </View>
      )}

      {/* Animated Underline */}
      <Animated.View
        style={[
          styles.underline,
          {
            transform: [
              { translateX: underlineX },
              { scaleX: underlineScaleX },
            ],
            width: underlineWidth,
            opacity: tabLayouts.length > 0 && activeIndex >= 0 ? 1 : 0,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 46,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    position: 'relative',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
  },
  tabItem: {
    paddingHorizontal: 20,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: COLORS.text,
    fontFamily: 'JosefinSans-Bold',
    fontWeight: '800',
  },
  tabLabelInactive: {
    color: COLORS.muted,
    fontFamily: 'JosefinSans-SemiBold',
    fontWeight: '500',
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.activeIndicator,
    transformOrigin: 'left center',
  },
  arrowBtn: {
    position: 'absolute',
    top: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.arrowBg,
    zIndex: 10,
    overflow: 'hidden',
  },
  arrowPressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowLeft: {
    left: 6,
  },
  arrowRight: {
    right: 6,
  },
});