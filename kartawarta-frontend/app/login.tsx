import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useSession } from '@/hooks/useAuth';
import style from '../components/style'
import PrimaryButton from '@/components/primaryButton';
import { LoginIcon } from '@/components/loginIcon';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/themeColors';
import { Redirect } from 'expo-router';
import Badge from '@/components/badge';

export default function LoginScreen() {
  const [username, setUsername] = useState('123');
  const [password, setPassword] = useState('123');
  const { login } = useSession();
  const globalStyles = style();

  const handleLogin = async () => {
    let tryLogin = await login(username, password);
    console.log('Login successful_', tryLogin);
    if (tryLogin) {
      console.log('Login successful');
    } else {
      console.log('Login failed');
    }
  };

  if( useSession().session ) {
    return <Redirect href="/"/>;
  }

  return (
    <View style={[styles.container]}>
      <View
        style={{
          width: '100%',
          maxWidth: 420,
          alignSelf: 'center',
          borderRadius: 16,
          padding: 22,
          borderWidth: 2,
          borderColor: 'rgba(212,175,55,0.25)',
          backgroundColor: 'rgba(10,15,20,0.06)',
          marginBottom: 20,
          boxShadow: '0 0 20px #d4af374d',
          
        }}
      >
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 16,
              backgroundColor: '#d4af37',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 22,
            }}
          >
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
            <Badge label="Dragon Ball Fusion World" bgColor="rgba(59,130,246,0.12)" textColor="#bfdbfe" borderColor="rgba(37,99,235,0.2)" />


          </View>
        </View>

        <View style={{ marginTop: 8 }}>
          <PrimaryButton title="Continue with Google" onPress={handleLogin} icon={<LoginIcon />}/>
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
  }
});