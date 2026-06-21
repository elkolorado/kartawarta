import React, { useRef, useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Platform,
  Dimensions
} from "react-native";
import { CameraType, CameraView, FlashMode } from "expo-camera";
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient'; // Install this!
import { matchCard } from '@/actions/matchCard';
import { useCardContext } from "@/context/CardContext";

const { width, height } = Dimensions.get('window');

interface CameraViewProps {
  setResult: (result: string) => void;
  setPhotoUri?: (uri: string | null) => void;
}

const CameraViewMobile: React.FC<CameraViewProps> = ({ setResult, setPhotoUri }) => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { tcgName } = useCardContext();

  const tcgNameRef = useRef(tcgName);
  useEffect(() => {
    tcgNameRef.current = tcgName;
  }, [tcgName]);


  // --- ANIMATION REFS ---
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      // Loop the scanning beam
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scanAnim.setValue(0);
    }
  }, [loading]);

  const toggleFlash = () => {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setLoading(true); // Start animation
      processImage(result.assets[0].uri);
    }
  };

  const processImage = async (uri: string) => {
    try {
      if (setPhotoUri) setPhotoUri(uri);
      const apiResult = await matchCard(uri, tcgNameRef.current);
      const parsed = JSON.parse(apiResult);
      const wrapped = JSON.stringify({
        apiResult: parsed,
        raw: apiResult,
        photoUri: uri
      });
      setResult(wrapped);
    } catch (e) {
      console.error("Processing Error:", e);
    } finally {
      setLoading(false);
    }
  };

  async function takePhoto() {
    if (cameraRef.current && !loading) {
      setLoading(true);
      const photo = await cameraRef.current.takePictureAsync({ shutterSound: false });
      processImage(photo.uri);
    }
  }

  // Calculate the diagonal slide
  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-height, height],
  });

  return (
    <View style={styles.blackBackground}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <Animated.View style={[styles.scanBeamContainer, { transform: [{ translateY }] }]}>
            <LinearGradient
              colors={['transparent', 'rgba(212, 175, 55, 0.4)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scanBeam}
            />
          </Animated.View>

          <ActivityIndicator size="large" color="#d4af37" />
          <Text style={styles.aiText}>Scanning card...</Text>
        </View>
      )}

      {/* Top Controls */}
      <View style={styles.topControls}>
        <TouchableOpacity style={styles.secondaryButton} onPress={toggleFlash}>
          <Ionicons
            name={flash === 'on' ? "flash" : "flash-off-outline"}
            size={24}
            color={flash === 'on' ? "#d4af37" : "white"}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControlsContainer}>
        <TouchableOpacity style={styles.secondaryButton} onPress={pickImage} disabled={loading}>
          <Ionicons name="images-outline" size={26} color="white" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.shutterButtonOuter} onPress={takePhoto} disabled={loading}>
          <View style={[styles.shutterButtonInner, loading && { backgroundColor: '#555' }]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => setFacing(f => (f === 'back' ? 'front' : 'back'))}
        >
          <Ionicons name="camera-reverse-outline" size={26} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.cameraWrapper}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
          flash={flash}
          animateShutter={false} // Built-in blink disabled
          ref={cameraRef}
          pictureSize='1080x1920'
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  blackBackground: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraWrapper: {
    height: '100%',
    aspectRatio: 1080 / 1920,
    overflow: 'hidden',
    borderRadius: Platform.OS === 'ios' ? 30 : 0,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    overflow: 'hidden',
  },
  scanBeamContainer: {
    position: 'absolute',
    width: width * 2,
    height: 150,
    left: -width / 2,
  },
  scanBeam: {
    flex: 1,
    transform: [{ rotate: '-35deg' }], // Diagonal angle
  },
  loaderContent: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  aiText: {
    color: '#d4af37',
    marginTop: 15,
    fontSize: 12,
    // fontWeight: '900',
  },
  subText: {
    color: 'white',
    fontSize: 12,
    marginTop: 5,
    opacity: 0.7,
  },
  // ... rest of your styles stay the same
  topControls: {
    position: 'absolute',
    top: 10,
    right: 20,
    zIndex: 5,
  },
  bottomControlsContainer: {
    position: 'absolute',
    bottom: 10,
    right: 0,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    zIndex: 5,
    paddingHorizontal: 20,
  },
  secondaryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  shutterButtonOuter: {
    width: 60,
    height: 60,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 32,
    backgroundColor: 'white',
  },
});

export default CameraViewMobile;