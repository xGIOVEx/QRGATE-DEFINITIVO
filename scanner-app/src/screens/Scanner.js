import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import { COLORS, SPACING } from '../utils/theme';
import { dbService } from '../db/sqlite';
import { cryptoService } from './crypto';
import { useSync } from '../hooks/useSync';
import { useAuth } from '../context/AuthContext';
import { soundService } from '../utils/sound';
import FeedbackOverlay from '../components/FeedbackOverlay';
import SyncBanner from '../components/SyncBanner';
import SupervisorOverride from '../components/SupervisorOverride';
import * as Battery from 'expo-battery';
import { Volume2, VolumeX, History, Search, ShieldAlert } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

const ScannerScreen = ({ navigation }) => {
    useKeepAwake();
    const { user } = useAuth();
    const [permission, requestPermission] = useCameraPermissions();
    const [scannedResult, setScannedResult] = useState(null);
    const [soundOn, setSoundOn] = useState(true);
    const [isOnline, setIsOnline] = useState(true);
    const [pendingSync, setPendingSync] = useState(0);
    const [overrideVisible, setOverrideVisible] = useState(false);
    const [batteryLevel, setBatteryLevel] = useState(1);

    // Custom Sync Hook
    const { forceSync } = useSync(user?.id, !!user);

    useEffect(() => {
        (async () => {
            const level = await Battery.getBatteryLevelAsync();
            setBatteryLevel(level);
        })();
    }, []);

    const lastScannedTimeRef = useRef(0);
    const lastScannedQRRef = useRef(null);

    if (!permission) return <View />;
    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionText}>L'app ha bisogno della fotocamera per scansionare i biglietti.</Text>
                <TouchableOpacity style={styles.button} onPress={requestPermission}>
                    <Text style={styles.buttonText}>Consenti Fotocamera</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarcodeScanned = async ({ data }) => {
        const now = Date.now();
        if (data === lastScannedQRRef.current && now - lastScannedTimeRef.current < 2000) return;
        if (scannedResult) return;

        lastScannedQRRef.current = data;
        lastScannedTimeRef.current = now;

        try {
            const cryptoResult = await cryptoService.verifyQRCode(data);
            if (!cryptoResult.valid) {
                setScannedResult({ type: 'INVALID', data: { reason: 'QR non autentico' } });
                soundService.playInvalid();
                return;
            }

            const qrHash = cryptoResult.payload.qr_hash;
            const ticket = await dbService.lookupTicket(qrHash);

            if (!ticket) {
                setScannedResult({ type: 'INVALID', data: { reason: 'Biglietto non trovato' } });
                soundService.playInvalid();
                return;
            }

            if (ticket.used_at) {
                setScannedResult({ type: 'USED', data: ticket });
                soundService.playUsed();
                return;
            }

            const nowSec = Math.floor(now / 1000);
            if (nowSec < ticket.valid_from) {
                setScannedResult({ type: 'INVALID', data: { ...ticket, reason: `Biglietto valido dalle ${new Date(ticket.valid_from * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` } });
                soundService.playInvalid();
                return;
            }

            if (nowSec > ticket.valid_until) {
                setScannedResult({ type: 'INVALID', data: { ...ticket, reason: 'Biglietto scaduto' } });
                soundService.playInvalid();
                return;
            }

            await dbService.useTicket(qrHash, 'VALID');
            setScannedResult({ type: 'VALID', data: ticket });
            soundService.playValid();
            setPendingSync(prev => prev + 1);

        } catch (error) {
            setScannedResult({ type: 'INVALID', data: { reason: 'Errore interno' } });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <SyncBanner isOnline={isOnline} pendingSyncCount={pendingSync} />

            {batteryLevel < 0.15 && (
                <View style={styles.batteryWarning}>
                    <Text style={styles.batteryText}>⚠️ Batteria Bassa — Sincronizza prima di spegnere</Text>
                </View>
            )}

            <View style={styles.cameraFrame}>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    onBarcodeScanned={handleBarcodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                    }}
                />

                <TouchableOpacity
                    activeOpacity={1}
                    style={styles.overlay}
                    onLongPress={() => user?.role === 'supervisor' && setOverrideVisible(true)}
                    delayLongPress={1000}
                >
                    <View style={styles.viewfinder}>
                        <View style={[styles.corner, styles.cornerTL]} />
                        <View style={[styles.corner, styles.cornerTR]} />
                        <View style={[styles.corner, styles.cornerBL]} />
                        <View style={[styles.corner, styles.cornerBR]} />
                    </View>
                    <Text style={styles.instructions}>Inquadra il codice QR</Text>
                    <Text style={styles.subInstructions}>(Pressione lunga per override)</Text>
                </TouchableOpacity>

                <View style={styles.controlsLeft}>
                    <TouchableOpacity
                        style={styles.controlBtn}
                        onPress={() => navigation.navigate('History')}
                    >
                        <History color="white" size={24} />
                    </TouchableOpacity>
                </View>

                <View style={styles.controlsRight}>
                    <TouchableOpacity
                        style={styles.controlBtn}
                        onPress={() => setSoundOn(!soundOn)}
                    >
                        {soundOn ? <Volume2 color="white" size={24} /> : <VolumeX color="red" size={24} />}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.controlBtn}>
                        <Search color="white" size={24} />
                    </TouchableOpacity>
                </View>
            </View>

            {scannedResult && (
                <>
                    <FeedbackOverlay
                        type={scannedResult.type}
                        data={scannedResult.data}
                        onDismiss={() => setScannedResult(null)}
                    />
                    {scannedResult.type === 'INVALID' && user?.role === 'supervisor' && (
                        <TouchableOpacity
                            style={styles.overrideBtn}
                            onPress={() => setOverrideVisible(true)}
                        >
                            <ShieldAlert color="white" size={20} />
                            <Text style={styles.overrideBtnText}>Consenti Manualmente</Text>
                        </TouchableOpacity>
                    )}
                </>
            )}

            <SupervisorOverride
                visible={overrideVisible}
                onCancel={() => setOverrideVisible(false)}
                onConfirm={async ({ pin, reason, note }) => {
                    setOverrideVisible(false);
                    setScannedResult(null);
                    soundService.playValid();
                    await dbService.useTicket(lastScannedQRRef.current, 'OVERRIDE', { reason, note, supervisor_pin: pin });
                    setPendingSync(prev => prev + 1);
                }}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    cameraFrame: {
        flex: 1,
        position: 'relative',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    viewfinder: {
        width: 280,
        height: 280,
        position: 'relative',
    },
    instructions: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
        marginTop: SPACING.xl,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    corner: {
        position: 'absolute',
        width: 40,
        height: 40,
        borderColor: 'white',
        borderWidth: 6,
    },
    cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 20 },
    cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 20 },
    cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 20 },
    cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 20 },

    controlsLeft: {
        position: 'absolute',
        bottom: SPACING.xl,
        left: SPACING.xl,
        gap: SPACING.md,
    },
    controlsRight: {
        position: 'absolute',
        bottom: SPACING.xl,
        right: SPACING.xl,
        gap: SPACING.md,
    },
    controlBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
        backgroundColor: COLORS.background,
    },
    permissionText: {
        textAlign: 'center',
        fontSize: 18,
        color: COLORS.text,
        marginBottom: SPACING.xl,
        fontWeight: '600',
    },
    button: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 16,
    },
    buttonText: {
        color: 'white',
        fontWeight: '800',
        fontSize: 16,
    },
    subInstructions: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 8,
    },
    batteryWarning: {
        backgroundColor: COLORS.danger,
        paddingVertical: 4,
        alignItems: 'center',
    },
    batteryText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '800',
    },
    overrideBtn: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'white',
        zIndex: 2000,
    },
    overrideBtnText: {
        color: 'white',
        fontWeight: '800',
        fontSize: 16,
    }
});

export default ScannerScreen;
