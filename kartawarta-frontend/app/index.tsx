import { useCameraPermissions } from 'expo-camera';
import { useEffect, useState } from 'react';
import { Button, Text, View, Platform, useWindowDimensions } from 'react-native';
import style from '@/components/style';
import CameraWebView from '@/components/cameraWebView';
import CameraViewMobile from '@/components/cameraViewMobile';
import { useSession } from '@/hooks/useAuth';
import { Redirect, useLocalSearchParams } from 'expo-router';
import ScannedCards from '@/components/scannedCards';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCardContext } from '@/context/CardContext';
import { getTcgByName, normalizeTcgName } from '@/constants/tcgs';


export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const { tcgName: routeTcgName } = useLocalSearchParams<{ tcgName?: string }>();
  const { setTcgName, setTcgId } = useCardContext();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [results, setResults] = useState<Array<{ cardName: string; cardInfo: any; photoUri: string; result: string, id: string }>>([]);
  const { session, isLoading } = useSession();

  // Inside your component:
  const { width } = useWindowDimensions();
  const treshold = 1327; // You can adjust this threshold as needed
  const isLargeWeb = Platform.OS === 'web' && width > treshold;
  const isSmallScreen = width <= treshold; // This catches both actual mobile and resized web browsers

  // get the native bottom padding
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const normalizedTcgName = normalizeTcgName(routeTcgName);
    const tcg = getTcgByName(normalizedTcgName);
    setTcgName(tcg.name);
    setTcgId(tcg.id);
  }, [routeTcgName, setTcgId, setTcgName]);

  if (isLoading) {
    return <View />;
  }

  const addResult = (cardName: string, cardInfo: any, photoUri: string, result: string) => {
    setResults((prevResults) => [
      {
        id: Math.random().toString(36).substring(7), // Unique ID is critical
        cardName,
        cardInfo,
        photoUri,
        result
      },
      ...prevResults,
    ]);
  };

  const removeResult = (index: number) => {
    console.log('Removing result at index:', index);
    setResults((prevResults) => prevResults.filter((_, i) => i !== index));
  }

  const updateResultCard = (index: number, cardInfo: any) => {
    setResults((prevResults) => prevResults.map((result, i) => (
      i === index
        ? {
            ...result,
            cardName: cardInfo?.cardMarketId || cardInfo?.name || result.cardName,
            cardInfo,
          }
        : result
    )));
  };

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (Platform.OS !== 'web' && !permission) {
    return <View />;
  }

  if (Platform.OS !== 'web' && permission && !permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  const handleResult = (result: string) => {
    if ('apiResult' in JSON.parse(result)) {
      try {
        const parsed = JSON.parse(result);
        if (parsed && parsed.apiResult !== undefined) {
          const api = parsed.apiResult;
          const cardName = api?.card_details?.cardMarketId || api?.best_match?.replace?.('.webp', '') || '';
          const cardInfo = api?.card_details || api || null;
          const sentPhoto = parsed.photoUri || '';
          console.log('Parsed result from web camera:', parsed.raw);
          addResult(cardName, cardInfo, sentPhoto, parsed.raw || result);
          return;
        }
      } catch (e) {
        // fall through
      }
      // Fallback for old/raw result
      try {
        const raw = JSON.parse(result);
        const cardName = raw.card_details?.cardMarketId;
        const cardInfo = raw.card_details;
        addResult(cardName, cardInfo, photoUri || '', result);
      } catch (err) {
        addResult('', null, photoUri || '', result);
      }
    } else {
      // means we received multiple results like {status, total_time, output_path, matches: {card_0: {...}, ...} }
      try {
        // Try to parse as multiple results, by getting to matches and then taking all there and adding them one by one
        const raw = JSON.parse(result);
        const matches = raw.matches || {};
        console.log('Parsed multiple matches from web camera:', matches);
        for (const key in matches) {
          const match = matches[key];
          const cardName = match.card_details?.cardMarketId || '';
          const cardInfo = match.card_details || null;
          addResult(cardName, cardInfo, photoUri || '', JSON.stringify(match));
        }
      } catch (err) {
        addResult('', null, photoUri || '', result);
      }
    }
  }


 return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={[
        { flex: 1 },
        isLargeWeb && styles.desktopContainer // Only apply desktop layout if it's web AND wide
      ]}>

        <View style={[
          styles.cameraContainer, 
          isLargeWeb ? styles.column : { flex: 1.4 } // Use mobile flex on small web screens
        ]}>
          {Platform.OS === 'web' ? (
            <CameraWebView
              setResult={handleResult}
              setCardName={() => { }}
              setPhotoUri={setPhotoUri}
              setCardInfo={() => { }}
            />
          ) : (
            <CameraViewMobile
              setResult={handleResult}
              setPhotoUri={setPhotoUri}
            />
          )}
        </View>

        {results.length > 0 && (
          <ScannedCards 
            results={results} 
            removeResult={removeResult} 
            updateResultCard={updateResultCard}
            clearResults={() => setResults([])}
            style={[
              isLargeWeb ? styles.column : {
                width: '100%',
                flex: 1.3,
                paddingTop: 8
              }
            ]} 
          />
        )}
      </View>
    </View>
  );
}

const styles = style();