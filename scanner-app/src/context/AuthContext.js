import React, { createContext, useState, useContext, useEffect } from 'react';
import { storageService } from './storage';
import { apiService } from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // { role, venue_id, venue_name, slug }
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        const token = await storageService.getJWT();
        if (token) {
            // TODO: Check if token is expired (> 12h)
            const info = await storageService.getVenueInfo();
            // Mock role from PIN length stored in state or decoded from JWT if available
            // For MVP, we presume session is valid if token exists (logic to be refined with JWT decode)
            setUser({ ...info, role: 'scanner' });
        }
        setLoading(false);
    };

    const login = async (slug, pin) => {
        try {
            const response = await apiService.login(slug, pin);
            const { jwt, user_data } = response.data;

            const role = pin.length === 6 ? 'supervisor' : 'scanner';
            const venueData = {
                id: user_data.venue_id,
                name: user_data.venue_name,
                slug: slug,
                role
            };

            await storageService.saveAuth(jwt, venueData);
            setUser(venueData);
            return { success: true };
        } catch (error) {
            // Offline fallback
            const cachedPin = await storageService.getPinHash();
            // Simple hash check comparison here if offline...
            return { success: false, error: 'Credenziali non valide o errore di rete' };
        }
    };

    const logout = async () => {
        await storageService.logout();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, isSupervisor: user?.role === 'supervisor' }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
