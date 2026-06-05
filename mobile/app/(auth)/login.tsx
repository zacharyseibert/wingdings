import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function sendMagicLink() {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.emoji}>🍗</Text>
      <Text style={styles.title}>Wingdings</Text>
      <Text style={styles.sub}>Track every wing. Crown every champion.</Text>

      {sent ? (
        <View style={styles.sentBox}>
          <Text style={styles.sentTitle}>Check your email</Text>
          <Text style={styles.sentText}>
            We sent a magic link to {email}. Tap it to sign in.
          </Text>
          <TouchableOpacity onPress={() => setSent(false)}>
            <Text style={styles.link}>Use a different email</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor="#78716c"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={sendMagicLink}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={sendMagicLink}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Magic Link</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A0F0A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: { fontSize: 72, marginBottom: 12 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#F5E6D3', marginBottom: 8 },
  sub: { fontSize: 15, color: '#78716c', marginBottom: 48, textAlign: 'center' },
  form: { width: '100%', gap: 12 },
  input: {
    backgroundColor: '#2A1A10',
    borderWidth: 1,
    borderColor: '#3D2618',
    borderRadius: 12,
    padding: 16,
    color: '#F5E6D3',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#E8722A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sentBox: { alignItems: 'center', gap: 12 },
  sentTitle: { fontSize: 22, fontWeight: 'bold', color: '#F5E6D3' },
  sentText: { color: '#78716c', textAlign: 'center', lineHeight: 22 },
  link: { color: '#E8722A', marginTop: 8 },
});
