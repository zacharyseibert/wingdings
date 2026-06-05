import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'code'>('email');

  async function sendCode() {
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
      setStep('code');
    }
  }

  async function verifyCode() {
    if (!code.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    setLoading(false);
    if (error) {
      Alert.alert('Invalid code', 'Check the code and try again.');
    }
    // Auth state change in _layout.tsx handles navigation on success
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.emoji}>🍗</Text>
      <Text style={styles.title}>Wingdings</Text>
      <Text style={styles.sub}>Track every wing. Crown every champion.</Text>

      {step === 'email' ? (
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
            onSubmitEditing={sendCode}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={sendCode}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Send Code</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <Text style={styles.hint}>Enter the 6-digit code sent to {email}</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="000000"
            placeholderTextColor="#78716c"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            onSubmitEditing={verifyCode}
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={verifyCode}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>Sign In</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setStep('email'); setCode(''); }}>
            <Text style={styles.link}>Use a different email</Text>
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
  hint: { color: '#78716c', fontSize: 14, marginBottom: 8, textAlign: 'center' },
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
  codeInput: { fontSize: 28, textAlign: 'center', letterSpacing: 8 },
  button: {
    backgroundColor: '#E8722A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#E8722A', textAlign: 'center', marginTop: 4 },
});
