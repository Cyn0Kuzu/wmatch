import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityIndicator, View, Text } from 'react-native';
import { useFonts } from 'expo-font';
import { 
  MaterialIcons, 
  MaterialCommunityIcons, 
  Ionicons, 
  Feather, 
  AntDesign, 
  FontAwesome 
} from '@expo/vector-icons';
import { ToastContainer } from './src/components/ui/ToastComponents';
import { ErrorBoundary } from './src/components/ui/ErrorBoundary';
import { asyncStorageManager } from './src/utils/AsyncStorageManager';
import { globalErrorHandler } from './src/utils/GlobalErrorHandler';

import { CoreEngine } from './src/core/CoreEngine';
import { AppNavigator } from './src/navigation/AppNavigator';
import { theme } from './src/core/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App: React.FC = () => {
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    ...MaterialCommunityIcons.font,
    ...Ionicons.font,
    ...Feather.font,
    ...AntDesign.font,
    ...FontAwesome.font,
  });

  const [asyncStorageReady, setAsyncStorageReady] = React.useState(false);

  React.useEffect(() => {
    const initializeAsyncStorage = async () => {
      try {
        // Initialize global error handler first
        globalErrorHandler.initialize();
        
        const isAvailable = await asyncStorageManager.initialize();
        if (!isAvailable) {
          console.warn('AsyncStorage Manager not available, app will run with limited functionality');
        }
        setAsyncStorageReady(true);
      } catch (error) {
        console.error('Failed to initialize AsyncStorage:', error);
        setAsyncStorageReady(true); // Continue anyway
      }
    };

    initializeAsyncStorage();
  }, []);

  if (!fontsLoaded || !asyncStorageReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#E50914" />
        <Text style={{ color: '#8C8C8C', fontSize: 16, marginTop: 20 }}>
          {!fontsLoaded ? 'Font\'lar yükleniyor...' : 'Depolama hazırlanıyor...'}
        </Text>
      </View>
    );
  }

  // Font'lar yüklendi, normal uygulamaya dön
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={theme}>
          <CoreEngine>
            <NavigationContainer>
              <StatusBar style="light" backgroundColor="#000" />
              <AppNavigator />
              <ToastContainer />
            </NavigationContainer>
          </CoreEngine>
        </PaperProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
