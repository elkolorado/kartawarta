import React, { useEffect, useState, useRef } from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import style from './style';
import { API_ENDPOINT } from '@/constants/apiConfig';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { colors } from '@/constants/themeColors';
import PrimaryButton from './primaryButton';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCardContext } from '@/context/CardContext';

interface CameraWebViewProps {
  setResult: (result: string) => void;
  setCardName: (cardName: string | null) => void;
  setCardInfo: (cardInfo: any) => void;
  setPhotoUri: (uri: string | null) => void;
}

const CameraWebView: React.FC<CameraWebViewProps> = ({ setResult, setCardName, setCardInfo, setPhotoUri }) => {
  const styles = style();
  const tabBarHeight = useBottomTabBarHeight();
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null); // Use Ref instead of ID for better reliability
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tcgName } = useCardContext();
  const tcgNameRef = useRef(tcgName);

  useEffect(() => {
    tcgNameRef.current = tcgName;
  }, [tcgName]);

  const uploadImage = async (blob: Blob, uri: string) => {
    setPhotoUri(uri);
    const formData = new FormData();
    const extension = blob.type.split('/')[1] || 'png';
    formData.append('file', blob, `upload.${extension}`);
    // formData.append('file', blob, 'photo.png');
    try {
      const response = await fetch(`${API_ENDPOINT}/matchCard?tcg_name=${encodeURIComponent(tcgNameRef.current)}`, { method: 'POST', body: formData });
      const result = await response.text();
      try {
        // setResult(result);
        const parsed = JSON.parse(result);
        setResult(JSON.stringify({ apiResult: parsed, raw: result, photoUri: uri }));
      } catch (e) {
        setResult(JSON.stringify({ apiResult: null, raw: result, photoUri: uri }));
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  useEffect(() => {
    let stream = null;

    const startStream = async () => {
      // Stop poprzedniego strumienia
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current = stream;
          setIsCameraReady(true);
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        setHasMultipleCameras(devices.filter(d => d.kind === 'videoinput').length > 1);
      } catch (err) {
        console.error('Camera Error:', err);
        setIsCameraReady(false);
      }
    };

    startStream();

    return () => {
      stream?.getTracks().forEach(t => t.stop());
      setIsCameraReady(false);
    };
  }, [facingMode]);

  const handleTakePhoto = async () => {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (videoRef.current && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const uri = canvas.toDataURL('image/png');
      const blob = await (await fetch(uri)).blob();
      uploadImage(blob, uri);
    }
  };

  useEffect(() => {
    window.addEventListener('paste', clipboardMatchWeb);
    return () => {
      window.removeEventListener('paste', clipboardMatchWeb);
    };
  }, [setCardName, setPhotoUri, setResult]);



const matchImage = async (blob: Blob) => {
  const photoUri = URL.createObjectURL(blob);
  setPhotoUri(photoUri);

  const formData = new FormData();
  formData.append('file', blob, 'clipboard.png');

  try {
    const query = new URLSearchParams({ tcg_name: tcgNameRef.current }).toString();
    const response = await fetch(`${API_ENDPOINT}/matchCard?${query}`, {
      method: 'POST',
      body: formData,
    });

    const raw = await response.text();
    let apiResult = null;

    try {
      apiResult = JSON.parse(raw);
      const cardName = apiResult.best_match || apiResult.card_details.cardMarketId;
      if (cardName) setCardName(cardName);
    } catch (e) {
      console.warn("API response is not JSON:", raw);
    }

    // Spójna aktualizacja stanu wyników
    setResult(JSON.stringify({ apiResult, raw, photoUri }));
  } catch (err) {
    console.error('Fetch error:', err);
  }
};

const clipboardMatchWeb = async () => {
  const cb = navigator.clipboard;
  if (!cb?.read) {
    console.error('Clipboard.read not supported');
    return;
  }
  try {
    const items = await cb.read();
    const imageItem = items.find(item => item.types.some(t => t.startsWith('image/')));
    if (imageItem) {
      const type = imageItem.types.find(t => t.startsWith('image/'))!;
      const blob = await imageItem.getType(type);
      await matchImage(blob);
    }
  } catch (err) {
    console.error('Failed to read clipboard:', err);
  }
};

  return (
    <View style={[styles.container, { flex: 1, padding: 0, backgroundColor: colors.colorBackground || '#000' }]}>

      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
        {/* We keep the video element in the DOM but hidden if not ready to prevent race conditions */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            display: isCameraReady ? 'block' : 'none',
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />

        {!isCameraReady && (
          <TouchableOpacity
            style={{
              width: '80%',
              height: 200,
              borderWidth: 2,
              borderColor: '#666',
              borderStyle: 'dashed',
              borderRadius: 12,
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20
            }}
            onPress={() => fileInputRef.current?.click()}
          >
            <Text style={{ color: '#fff', textAlign: 'center', fontSize: 16, marginBottom: 10 }}>
              Camera is off or blocked
            </Text>
            <Text style={{ color: '#aaa', textAlign: 'center', fontSize: 14 }}>
              Tap to upload or paste (Ctrl+V)
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <canvas id="canvas" style={{ display: 'none' }}></canvas>
      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" multiple onChange={(e) => {
        const file = e.target.files?.[0];
        // if (file) uploadImage(file, URL.createObjectURL(file));
        // multiple files support
        if (file) {
          const files = e.target.files;
          for (let i = 0; i < files!.length; i++) {
            const f = files![i];
            uploadImage(f, URL.createObjectURL(f));
          }
        }
      }} />

      <View style={{
        position: 'absolute',
        bottom: tabBarHeight + 20,
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'center',
        gap: 20,
        alignItems: 'center',
      }}>
        <PrimaryButton title="Upload" style={{ backgroundColor: "transparent" }} textStyle={{ color: colors.mutedForeground }} onPress={() => fileInputRef.current?.click()} icon={<FontAwesome6 name="images" size={24} color={colors.mutedForeground} />} />

        {isCameraReady && (
          // <button onClick={handleTakePhoto} style={buttonStyle('#007BFF', true)}>Take Photo</button>
          <PrimaryButton title="Scan" onPress={handleTakePhoto} icon={<FontAwesome6 name="camera" size={24} color={colors.primaryForeground} />} />
        )}

        {isCameraReady && hasMultipleCameras && (
          // <button onClick={() => setFacingMode(m => m === 'user' ? 'environment' : 'user')} style={buttonStyle('#444')}>Flip</button>
          <PrimaryButton title="" style={{ backgroundColor: "transparent" }} onPress={() => setFacingMode(m => m === 'user' ? 'environment' : 'user')} icon={<FontAwesome6 name="camera-rotate" size={24} color={colors.mutedForeground} />} />
        )}
      </View>
    </View>
  );
};

const buttonStyle = (bgColor: string, large = false) => ({
  padding: large ? '16px 24px' : '12px 20px',
  backgroundColor: bgColor,
  color: '#fff',
  border: 'none',
  borderRadius: '30px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
});

export default CameraWebView;