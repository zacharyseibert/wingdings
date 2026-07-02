import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/colors';

const DEMO_EMAIL = 'applereview@wingdings.app';
const DEMO_PASSWORD = 'WingReview2026!';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'code'>('email');

  async function sendCode() {
    if (!email.trim()) return;
    setLoading(true);

    // Demo account bypass — skip OTP entirely
    if (email.trim().toLowerCase() === DEMO_EMAIL) {
      const { error } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      setLoading(false);
      if (error) Alert.alert('Error', error.message);
      return;
    }

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
            placeholderTextColor={colors.textSecondary}
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
            placeholderTextColor={colors.textSecondary}
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
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: { fontSize: 72, marginBottom: 12 },
  title: { fontSize: 36, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  sub: { fontSize: 15, color: colors.textSecondary, marginBottom: 48, textAlign: 'center' },
  hint: { color: colors.textSecondary, fontSize: 14, marginBottom: 8, textAlign: 'center' },
  form: { width: '100%', gap: 12 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    height: 52,
  },
  codeInput: { fontSize: 28, textAlign: 'center', letterSpacing: 8 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: colors.primary, textAlign: 'center', marginTop: 4 },
});
