import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';
import { COLORS, SPACING } from '../utils/theme';
import { CheckCircle2, Clock, XCircle, Users } from 'lucide-react-native';

const successAnim = require('../../assets/lottie/success.json');
const errorAnim = require('../../assets/lottie/error.json');
const usedAnim = require('../../assets/lottie/used.json');

const { width, height } = Dimensions.get('window');

const FeedbackOverlay = ({ type, data, onDismiss }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();

        const timer = setTimeout(onDismiss, type === 'VALID' ? 1800 : 3000);
        return () => clearTimeout(timer);
    }, [type, onDismiss]);

    const getStyle = () => {
        switch (type) {
            case 'VALID': return { bg: COLORS.success, lottie: successAnim, title: 'VALIDO' };
            case 'USED': return { bg: COLORS.warning, lottie: usedAnim, title: 'GIÀ USATO' };
            case 'INVALID': return { bg: COLORS.danger, lottie: errorAnim, title: 'NON VALIDO' };
            default: return { bg: COLORS.slate[900], lottie: null, title: '' };
        }
    };

    const config = getStyle();

    return (
        <Animated.View style={[styles.container, { backgroundColor: config.bg, opacity: fadeAnim }]}>
            <View style={styles.content}>
                <LottieView
                    source={config.lottie}
                    autoPlay
                    loop={false}
                    style={styles.lottie}
                />

                <Text style={styles.title}>{config.title}</Text>

                {data && (
                    <View style={styles.infoContainer}>
                        <Text style={styles.typeName}>{data.type_name || 'Biglietto Standard'}</Text>
                        {data.visitor_name && (
                            <Text style={styles.visitorName}>{data.visitor_name}</Text>
                        )}

                        {data.group_total > 1 && (
                            <View style={styles.badge}>
                                <Users size={16} color={COLORS.text} />
                                <Text style={styles.badgeText}>
                                    Biglietto {data.group_index} di {data.group_total}
                                </Text>
                            </View>
                        )}

                        {type === 'USED' && data.used_at && (
                            <Text style={styles.subtext}>
                                Prima scansione: {new Date(data.used_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        )}

                        {type === 'INVALID' && data.reason && (
                            <Text style={styles.reasonText}>{data.reason}</Text>
                        )}
                    </View>
                )}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        alignItems: 'center',
        width: '100%',
        padding: SPACING.xl,
    },
    lottie: {
        width: 200,
        height: 200,
        marginBottom: SPACING.lg,
    },
    title: {
        fontSize: 48,
        fontWeight: '900',
        color: COLORS.white,
        letterSpacing: 2,
        marginBottom: SPACING.xl,
    },
    infoContainer: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 24,
        padding: SPACING.lg,
        width: '100%',
    },
    typeName: {
        fontSize: 32,
        fontWeight: '800',
        color: COLORS.white,
        textAlign: 'center',
    },
    visitorName: {
        fontSize: 24,
        fontWeight: '600',
        color: COLORS.white,
        marginTop: SPACING.xs,
        opacity: 0.9,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#FACC15', // Yellow-400
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        marginTop: SPACING.md,
    },
    badgeText: {
        fontSize: 16,
        fontWeight: '800',
        color: COLORS.text,
    },
    subtext: {
        fontSize: 18,
        color: COLORS.white,
        marginTop: SPACING.md,
        fontWeight: '600',
        opacity: 0.8,
    },
    reasonText: {
        fontSize: 20,
        color: COLORS.white,
        marginTop: SPACING.md,
        fontWeight: '700',
        textAlign: 'center',
    }
});

export default FeedbackOverlay;
