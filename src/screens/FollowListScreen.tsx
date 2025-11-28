import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity, 
  SafeAreaView,
  Dimensions
} from 'react-native';
import { Text, Avatar, Button } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';

import { useCoreEngine } from '../core/CoreEngine';
import { AnimatedText } from '../components/ui/AnimatedText';
import { LoadingSpinner } from '../components/ui/LoadingComponents';
import { BottomActionBar } from '../components/ui/BottomActionBar';
import { EnterpriseCard } from '../components/enterprise/EnterpriseCard';
import { EnterpriseLayout, EnterpriseSection } from '../components/enterprise/EnterpriseLayout';
import { spacing } from '../core/theme';

const { width, height } = Dimensions.get('window');

interface FollowUser {
  id: string;
  username: string;
  firstName: string;
  lastName?: string;
  profilePhoto?: string;
  isFollowing: boolean;
  isVerified: boolean;
}

interface FollowListScreenProps {
  type: 'followers' | 'following';
  userId: string;
}

export const FollowListScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { type, userId } = route.params as FollowListScreenProps;
  const { authService } = useCoreEngine();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<FollowUser[]>([]);

  useEffect(() => {
    loadFollowList();
  }, []);

  const loadFollowList = async () => {
    try {
      setLoading(true);
      // TODO: Implement actual follow list loading from database
      // For now, show mock data
      const mockUsers: FollowUser[] = [
        {
          id: '1',
          username: 'film_sever',
          firstName: 'Ayşe',
          lastName: 'Yılmaz',
          profilePhoto: 'https://via.placeholder.com/50',
          isFollowing: false,
          isVerified: true
        },
        {
          id: '2',
          username: 'cinema_lover',
          firstName: 'Mehmet',
          lastName: 'Kaya',
          profilePhoto: 'https://via.placeholder.com/50',
          isFollowing: true,
          isVerified: false
        },
        {
          id: '3',
          username: 'movie_fan',
          firstName: 'Zeynep',
          lastName: 'Demir',
          profilePhoto: 'https://via.placeholder.com/50',
          isFollowing: false,
          isVerified: true
        }
      ];
      
      setUsers(mockUsers);
    } catch (error) {
      console.error('Error loading follow list:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFollowList();
    setRefreshing(false);
  };

  const handleFollow = async (userId: string) => {
    // TODO: Implement follow/unfollow functionality
    console.log('Follow user:', userId);
  };

  const handleUserPress = (userId: string) => {
    // TODO: Navigate to user profile
    console.log('View user profile:', userId);
  };

  if (loading) {
    return (
      <EnterpriseLayout>
        <LoadingSpinner />
      </EnterpriseLayout>
    );
  }

  return (
    <EnterpriseLayout scrollable={true} padding={spacing.md}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#E50914']}
            tintColor="#E50914"
          />
        }
      >
        {/* Header */}
        <EnterpriseSection>
          <AnimatedText variant="h2" animation="fadeInUp" delay={200} style={styles.headerTitle}>
            {type === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
          </AnimatedText>
          <AnimatedText variant="body1" animation="fadeInUp" delay={400} style={styles.headerSubtitle}>
            {users.length} kişi
          </AnimatedText>
        </EnterpriseSection>

        {/* User List */}
        <EnterpriseSection>
          {users.map((user, index) => (
            <Animatable.View
              key={user.id}
              animation="fadeInUp"
              delay={600 + index * 100}
              style={styles.userCard}
            >
              <EnterpriseCard variant="outlined" style={styles.userCardInner}>
                <View style={styles.userInfo}>
                  <TouchableOpacity 
                    style={styles.userAvatar}
                    onPress={() => handleUserPress(user.id)}
                  >
                    <Avatar.Image 
                      size={50} 
                      source={{ uri: user.profilePhoto || 'https://via.placeholder.com/50' }}
                    />
                    {user.isVerified && (
                      <View style={styles.verifiedBadge}>
                        <Text style={styles.verifiedText}>✅</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  
                  <View style={styles.userDetails}>
                    <TouchableOpacity onPress={() => handleUserPress(user.id)}>
                      <Text style={styles.userName}>
                        {user.firstName} {user.lastName || ''}
                      </Text>
                      <Text style={styles.userUsername}>@{user.username}</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.followButton,
                      user.isFollowing && styles.followingButton
                    ]}
                    onPress={() => handleFollow(user.id)}
                  >
                    <Text style={[
                      styles.followButtonText,
                      user.isFollowing && styles.followingButtonText
                    ]}>
                      {user.isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </EnterpriseCard>
            </Animatable.View>
          ))}
        </EnterpriseSection>
      </ScrollView>
      
      {/* Fixed bottom section with safe area handling */}
      <BottomActionBar
        showCopyright={true}
        copyrightText="© 2025 WMatch"
        poweredByText="Powered by MWatch"
        copyrightDelay={1200}
      />
    </EnterpriseLayout>
  );
};

const styles = StyleSheet.create({
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: '#8C8C8C',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  userCard: {
    marginBottom: spacing.md,
  },
  userCardInner: {
    padding: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    position: 'relative',
    marginRight: spacing.md,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#E50914',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 10,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  userUsername: {
    color: '#8C8C8C',
    fontSize: 14,
  },
  followButton: {
    backgroundColor: '#E50914',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E50914',
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#E50914',
  },
});
