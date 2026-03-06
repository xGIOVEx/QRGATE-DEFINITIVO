import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING } from '../utils/theme';
import { Rocket, ShieldCheck } from 'lucide-react-native';

const LoginScreen = () => {
    const [slug, setSlug] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { login } = useAuth();

    const handleLogin = async () => {
        if (!slug || pin.length < 4) {
            setError('Inserisci slug e PIN valido');
            return;
        }

        setLoading(true);
        setError(null);

        const result = await login(slug, pin);
        if (!result.success) {
            setError(result.error);
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.inner}>
                <View style={styles.header}>
                    <View style={styles.logoCircle}>
                        <Rocket size={40} color={COLORS.white} />
                    </View>
                    <Text style={styles.title}>QRGate Scanner</Text>
                    <Text style={styles.subtitle}>Staff Login</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Codice Venue (Slug)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="es. museo-civico-roma"
                            value={slug}
                            onChangeText={setSlug}
                            autoCapitalize="none"
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Codice PIN</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="4 o 6 cifre"
                            value={pin}
                            onChangeText={setPin}
                            keyboardType="numeric"
                            secureTextEntry
                            maxLength={6}
                            placeholderTextColor={COLORS.textLight}
                        />
                    </View>

                    {error && (
                        <Text style={styles.errorText}>{error}</Text>
                    )}

                    <TouchableOpacity
                        style={[styles.loginButton, loading && styles.disabledButton]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <>
                                <Text style={styles.loginButtonText}>Accedi</Text>
                                <ShieldCheck size={20} color={COLORS.white} />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Version 1.0.0 (SDK 51)</Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    inner: {
        flex: 1,
        padding: SPACING.xl,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING['2xl'],
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        color: COLORS.textLight,
        fontWeight: '600',
        marginTop: 4,
    },
    form: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.textLight,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: SPACING.sm,
    },
    input: {
        backgroundColor: COLORS.slate[100],
        borderRadius: 12,
        padding: SPACING.md,
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    errorText: {
        color: COLORS.danger,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: SPACING.md,
    },
    loginButton: {
        backgroundColor: COLORS.slate[900],
        borderRadius: 20,
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    disabledButton: {
        opacity: 0.7,
    },
    loginButtonText: {
        color: COLORS.white,
        fontSize: 20,
        fontWeight: '800',
    },
    footer: {
        position: 'absolute',
        bottom: SPACING.xl,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        color: COLORS.textLight,
        fontWeight: '500',
    }
});

export default LoginScreen;
