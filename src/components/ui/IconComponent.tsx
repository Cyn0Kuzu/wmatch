import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons, Ionicons, Feather, AntDesign, FontAwesome } from '@expo/vector-icons';

export interface IconProps {
  name: string | { name: string; type: string };
  size?: number;
  color?: string;
  style?: any;
  type?: 'material' | 'material-community' | 'ionicons' | 'feather' | 'antdesign' | 'fontawesome';
}

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 24, 
  color = '#8C8C8C', 
  style, 
  type = 'material' 
}) => {
  // Handle both old string format and new object format
  const iconName = typeof name === 'string' ? name : name.name;
  const iconType = typeof name === 'string' ? type : name.type;
  
  const iconProps = {
    name: iconName as any,
    size,
    color,
    style: [styles.icon, style],
  };

  try {
    switch (iconType) {
      case 'material-community':
        return <MaterialCommunityIcons {...iconProps} />;
      case 'ionicons':
        return <Ionicons {...iconProps} />;
      case 'feather':
        return <Feather {...iconProps} />;
      case 'antdesign':
        return <AntDesign {...iconProps} />;
      case 'fontawesome':
        return <FontAwesome {...iconProps} />;
      case 'material':
      default:
        return <MaterialIcons {...iconProps} />;
    }
  } catch (error) {
    // Fallback to text if icon fails to load
    console.warn(`Icon "${name}" failed to load:`, error);
    return (
      <View style={[styles.fallbackContainer, { width: size, height: size }]}>
        <Text style={[styles.fallbackText, { fontSize: size * 0.6, color }]}>
          ?
        </Text>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  icon: {
    textAlign: 'center',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  fallbackText: {
    fontWeight: 'bold',
  },
});

// Predefined icon mappings for common use cases with professional icons
export const Icons = {
  // Navigation - Material Icons
  home: { name: 'home', type: 'material' as const },
  play: { name: 'play-circle-filled', type: 'material' as const },
  favorite: { name: 'favorite', type: 'material' as const },
  person: { name: 'person', type: 'material' as const },
  
  // Settings - Material Icons
  email: { name: 'email', type: 'material' as const },
  notifications: { name: 'notifications', type: 'material' as const },
  campaign: { name: 'campaign', type: 'material' as const },
  lightbulb: { name: 'lightbulb', type: 'material' as const },
  security: { name: 'security', type: 'material' as const },
  fingerprint: { name: 'fingerprint', type: 'material' as const },
  language: { name: 'language', type: 'material' as const },
  palette: { name: 'palette', type: 'material' as const },
  playArrow: { name: 'play-arrow', type: 'material' as const },
  hd: { name: 'hd', type: 'material' as const },
  chevronRight: { name: 'chevron-right', type: 'material' as const },
  
  // Profile - Material Icons
  verified: { name: 'verified', type: 'material' as const },
  location: { name: 'location-on', type: 'material' as const },
  
  // Common - Material Icons
  search: { name: 'search', type: 'material' as const },
  filter: { name: 'filter-list', type: 'material' as const },
  settings: { name: 'settings', type: 'material' as const },
  close: { name: 'close', type: 'material' as const },
  menu: { name: 'menu', type: 'material' as const },
  back: { name: 'arrow-back', type: 'material' as const },
  forward: { name: 'arrow-forward', type: 'material' as const },
  up: { name: 'keyboard-arrow-up', type: 'material' as const },
  down: { name: 'keyboard-arrow-down', type: 'material' as const },
  left: { name: 'keyboard-arrow-left', type: 'material' as const },
  right: { name: 'keyboard-arrow-right', type: 'material' as const },
  
  // Actions - Material Icons
  add: { name: 'add', type: 'material' as const },
  edit: { name: 'edit', type: 'material' as const },
  delete: { name: 'delete', type: 'material' as const },
  save: { name: 'save', type: 'material' as const },
  share: { name: 'share', type: 'material' as const },
  download: { name: 'download', type: 'material' as const },
  upload: { name: 'upload', type: 'material' as const },
  
  // Status - Material Icons
  check: { name: 'check', type: 'material' as const },
  checkCircle: { name: 'check-circle', type: 'material' as const },
  error: { name: 'error', type: 'material' as const },
  moreVert: { name: 'more-vert', type: 'material' as const },
  block: { name: 'block', type: 'material' as const },
  settings: { name: 'settings', type: 'material' as const },
  warning: { name: 'warning', type: 'material' as const },
  info: { name: 'info', type: 'material' as const },
  
  // Media - Material Icons
  playCircle: { name: 'play-circle-filled', type: 'material' as const },
  pause: { name: 'pause', type: 'material' as const },
  stop: { name: 'stop', type: 'material' as const },
  volume: { name: 'volume-up', type: 'material' as const },
  mute: { name: 'volume-off', type: 'material' as const },
  
  // Social - Material Icons
  like: { name: 'favorite', type: 'material' as const },
  unlike: { name: 'heart-remove', type: 'material-community' as const }, // Unlike - heart remove (different from likedBy)
  comment: { name: 'comment', type: 'material' as const },
  shareSocial: { name: 'share', type: 'material' as const },
  follow: { name: 'person-add', type: 'material' as const },
  unfollow: { name: 'person-remove', type: 'material' as const },
  
  // Modern Icons - Feather for cleaner look
  heart: { name: 'heart', type: 'feather' as const },
  heartOutline: { name: 'heart', type: 'feather' as const },
  user: { name: 'user', type: 'feather' as const },
  users: { name: 'users', type: 'feather' as const },
  video: { name: 'video', type: 'feather' as const },
  film: { name: 'film', type: 'feather' as const },
  tv: { name: 'tv', type: 'feather' as const },
  star: { name: 'star', type: 'feather' as const },
  starOutline: { name: 'star', type: 'feather' as const },
  eye: { name: 'eye', type: 'feather' as const },
  eyeOff: { name: 'eye-off', type: 'feather' as const },
  lock: { name: 'lock', type: 'feather' as const },
  unlock: { name: 'unlock', type: 'feather' as const },
  shield: { name: 'shield', type: 'feather' as const },
  globe: { name: 'globe', type: 'feather' as const },
  camera: { name: 'camera', type: 'feather' as const },
  image: { name: 'image', type: 'feather' as const },
  music: { name: 'music', type: 'feather' as const },
  phone: { name: 'phone', type: 'feather' as const },
  mail: { name: 'mail', type: 'feather' as const },
  message: { name: 'message-circle', type: 'feather' as const },
  send: { name: 'send', type: 'feather' as const },
  downloadCloud: { name: 'download-cloud', type: 'feather' as const },
  uploadCloud: { name: 'upload-cloud', type: 'feather' as const },
  wifi: { name: 'wifi', type: 'feather' as const },
  wifiOff: { name: 'wifi-off', type: 'feather' as const },
  battery: { name: 'battery', type: 'feather' as const },
  batteryCharging: { name: 'battery-charging', type: 'feather' as const },
  bluetooth: { name: 'bluetooth', type: 'feather' as const },
  bluetoothOff: { name: 'bluetooth-off', type: 'feather' as const },
  
  // Film/TV Matching Icons - Material Icons
  trophy: { name: 'emoji-events', type: 'material' as const },
  target: { name: 'gps-fixed', type: 'material' as const },
  celebration: { name: 'celebration', type: 'material' as const },
  card: { name: 'style', type: 'material' as const },
  
  // Matching & Social - Unique icons for each purpose
  match: { name: 'people', type: 'material' as const }, // Match tab - people icon
  matches: { name: 'groups', type: 'material' as const }, // Matches screen - groups icon
  liked: { name: 'thumb-up', type: 'material' as const }, // Liked tab - thumb up
  likedBy: { name: 'favorite-border', type: 'material' as const }, // Liked by - favorite border (different from unlike)
  
  // Watch & Media - Unique icons
  watch: { name: 'local-movies', type: 'material' as const }, // Watch tab - movie icon
  movie: { name: 'movie', type: 'material' as const }, // Movie icon for cards/details
  series: { name: 'tv', type: 'feather' as const }, // Series icon (already using tv from feather)
};
