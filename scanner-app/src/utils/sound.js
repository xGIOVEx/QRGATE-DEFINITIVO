import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

let soundEnabled = true;

export const setSoundEnabled = (enabled) => {
    soundEnabled = enabled;
};

export const soundService = {
    playValid: async () => {
        if (soundEnabled) {
            // In a real app, load a small beep asset. For now, we simulate.
            console.log('[Sound] Playing 900Hz beep (Success)');
        }
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },

    playUsed: async () => {
        if (soundEnabled) {
            console.log('[Sound] Playing double beep (Warning)');
        }
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning), 200);
    },

    playInvalid: async () => {
        if (soundEnabled) {
            console.log('[Sound] Playing 200Hz low beep (Error)');
        }
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
};
