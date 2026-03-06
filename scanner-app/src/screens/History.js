import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { COLORS, SPACING } from '../utils/theme';
import { dbService } from '../db/sqlite';
import { ArrowLeft, CheckCircle2, XCircle, Clock, FileDown } from 'lucide-react-native';

const HistoryScreen = ({ navigation }) => {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({ valid: 0, used: 0, overrides: 0 });

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const db = await dbService.getSyncQueue(); // Or a dedicated history table
        setHistory(db.reverse());

        // Calculate stats
        const valid = db.filter(s => s.result === 'VALID').length;
        const used = db.filter(s => s.result === 'USED').length;
        const overrides = db.filter(s => s.override_data).length;
        setStats({ valid, used, overrides });
    };

    const renderItem = ({ item }) => (
        <View style={styles.historyItem}>
            <View style={styles.itemIcon}>
                {item.result === 'VALID' ? (
                    <CheckCircle2 color={COLORS.success} size={24} />
                ) : (
                    <XCircle color={COLORS.danger} size={24} />
                )}
            </View>
            <View style={styles.itemMain}>
                <Text style={styles.itemHash}>QR: {item.qr_hash?.substring(0, 8)}...</Text>
                <Text style={styles.itemResult}>{item.result}</Text>
            </View>
            <View style={styles.itemTime}>
                <Text style={styles.timeText}>
                    {new Date(item.scanned_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ArrowLeft color={COLORS.text} size={28} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Storico Scansioni</Text>
                <TouchableOpacity>
                    <FileDown color={COLORS.text} size={28} />
                </TouchableOpacity>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Text style={styles.statVal}>{stats.valid + stats.used + stats.overrides}</Text>
                    <Text style={styles.statLabel}>Totali</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={[styles.statVal, { color: COLORS.success }]}>{stats.valid}</Text>
                    <Text style={styles.statLabel}>Validi</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={[styles.statVal, { color: COLORS.danger }]}>{stats.used}</Text>
                    <Text style={styles.statLabel}>Già Usati</Text>
                </View>
            </View>

            <FlatList
                data={history}
                renderItem={renderItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Clock size={48} color={COLORS.slate[200]} />
                        <Text style={styles.emptyText}>Nessuna scansione oggi</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[100],
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text,
    },
    statsRow: {
        flexDirection: 'row',
        padding: SPACING.lg,
        gap: SPACING.md,
    },
    statBox: {
        flex: 1,
        backgroundColor: COLORS.slate[50],
        borderRadius: 16,
        padding: SPACING.md,
        alignItems: 'center',
    },
    statVal: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.text,
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textLight,
        textTransform: 'uppercase',
    },
    list: {
        padding: SPACING.lg,
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.slate[50],
    },
    itemIcon: {
        marginRight: SPACING.md,
    },
    itemMain: {
        flex: 1,
    },
    itemHash: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
    },
    itemResult: {
        fontSize: 12,
        fontWeight: '800',
        color: COLORS.textLight,
        textTransform: 'uppercase',
    },
    itemTime: {
        alignItems: 'flex-end',
    },
    timeText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.text,
    },
    empty: {
        marginTop: 100,
        alignItems: 'center',
    },
    emptyText: {
        marginTop: SPACING.md,
        fontSize: 16,
        color: COLORS.textLight,
        fontWeight: '600',
    }
});

export default HistoryScreen;
