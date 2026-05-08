import React, { useRef, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Pressable,
  StatusBar,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';

import { Canvas, useFrame } from '@react-three/fiber/native';

import * as Haptics from 'expo-haptics';

import {
  ArrowRight,
  Heart,
  GraduationCap,
  BrainCircuit,
  Briefcase,
} from 'lucide-react-native';

import LoginScreen from './LoginScreen';



/* =========================================================
   SCREEN
========================================================= */

const { width, height } = Dimensions.get('window');



/* =========================================================
   SLIDES
========================================================= */

const slides = [
  {
    id: '1',

    type: 'heart',

    title: 'Scholarship\nLife.',

    subtitle:
      'Manage scholarships, allowances and university life in one intelligent student ecosystem.',

    icon: Heart,

    color: '#4a616c',
  },

  {
    id: '2',

    type: 'book',

    title: 'Academic\nIntelligence.',

    subtitle:
      'Track GPA, assignments and semester performance with predictive academic analytics.',

    icon: GraduationCap,

    color: '#64748b',
  },

  {
    id: '3',

    type: 'blob',

    title: 'AI Financial\nAssistant.',

    subtitle:
      'Receive smart budgeting insights and survival forecasts powered by AI.',

    icon: BrainCircuit,

    color: '#475569',
  },

  {
    id: '4',

    type: 'briefcase',

    title: 'Career\nAcceleration.',

    subtitle:
      'Discover internships, opportunities and career pathways before graduation.',

    icon: Briefcase,

    color: '#334155',
  },
];



/* =========================================================
   STUDENT OBJECTS
========================================================= */

function StudentObject({ type, color }) {
  const groupRef = useRef();
  const orbitRef = useRef();
  const blobRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(t * 1.2) * 0.08;
      groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.15;
    }

    if (orbitRef.current) {
      orbitRef.current.rotation.z = t * 0.12;
    }

    if (blobRef.current) {
      blobRef.current.scale.setScalar(0.9 + Math.sin(t) * 0.05);
    }
  });

  return (
    <>
      <ambientLight intensity={1.2} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />

      {/* Orbit ring */}
      <mesh ref={orbitRef} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[1.8, 0.04, 16, 100]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.15} />
      </mesh>

      {/* Heart */}
      {type === 'heart' && (
        <group ref={groupRef} scale={0.6}>
          <mesh position={[-0.35, 0.3, 0]}>
            <sphereGeometry args={[0.45, 16, 16]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0.35, 0.3, 0]}>
            <sphereGeometry args={[0.45, 16, 16]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.7, 0.7, 0.6]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      )}

      {/* Book */}
      {type === 'book' && (
        <group ref={groupRef} scale={0.8}>
          <mesh position={[0, -0.08, 0]}>
            <boxGeometry args={[1.6, 0.12, 1.2]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[1.5, 0.18, 1.1]} />
            <meshStandardMaterial color="#f8fafc" />
          </mesh>
          <mesh position={[0.04, 0.15, 0]} rotation={[0, 0.05, 0]}>
            <boxGeometry args={[1.6, 0.1, 1.2]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      )}

      {/* Blob */}
      {type === 'blob' && (
        <group ref={groupRef} scale={0.8}>
          <mesh ref={blobRef}>
            <sphereGeometry args={[0.9, 24, 24]} />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={0.9}
              roughness={0.2}
              metalness={0.5}
            />
          </mesh>
        </group>
      )}

      {/* Briefcase */}
      {type === 'briefcase' && (
        <group ref={groupRef} scale={0.8}>
          <mesh>
            <boxGeometry args={[1.6, 1.0, 0.4]} />
            <meshStandardMaterial color={color} />
          </mesh>
          <mesh position={[0, 0.65, 0]}>
            <torusGeometry args={[0.25, 0.05, 16, 32, Math.PI]} />
            <meshStandardMaterial color="#cbd5e1" />
          </mesh>
        </group>
      )}
    </>
  );
}



/* =========================================================
   MAIN SCREEN
========================================================= */

export default function WelcomeScreen() {

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [showLogin, setShowLogin] =
    useState(false);

  const scrollX = useRef(
    new Animated.Value(0)
  ).current;

  const flatListRef = useRef();



  /* =========================================================
     LOGIN
  ========================================================= */

  if (showLogin) {
    return <LoginScreen />;
  }



  /* =========================================================
     NEXT
  ========================================================= */

  const handleNext = async () => {

    await Haptics.impactAsync(
      Haptics.ImpactFeedbackStyle.Light
    );

    if (currentIndex < slides.length - 1) {

      flatListRef.current.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });

    } else {

      setShowLogin(true);
    }
  };



  /* =========================================================
     ITEM
  ========================================================= */

  const renderItem = ({ item, index }) => {

    const inputRange = [
      (index - 1) * width,
      index * width,
      (index + 1) * width,
    ];

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [30, 0, 30],
      extrapolate: 'clamp',
    });

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.95, 1, 0.95],
      extrapolate: 'clamp',
    });

    const Icon = item.icon;

    return (
      <View style={styles.slide}>

        {/* 3D */}
        <View style={styles.canvasContainer}>

          <Canvas
            dpr={1}

            gl={{
              antialias: false,
              alpha: true,
              powerPreference: 'low-power',
            }}

            camera={{
              position: [0, 0, 5],
              fov: 45,
            }}
          >

            <StudentObject
              type={item.type}
              color={item.color}
            />

          </Canvas>

        </View>



        {/* CONTENT */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity,
              transform: [
                { translateY },
                { scale },
              ],
            },
          ]}
        >

          {/* TOP */}
          <View style={styles.header}>

            <Text style={styles.logo}>
              EduFlow
            </Text>

            <Text style={styles.page}>
              0{index + 1}
            </Text>

          </View>



          {/* CENTER */}
          <View style={styles.center}>

            <View style={styles.iconContainer}>

              <Icon
                size={28}
                color="#ffffff"
              />

            </View>

            <Text style={styles.title}>
              {item.title}
            </Text>

            <Text style={styles.subtitle}>
              {item.subtitle}
            </Text>

          </View>



          {/* BOTTOM */}
          <View>

            {/* DOTS */}
            <View style={styles.pagination}>

              {slides.map((_, i) => (

                <View
                  key={i}
                  style={[
                    styles.dot,

                    currentIndex === i &&
                    styles.activeDot,
                  ]}
                />

              ))}

            </View>



            {/* BUTTON */}
            <Pressable
              onPress={handleNext}
            >

              <LinearGradient
                colors={[
                  '#4a616c',
                  '#334155',
                ]}
                style={styles.button}
              >

                <Text style={styles.buttonText}>

                  {index === slides.length - 1
                    ? 'Enter EduFlow'
                    : 'Continue'}

                </Text>

                <ArrowRight
                  size={18}
                  color="#fff"
                />

              </LinearGradient>

            </Pressable>

          </View>

        </Animated.View>

      </View>
    );
  };



  /* =========================================================
     RETURN
  ========================================================= */

  return (
    <LinearGradient
      colors={[
        '#e2e8f0',
        '#cbd5e1',
        '#94a3b8',
      ]}
      style={styles.container}
    >

      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="dark-content"
      />



      {/* BACKGROUND GLOWS */}
      <View style={styles.glowOne} />

      <View style={styles.glowTwo} />



      <Animated.FlatList
        ref={flatListRef}

        data={slides}

        renderItem={renderItem}

        keyExtractor={(item) => item.id}

        horizontal

        pagingEnabled

        bounces={false}

        decelerationRate="fast"

        showsHorizontalScrollIndicator={false}

        scrollEventThrottle={16}

        onMomentumScrollEnd={(event) => {

          const index = Math.round(
            event.nativeEvent.contentOffset.x / width
          );

          setCurrentIndex(index);
        }}

        onScroll={Animated.event(
          [
            {
              nativeEvent: {
                contentOffset: {
                  x: scrollX,
                },
              },
            },
          ],
          {
            useNativeDriver: true,
          }
        )}
      />

    </LinearGradient>
  );
}



/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({

  container: {
    flex: 1,
  },



  slide: {
    width,
    height,
  },



  glowOne: {
    position: 'absolute',

    width: 260,
    height: 260,

    borderRadius: 260,

    backgroundColor:
      'rgba(255,255,255,0.22)',

    top: -80,
    right: -70,
  },



  glowTwo: {
    position: 'absolute',

    width: 220,
    height: 220,

    borderRadius: 220,

    backgroundColor:
      'rgba(255,255,255,0.12)',

    bottom: -50,
    left: -40,
  },



  canvasContainer: {
    position: 'absolute',

    width,
    height,

    top: -90,
  },



  content: {
    flex: 1,

    paddingTop: 70,

    paddingHorizontal: 30,

    paddingBottom: 42,

    justifyContent: 'space-between',
  },



  header: {
    flexDirection: 'row',

    justifyContent: 'space-between',

    alignItems: 'center',
  },



  logo: {
    fontSize: 30,

    color: '#1e293b',

    fontFamily: 'JosefinSans-Bold',
  },



  page: {
    fontSize: 15,

    color: '#64748b',

    fontFamily: 'JosefinSans-Bold',
  },



  center: {
    marginTop: 60,
  },



  iconContainer: {
    width: 76,
    height: 76,

    borderRadius: 38,

    justifyContent: 'center',

    alignItems: 'center',

    backgroundColor:
      'rgba(255,255,255,0.24)',

    borderWidth: 1,

    borderColor:
      'rgba(255,255,255,0.35)',

    marginBottom: 28,
  },



  title: {
    fontSize: 46,

    lineHeight: 52,

    color: '#ffffff',

    fontFamily: 'JosefinSans-Bold',

    marginBottom: 18,
  },



  subtitle: {
    fontSize: 17,

    lineHeight: 30,

    color: '#475569',

    fontFamily: 'JosefinSans-Bold',

    maxWidth: '92%',
  },



  pagination: {
    flexDirection: 'row',

    gap: 10,

    marginBottom: 28,
  },



  dot: {
    width: 10,
    height: 10,

    borderRadius: 10,

    backgroundColor:
      'rgba(71,85,105,0.18)',
  },



  activeDot: {
    width: 32,

    backgroundColor: '#4a616c',
  },



  button: {
    height: 68,

    borderRadius: 28,

    flexDirection: 'row',

    justifyContent: 'center',

    alignItems: 'center',

    gap: 10,

    shadowColor: '#334155',

    shadowOffset: {
      width: 0,
      height: 10,
    },

    shadowOpacity: 0.16,

    shadowRadius: 20,

    elevation: 8,
  },



  buttonText: {
    color: '#fff',

    fontSize: 18,

    fontFamily: 'JosefinSans-Bold',
  },

});