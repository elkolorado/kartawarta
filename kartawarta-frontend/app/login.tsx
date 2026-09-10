import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useSession } from '@/hooks/useAuth';
import style from '../components/style'
import PrimaryButton from '@/components/primaryButton';
import { LoginIcon } from '@/components/loginIcon';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/themeColors';
import { Redirect } from 'expo-router';
import Badge from '@/components/badge';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { ResponseType } from 'expo-auth-session';

// This ensures the browser closes after login
WebBrowser.maybeCompleteAuthSession();

const env = (typeof process !== 'undefined' ? process.env : {}) as Record<string, string | undefined>;
const webClientId = env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || env.VITE_GOOGLE_WEB_CLIENT_ID || '413150772909-62etgu7foj922uqaioic0h7p9fv4jeri.apps.googleusercontent.com';
const iosClientId = env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || env.VITE_GOOGLE_IOS_CLIENT_ID || '413150772909-v2nfgsco92b4bglvke2k694r5838nh2d.apps.googleusercontent.com';
const androidClientId = env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || env.VITE_GOOGLE_ANDROID_CLIENT_ID || '413150772909-9ot15s0u2ii4vp9mnihl0mhkq6a1hdq7.apps.googleusercontent.com';
const webRedirectUri = env.EXPO_PUBLIC_GOOGLE_WEB_REDIRECT_URI || env.VITE_GOOGLE_WEB_REDIRECT_URI || AuthSession.makeRedirectUri({ path: 'login' });

export default function LoginScreen() {
  const { loginWithGoogle, session } = useSession();
  const redirectUri = Platform.OS === 'web' ? webRedirectUri : undefined;
  
  // Replace these IDs with your actual IDs from Google Cloud Console
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: webClientId,
    webClientId,
    iosClientId,
    androidClientId,
    redirectUri,
    // Request an ID token (JWT) so backend can verify via Google ID token verification
    responseType: ResponseType.IdToken,
    scopes: ['openid', 'email', 'profile'],
  }, {
    native: 'com.elkolorado.fusionworldscanner://'
  });

  // Listen for the Google response
  useEffect(() => {
    if (response?.type === 'success') {
      // The backend verifies only Google ID tokens. Do not send access tokens.
      const idToken = (response as any).params?.id_token || response.authentication?.idToken;
      console.log('Google Authentication Response:', response, 'extracted idToken?', !!idToken);
      if (idToken) {
        handleGoogleLogin(idToken);
      } else {
        console.error('No Google ID token found in Google response');
      }
    }
  }, [response]);

  const handleGoogleLogin = async (idToken: string) => {
    const success = await loginWithGoogle(idToken);
    if (success) {
      console.log('Login successful');
    } else {
      console.log('Login failed');
    }
  };

  if (session) {
    return <Redirect href="/" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <View style={styles.logoContainer}>
            <Ionicons name="camera" size={48} color={colors.colorPrimaryForeground} />
          </View>

          <Text style={{ fontSize: 20, fontWeight: '700', color: colors.colorPrimary }}>
            TCG Card Scanner
          </Text>
          <Text style={{ color: colors.mutedForeground, textAlign: 'center', marginTop: 6, fontSize: 16 }}>
            Scan, collect, and manage your trading cards
          </Text>
        </View>

        <View style={{ alignItems: 'center', marginTop: 22 }}>
          <Text style={{ fontSize: 14, color: colors.mutedForeground, marginBottom: 8 }}>
            Supported TCGs:
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Badge label="Riftbound" bgColor="rgba(94, 53, 177, 0.12)" textColor="#c4b5fd" borderColor="rgba(124,58,237,0.2)" />
            <Badge label="Dragon Ball" bgColor="rgba(59,130,246,0.12)" textColor="#bfdbfe" borderColor="rgba(37,99,235,0.2)" />
            <Badge label="Cyberpunk" bgColor="rgba(250, 204, 21, 0.12)" textColor="#fde68a" borderColor="rgba(250,204,21,0.2)" />
          </View>
        </View>

        <View style={{ marginTop: 24 }}>
          <PrimaryButton 
            title="Continue with Google" 
            onPress={() => promptAsync()} 
            disabled={!request}
            icon={<LoginIcon />}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
    backgroundColor: colors.colorBackground,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderRadius: 16,
    padding: 22,
    borderWidth: 2,
    borderColor: 'rgba(212,175,55,0.25)',
    backgroundColor: 'rgba(10,15,20,0.06)',
    marginBottom: 20,
    // Note: React Native uses shadow props instead of boxShadow string
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#d4af37',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  }
});