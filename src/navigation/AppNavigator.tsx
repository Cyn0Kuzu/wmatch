import React from 'react';
import { View, Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, Icons } from '../components/ui/IconComponent';
import { CurrentMovieBar } from '../components/currentmoviebar';
import { useCoreEngine } from '../core/CoreEngine';

// Screens
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { WatchScreen } from '../screens/WatchScreen';
import { MessageScreen } from '../screens/MessageScreen';
import { MatchScreen } from '../screens/MatchScreen';
import { LikedScreen } from '../screens/LikedScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { FollowListScreen } from '../screens/FollowListScreen';

// Film Tinder için HomeScreen'i Discover olarak kullanacağız

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="FollowList" component={FollowListScreen} />
  </Stack.Navigator>
);

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

const MainTabs = () => {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <CurrentMovieBar />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#000',
            borderTopColor: '#333',
            borderTopWidth: 1,
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          tabBarActiveTintColor: '#E50914',
          tabBarInactiveTintColor: '#8C8C8C',
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '500',
          },
        }}
      >
      <Tab.Screen 
        name="Watch" 
        component={WatchScreen}
        options={{
          tabBarLabel: 'Watch',
          tabBarIcon: ({ color, focused }) => (
            <Icon name={Icons.watch} size={focused ? 24 : 20} color={focused ? '#E50914' : color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Match" 
        component={MatchScreen}
        options={{
          tabBarLabel: 'Match',
          tabBarIcon: ({ color, focused }) => (
            <Icon name={Icons.match} size={focused ? 24 : 20} color={focused ? '#E50914' : color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Begeni" 
        component={LikedScreen}
        options={{
          tabBarLabel: 'Beğeni',
          tabBarIcon: ({ color, focused }) => (
            <Icon name={Icons.liked} size={focused ? 24 : 20} color={focused ? '#E50914' : color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Message" 
        component={MessageScreen}
        options={{
          tabBarLabel: 'Mesaj',
          tabBarIcon: ({ color, focused }) => (
            <Icon name={Icons.message} size={focused ? 24 : 20} color={focused ? '#E50914' : color} />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, focused }) => (
            <Icon name={Icons.user} size={focused ? 24 : 20} color={focused ? '#E50914' : color} />
          ),
        }}
      />
    </Tab.Navigator>
  </SafeAreaView>
  );
};

export const AppNavigator: React.FC = () => {
  const { authService, coreService } = useCoreEngine();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Ensure Firebase is initialized before checking auth
        await coreService.firebaseService.initialize();
        
        // Wait a bit more for auth to be ready
        await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
        
        const authenticated = await authService.isAuthenticated();
        
        if (authenticated) {
          // Check if email is verified
          const user = await authService.getCurrentUser();
          if (user && user.emailVerified) {
            setIsAuthenticated(true);
            // User authenticated and email verified
          } else {
            // E-posta doğrulanmamış kullanıcıları çıkış yaptır
            if (user) {
              // User authenticated but email not verified, signing out
              await authService.signOut();
            }
            setIsAuthenticated(false);
            // User authenticated but email not verified
          }
        } else {
          setIsAuthenticated(false);
          // User not authenticated
        }
      } catch (error) {
        // Auth check error
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();

    // Listen for auth state changes (only if authService is available and Firebase is initialized)
    let unsubscribe: (() => void) | null = null;
    
    const setupAuthListener = async () => {
      try {
        // Ensure Firebase is initialized
        await coreService.firebaseService.initialize();
        
        // Check if auth object is available
        const auth = coreService.firebaseService.getAuth();
        if (auth && authService && typeof authService.onAuthStateChanged === 'function') {
          unsubscribe = authService.onAuthStateChanged(async (user) => {
            if (user) {
              // Check if email is verified
              if (user.emailVerified) {
                setIsAuthenticated(true);
                // Auth state changed: User signed in and email verified
              } else {
                // E-posta doğrulanmamış kullanıcıları çıkış yaptır
                // Auth state changed: User signed in but email not verified, signing out
                await authService.signOut();
                setIsAuthenticated(false);
                // Auth state changed: User signed in but email not verified
              }
            } else {
              // User is signed out
              setIsAuthenticated(false);
              // Auth state changed: User signed out
            }
          });
        }
      } catch (error) {
        // Auth listener setup error
      }
    };

    setupAuthListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [authService, coreService]);

  if (isLoading) {
    // Return loading screen
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#000' 
      }}>
        <Text style={{ color: '#E50914', fontSize: 18 }}>MWatch Yükleniyor...</Text>
        <Text style={{ color: '#8C8C8C', fontSize: 14, marginTop: 10 }}>
          Auth durumu kontrol ediliyor...
        </Text>
      </View>
    );
  }

  // AppNavigator render

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
};
