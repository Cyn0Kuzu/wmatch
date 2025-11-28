import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { Card } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';
import { Icon, Icons } from './IconComponent';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MatchUser {
  id: string;
  name: string;
  username: string;
  age: number;
  location: string;
  profilePhoto: string;
  matchPercentage: number;
  commonMovies: string[];
  bio: string;
}

interface RealMatchCardProps {
  user: MatchUser;
  onPass: () => void;
  onLike: () => void;
  onMessage?: () => void;
}

export const RealMatchCard: React.FC<RealMatchCardProps> = ({
  user,
  onPass,
  onLike,
  onMessage,
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showFullBio, setShowFullBio] = useState(false);

  const nextPhoto = () => {
    // For now, just cycle through available photos
    setCurrentPhotoIndex(prev => prev === 0 ? 1 : 0);
  };

  const toggleBio = () => {
    setShowFullBio(!showFullBio);
  };

  return (
    <Animatable.View animation="fadeInUp" duration={600} style={styles.container}>
      <Card style={styles.card}>
        {/* Photo Section */}
        <TouchableOpacity style={styles.photoSection} onPress={nextPhoto}>
          <Image 
            source={{ 
              uri: user.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=600&fit=crop&crop=face'
            }} 
            style={styles.profilePhoto} 
          />
          
          {/* Match percentage badge */}
          <View style={styles.matchBadge}>
            <Text style={styles.matchPercentage}>{user.matchPercentage}%</Text>
            <Text style={styles.matchText}>Eşleşme</Text>
          </View>
          
          {/* Gradient overlay */}
          <View style={styles.photoGradient} />
        </TouchableOpacity>
        
        {/* Info Section */}
        <ScrollView style={styles.infoSection} showsVerticalScrollIndicator={false}>
          <View style={styles.headerInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.userName}>{user.name}</Text>
              <View style={styles.ageContainer}>
                <Text style={styles.ageText}>{user.age}</Text>
              </View>
            </View>
            
            <Text style={styles.username}>@{user.username}</Text>
            
            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationText}>{user.location}</Text>
            </View>
          </View>
          
          {/* Bio Section */}
          <View style={styles.bioSection}>
            <Text style={styles.bioTitle}>Hakkında</Text>
            <TouchableOpacity onPress={toggleBio}>
              <Text style={styles.bioText} numberOfLines={showFullBio ? undefined : 3}>
                {user.bio}
              </Text>
              {user.bio.length > 100 && (
                <Text style={styles.readMoreText}>
                  {showFullBio ? 'Daha az göster' : 'Devamını oku'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          
          {/* Common Movies Section */}
          {user.commonMovies.length > 0 && (
            <View style={styles.commonMoviesSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name={Icons.movie} size={18} color="#E50914" />
                <Text style={styles.commonMoviesTitle}>Ortak Filmler</Text>
              </View>
              <View style={styles.moviesList}>
                {user.commonMovies.slice(0, 6).map((movie, index) => (
                  <View key={index} style={styles.movieChip}>
                    <Text style={styles.movieChipText}>{movie}</Text>
                  </View>
                ))}
                {user.commonMovies.length > 6 && (
                  <View style={styles.movieChip}>
                    <Text style={styles.movieChipText}>+{user.commonMovies.length - 6}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
        
        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.passButton} onPress={onPass}>
            <Text style={styles.passButtonText}>✕</Text>
          </TouchableOpacity>
          
          {onMessage && (
            <TouchableOpacity style={styles.messageButton} onPress={onMessage}>
              <Text style={styles.messageButtonText}>💬</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={styles.likeButton} onPress={onLike}>
            <Text style={styles.likeButtonText}>♥</Text>
          </TouchableOpacity>
        </View>
      </Card>
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    height: screenHeight * 0.85,
  },
  photoSection: {
    height: '50%',
    position: 'relative',
  },
  profilePhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  matchBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(229, 9, 20, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  matchPercentage: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  matchText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '500',
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  infoSection: {
    flex: 1,
    padding: 20,
  },
  headerInfo: {
    marginBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userName: {
    color: '#000000',
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  ageContainer: {
    backgroundColor: '#E50914',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ageText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  username: {
    color: '#333333',
    fontSize: 16,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  locationText: {
    color: '#333333',
    fontSize: 14,
  },
  bioSection: {
    marginBottom: 16,
  },
  bioTitle: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  bioText: {
    color: '#333333',
    fontSize: 14,
    lineHeight: 20,
  },
  readMoreText: {
    color: '#E50914',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
  },
  commonMoviesSection: {
    marginBottom: 16,
  },
  commonMoviesTitle: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  moviesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  movieChip: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E50914',
  },
  movieChipText: {
    color: '#E50914',
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  passButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  passButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  messageButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3742FA',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  likeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2ED573',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  likeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
});













