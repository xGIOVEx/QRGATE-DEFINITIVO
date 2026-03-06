import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { COLORS, SPACING } from '../utils/theme';
import { ShieldAlert, Check } from 'lucide-react-native';

const OVERRIDE_REASONS = [
    "Biglietto deteriorato/illeggibile",
    "Visitante minorenne senza smartphone",
    "Errore di sistema verificato",
    "Altro (specifica)"
];

const SupervisorOverride = ({ visible, onCancel, onConfirm }) => {
    const [pin, setPin] = useState('');
    const [reason, setReason] = useState(null);
    const [note, setNote] = useState('');
    const [error, setError] = useState(null);

    const handleConfirm = () => {
        if (pin.length !== 6) {
            setError('Inserisci il PIN Supervisore (6 cifre)');
            return;
        }
        if (!reason) {
            setError('Seleziona un motivo');
            return;
        }
        onConfirm({ pin, reason, note });
        // Reset
        setPin(''); setReason(null); setNote(''); setError(null);
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.modalBg}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <ShieldAlert color={COLORS.danger} size={32} />
                        <Text style={styles.title}>Override Supervisore</Text>
                    </View>

                    <ScrollView style={styles.body}>
                        <Text style={styles.label}>PIN di Conferma (6 cifre)</Text>
                        <TextInput
                            style={styles.input}
                            value={pin}
                            onChangeText={setPin}
                            keyboardType="numeric"
                            secureTextEntry
                            maxLength={6}
                            placeholder="******"
                        />

                        <Text style={styles.label}>Motivo dell'Override</Text>
                        <View style={styles.reasonsGrid}>
                            {OVERRIDE_REASONS.map(r => (
                                <TouchableOpacity
                                    key={r}
                                    style={[styles.reasonBtn, reason === r && styles.reasonBtnActive]}
                                    onPress={() => setReason(r)}
                                >
                                    <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>{r}</Text>
                                    {reason === r && <Check size={16} color="white" />}
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Note (opzionale)</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={note}
                            onChangeText={setNote}
                            multiline
                            placeholder="Specifica se necessario..."
                        />

                        {error && <Text style={styles.error}>{error}</Text>}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                            <Text style={styles.cancelText}>Annulla</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                            <Text style={styles.confirmText}>Conferma Manuale</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBg: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: SPACING.xl,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.md,
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.text,
    },
    body: {
        marginBottom: SPACING.xl,
    },
    label: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.textLight,
        textTransform: 'uppercase',
        marginBottom: SPACING.sm,
        marginTop: SPACING.md,
    },
    input: {
        backgroundColor: COLORS.slate[50],
        borderRadius: 12,
        padding: SPACING.md,
        fontSize: 18,
        fontWeight: '700',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    reasonsGrid: {
        gap: SPACING.sm,
    },
    reasonBtn: {
        padding: SPACING.md,
        borderRadius: 12,
        backgroundColor: COLORS.slate[50],
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    reasonBtnActive: {
        backgroundColor: COLORS.slate[900],
    },
    reasonText: {
        fontWeight: '600',
        color: COLORS.text,
    },
    reasonTextActive: {
        color: 'white',
    },
    footer: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    cancelBtn: {
        flex: 1,
        padding: SPACING.lg,
        alignItems: 'center',
    },
    cancelText: {
        fontWeight: '700',
        color: COLORS.textLight,
    },
    confirmBtn: {
        flex: 2,
        backgroundColor: COLORS.danger,
        padding: SPACING.lg,
        borderRadius: 20,
        alignItems: 'center',
    },
    confirmText: {
        color: 'white',
        fontWeight: '800',
        fontSize: 16,
    },
    error: {
        color: COLORS.danger,
        marginTop: SPACING.md,
        fontWeight: '700',
        textAlign: 'center',
    }
});

export default SupervisorOverride;
