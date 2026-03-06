import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { initDatabase } from './src/db/sqlite';
import LoginScreen from './src/screens/Login';
import ScannerScreen from './src/screens/Scanner';
import HistoryScreen from './src/screens/History';
import { StatusBar } from 'expo-status-bar';

const Stack = createStackNavigator();

const Navigation = () => {
  const { user, loading } = useAuth();

  if (loading) return null; // Or Splash

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Scanner" component={ScannerScreen} />
          <Stack.Screen name="History" component={HistoryScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  useEffect(() => {
    initDatabase().catch(err => console.error('[App] DB Init failed', err));
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <Navigation />
        <StatusBar style="auto" />
      </NavigationContainer>
    </AuthProvider>
  );
}
