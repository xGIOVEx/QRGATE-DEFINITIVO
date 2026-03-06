import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { COLORS, SPACING } from '../utils/theme';

const SyncBanner = ({ isOnline, pendingSyncCount, lastSyncTime }) => {
    const isOffline = !isOnline || pendingSyncCount > 0;

    return (
        <View style={[styles.container, isOffline ? styles.offlineBg : styles.onlineBg]}>
            <Text style={styles.text}>
                {isOffline
                    ? `🟡 Offline — ${pendingSyncCount} scan da sincronizzare`
                    : `🟢 Sincronizzato [${lastSyncTime || 'Adesso'}]`
                }
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    onlineBg: {
        backgroundColor: 'rgba(22, 163, 74, 0.9)', // Success green with transparency
    },
    offlineBg: {
        backgroundColor: 'rgba(217, 119, 6, 0.9)', // Warning orange with transparency
    },
    text: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    }
});

export default SyncBanner;
