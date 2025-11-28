import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { useCoreEngine } from '../core/CoreEngine';
import { firestoreService } from '../services/FirestoreService';
import { Timestamp } from 'firebase/firestore';
import { Icon, Icons } from '../components/ui/IconComponent';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Modal } from 'react-native';
import { EnhancedMatchCard } from './MatchScreen';
import { doc, getDoc } from 'firebase/firestore';

// Chat Preview Card Component
const ChatPreviewCard: React.FC<{
  match: any;
  onPress: () => void;
  showCategoryLabel?: boolean;
}> = ({ match, onPress, showCategoryLabel = false }) => {
  const hasPhoto = match.userPhoto && match.userPhoto.trim() !== '';
  const timeAgo = getTimeAgo(match.lastMessageAt);

  // Don't show status indicators for blocked or unmatched users
  const isBlockedOrUnmatched = match.isBlocked || match.isUnmatched;

  // Check if online status should be shown (both users must have it enabled AND not blocked/unmatched)
  const shouldShowOnlineStatus = !isBlockedOrUnmatched && match.showOnlineStatus !== false && match.isOnline;
  
  // Check if typing indicator should be shown (both users must have it enabled AND not blocked/unmatched)
  const shouldShowTyping = !isBlockedOrUnmatched && match.showTypingIndicator !== false && match.isTyping;

  // Get category label
  const categoryLabel = match.categoryLabel || (match.isBlocked ? 'Engel' : match.isUnmatched ? 'Bitti' : 'Aktif');
  const categoryColor = match.isBlocked ? '#FF6B6B' : match.isUnmatched ? '#FFA500' : '#4CAF50';

  return (
    <TouchableOpacity style={styles.chatPreview} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.avatarContainer}>
        {hasPhoto ? (
          <Image source={{ uri: match.userPhoto }} style={styles.avatar} resizeMode="cover" />
        ) : (
          <View style={[styles.avatar, styles.noAvatar]}>
            <Text style={styles.noAvatarText}>
              {String((match.userName?.[0] || '?')).toUpperCase()}
            </Text>
          </View>
        )}
        {/* Online indicator - only show if both users have it enabled and not blocked/unmatched */}
        {shouldShowOnlineStatus && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatPreviewHeader}>
          <View style={styles.chatNameContainer}>
            <Text style={styles.chatName} numberOfLines={1}>{match.userName || 'Kullanıcı'}</Text>
            {showCategoryLabel && (
              <View style={[styles.categoryBadge, { backgroundColor: categoryColor }]}>
                <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
              </View>
            )}
          </View>
          <Text style={styles.chatTime}>{timeAgo}</Text>
        </View>
        <Text style={styles.chatLastMessage} numberOfLines={1}>
          {shouldShowTyping ? 'Yazıyor...' : (match.lastMessage || 'Henüz mesaj yok')}
        </Text>
      </View>

      {/* Don't show unread count for blocked/unmatched users */}
      {!isBlockedOrUnmatched && match.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{String(match.unreadCount)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Message Bubble Component
const MessageBubble: React.FC<{
  message: any;
  isOwnMessage: boolean;
  showReadReceipts?: boolean;
  otherUserShowReadReceipts?: boolean;
  isBlocked?: boolean;
  isUnmatched?: boolean;
}> = ({ message, isOwnMessage, showReadReceipts = true, otherUserShowReadReceipts = true, isBlocked = false, isUnmatched = false }) => {
  const timestamp = message.timestamp?.toDate?.() || message.timestamp || new Date();
  const read = message.read || false;
  const delivered = message.delivered || false;
  const readAt = message.readAt?.toDate?.() || message.readAt || null;

  // Show read receipts only if both users have it enabled AND chat is not blocked/unmatched
  const canShowReadReceipts = !isBlocked && !isUnmatched && showReadReceipts && otherUserShowReadReceipts;

  // WhatsApp-like two-tick system for ALL messages:
  // For own messages (sent by me):
  // - 1 gray tick: Message sent but not delivered to recipient (delivered: false)
  // - 2 gray ticks: Message delivered but not read (delivered: true, read: false)
  // - 2 green ticks: Message read (read: true)
  // For received messages (sent by other):
  // - 2 gray ticks: Message received (delivered: true, read: false)
  // - 2 green ticks: Message read by me (read: true)
  const renderReadReceipts = () => {
    // Show ticks for ALL messages, but color depends on read receipts setting
    if (isOwnMessage) {
      // For own messages: show delivery/read status
      if (!delivered) {
        // 1 gray tick - sent but not delivered
        return (
          <View style={styles.readReceiptContainer}>
            <Icon 
              name={Icons.check} 
              size={14} 
              color="rgba(255, 255, 255, 0.5)" 
              style={styles.readIcon}
            />
          </View>
        );
      } else if (delivered && !read) {
        // 2 gray ticks - delivered but not read
        return (
          <View style={styles.readReceiptContainer}>
            <Icon 
              name={Icons.check} 
              size={14} 
              color="rgba(255, 255, 255, 0.7)" 
              style={styles.readIcon}
            />
            <Icon 
              name={Icons.check} 
              size={14} 
              color="rgba(255, 255, 255, 0.7)" 
              style={[styles.readIcon, styles.readIconSecond]}
            />
          </View>
        );
      } else if (read && canShowReadReceipts) {
        // 2 green ticks - read (only if read receipts enabled)
        return (
          <View style={styles.readReceiptContainer}>
            <Icon 
              name={Icons.check} 
              size={14} 
              color="#4CAF50" 
              style={styles.readIcon}
            />
            <Icon 
              name={Icons.check} 
              size={14} 
              color="#4CAF50" 
              style={[styles.readIcon, styles.readIconSecond]}
            />
          </View>
        );
      } else if (read && !canShowReadReceipts) {
        // 2 gray ticks - read but read receipts disabled
        return (
          <View style={styles.readReceiptContainer}>
            <Icon 
              name={Icons.check} 
              size={14} 
              color="rgba(255, 255, 255, 0.7)" 
              style={styles.readIcon}
            />
            <Icon 
              name={Icons.check} 
              size={14} 
              color="rgba(255, 255, 255, 0.7)" 
              style={[styles.readIcon, styles.readIconSecond]}
            />
          </View>
        );
      }
    } else {
      // For received messages: ALWAYS show 2 ticks (WhatsApp behavior)
      // Messages are always "delivered" when received, so always 2 ticks
      if (read && canShowReadReceipts) {
        // 2 green ticks - read by me (only if read receipts enabled)
        return (
          <View style={styles.readReceiptContainer}>
            <Icon 
              name={Icons.check} 
              size={14} 
              color="#4CAF50" 
              style={styles.readIcon}
            />
            <Icon 
              name={Icons.check} 
              size={14} 
              color="#4CAF50" 
              style={[styles.readIcon, styles.readIconSecond]}
            />
          </View>
        );
      } else {
        // 2 gray ticks - received but not read yet, or read receipts disabled
        // Note: Received messages are always "delivered" so always show 2 ticks
        return (
          <View style={styles.readReceiptContainer}>
            <Icon 
              name={Icons.check} 
              size={14} 
              color="rgba(255, 255, 255, 0.7)" 
              style={styles.readIcon}
            />
            <Icon 
              name={Icons.check} 
              size={14} 
              color="rgba(255, 255, 255, 0.7)" 
              style={[styles.readIcon, styles.readIconSecond]}
            />
          </View>
        );
      }
    }
  };

  return (
    <View style={[styles.messageBubble, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
      <Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
        {message.text}
      </Text>
      <View style={styles.messageFooter}>
        <Text style={[styles.messageTime, isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime]}>
          {getTimeAgo(timestamp)}
        </Text>
        {renderReadReceipts()}
      </View>
    </View>
  );
};

// Menu Modal Component
const MenuModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
  onRemoveMatch?: () => void;
  onRestoreMatch?: () => void;
  onBlockUser?: () => void;
  onUnblockUser?: () => void;
  isBlocked?: boolean;
  isUnmatched?: boolean;
  iBlockedThem?: boolean;
  theyBlockedMe?: boolean;
}> = ({ visible, onClose, onOpenSettings, onRemoveMatch, onRestoreMatch, onBlockUser, onUnblockUser, isBlocked, isUnmatched, iBlockedThem, theyBlockedMe }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.menuContent}>
          {/* Engelleme durumu kontrolü - Sadece bir buton gösterilmeli */}
          {/* Eğer kullanıcı engellemişse (iBlockedThem) - SADECE "Engeli Kaldır" göster */}
          {iBlockedThem && onUnblockUser ? (
            <TouchableOpacity style={styles.menuItem} onPress={() => { onUnblockUser(); onClose(); }}>
              <Icon name={Icons.check} size={20} color="#4CAF50" />
              <Text style={[styles.menuItemText, { color: '#4CAF50' }]}>Engeli Kaldır</Text>
            </TouchableOpacity>
          ) : (
            /* Eğer kullanıcı engellememişse - SADECE "Engelle" göster */
            onBlockUser && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { onBlockUser(); onClose(); }}>
                <Icon name={Icons.block} size={20} color="#FF6B6B" />
                <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                  {!isBlocked && !isUnmatched ? 'Kullanıcıyı Engelle' : 'Engelle'}
                </Text>
              </TouchableOpacity>
            )
          )}
          
          {/* Aktif sohbetler için - Sohbet Ayarları, Eşleşmeyi Bitir (Engelle butonu yukarıda gösterildi) */}
          {!isBlocked && !isUnmatched && (
            <>
              {onOpenSettings && (
                <TouchableOpacity style={styles.menuItem} onPress={() => { onOpenSettings(); onClose(); }}>
                  <Icon name={Icons.settings} size={20} color="#FFFFFF" />
                  <Text style={styles.menuItemText}>Sohbet Ayarları</Text>
                </TouchableOpacity>
              )}
              {onRemoveMatch && (
                <TouchableOpacity style={styles.menuItem} onPress={() => { onRemoveMatch(); onClose(); }}>
                  <Icon name={Icons.close} size={20} color="#FF6B6B" />
                  <Text style={[styles.menuItemText, styles.menuItemDanger]}>Eşleşmeyi Bitir</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// Chat Settings Modal Component
const ChatSettingsModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  settings: any;
  onUpdateSettings: (settings: any, settingName: string) => void;
}> = ({ visible, onClose, settings, onUpdateSettings }) => {
  const [localSettings, setLocalSettings] = React.useState(settings);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleToggle = (settingName: string) => {
    const newSettings = { ...localSettings, [settingName]: !localSettings[settingName] };
    setLocalSettings(newSettings);
    onUpdateSettings(newSettings, settingName);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.settingsOverlay}>
        <View style={styles.settingsContent}>
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsTitle}>Sohbet Ayarları</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name={Icons.close} size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.settingsScroll}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Okundu Bilgisi</Text>
                <Text style={styles.settingDescription}>Mesajlarınızın okundu bilgisini göster (İki taraflı ayar)</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, localSettings.showReadReceipts && styles.toggleActive]}
                onPress={() => handleToggle('showReadReceipts')}
              >
                <View style={[styles.toggleThumb, localSettings.showReadReceipts && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Çevrimiçi Durumu</Text>
                <Text style={styles.settingDescription}>Karşı tarafın çevrimiçi durumunu göster (İki taraflı ayar)</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, localSettings.showOnlineStatus && styles.toggleActive]}
                onPress={() => handleToggle('showOnlineStatus')}
              >
                <View style={[styles.toggleThumb, localSettings.showOnlineStatus && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Yazıyor Göstergesi</Text>
                <Text style={styles.settingDescription}>Karşı tarafın yazıyor durumunu göster (İki taraflı ayar)</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, localSettings.showTypingIndicator && styles.toggleActive]}
                onPress={() => handleToggle('showTypingIndicator')}
              >
                <View style={[styles.toggleThumb, localSettings.showTypingIndicator && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Bildirimler</Text>
                <Text style={styles.settingDescription}>Bu sohbetten bildirim al</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggle, localSettings.notifications && styles.toggleActive]}
                onPress={() => setLocalSettings({ ...localSettings, notifications: !localSettings.notifications })}
              >
                <View style={[styles.toggleThumb, localSettings.notifications && styles.toggleThumbActive]} />
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View style={styles.settingsFooter}>
            <TouchableOpacity style={styles.saveButton} onPress={onClose}>
              <Text style={styles.saveButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Helper function to get time ago
function getTimeAgo(timestamp: any): string {
  if (!timestamp) return '';
  
  let date: Date;
  if (timestamp instanceof Timestamp) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else {
    return '';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Şimdi';
  if (diffMins < 60) return `${diffMins}dk`;
  if (diffHours < 24) return `${diffHours}sa`;
  if (diffDays < 7) return `${diffDays}g`;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export const MessageScreen: React.FC = () => {
  const { authService } = useCoreEngine();
  const navigation = useNavigation();
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [chatSettings, setChatSettings] = useState<any>({
    showReadReceipts: true,
    showOnlineStatus: true,
    showTypingIndicator: true,
    notifications: true,
  });
  const [otherUserSettings, setOtherUserSettings] = useState<any>({
    showReadReceipts: true,
    showOnlineStatus: true,
    showTypingIndicator: true,
  });
  const [isOnline, setIsOnline] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read' | 'unmatched' | 'blocked'>('all');
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [unmatchedUsers, setUnmatchedUsers] = useState<any[]>([]);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const messagesEndRef = useRef<ScrollView>(null);
  const messageUnsubscribeRef = useRef<(() => void) | null>(null);
  const typingUnsubscribeRef = useRef<(() => void) | null>(null);
  const onlineStatusUnsubscribeRef = useRef<(() => void) | null>(null);
  const chatListUnsubscribeRef = useRef<(() => void) | null>(null);
  const typingTimeoutRef = useRef<any>(null);

  const loadBlockedUsers = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return [];

      const blocked = await firestoreService.getBlockedUsers(user.uid);
      setBlockedUsers(blocked);
      return blocked;
    } catch (error) {
      console.error('Error loading blocked users:', error);
      return [];
    }
  };

  const loadUnmatchedUsers = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) return [];

      const unmatched = await firestoreService.getUnmatchedUsers(user.uid);
      setUnmatchedUsers(unmatched);
      return unmatched;
    } catch (error) {
      console.error('Error loading unmatched users:', error);
      return [];
    }
  };

  // Track if user is in message/chat screen for online status
  useFocusEffect(
    useCallback(() => {
      // Set user online when screen is focused (in message/chat screen)
      const setUserOnline = async () => {
        const user = await authService.getCurrentUser();
        if (user) {
          await firestoreService.updateUserOnlineStatus(user.uid, true);
        }
      };
      setUserOnline();
      
      return () => {
        // Set user offline when screen is unfocused (leaving message/chat screen)
        const setUserOffline = async () => {
          const user = await authService.getCurrentUser();
          if (user) {
            await firestoreService.updateUserOnlineStatus(user.uid, false);
          }
        };
        setUserOffline();
      };
    }, [])
  );

  useEffect(() => {
    loadMatches();
    loadBlockedUsers();
    loadUnmatchedUsers();
    
    // Set up real-time chat list listener with typing status
    const setupChatListListener = async () => {
      const user = await authService.getCurrentUser();
      if (user) {
        // Cleanup previous listener
        if (chatListUnsubscribeRef.current) {
          chatListUnsubscribeRef.current();
          chatListUnsubscribeRef.current = null;
        }

        // Tümü filtresinde gerçek zamanlı dinleyiciyi kapatıp manuel yükleme yap
        if (filterType === 'all') {
          return;
        }
        
        chatListUnsubscribeRef.current = firestoreService.listenToChatList(
          user.uid,
          async (chats) => {
            // Only update if we're showing active matches (not unmatched or blocked)
            // For unmatched/blocked, we'll reload manually
            if (filterType === 'unread' || filterType === 'read') {
              // Enhance chats with real-time typing status
              // Note: Typing status is already included in getChatList, so we can use it directly
              const enhancedChats = chats;
              
              // Apply filters
              let filteredChats = enhancedChats;
              if (filterType === 'unread') {
                filteredChats = enhancedChats.filter((chat: any) => chat.unreadCount > 0);
              } else if (filterType === 'read') {
                filteredChats = enhancedChats.filter((chat: any) => chat.unreadCount === 0);
              }
              
              const sortedMatches = filteredChats.sort((a, b) => {
                const aTime = a.lastMessageAt?.toMillis?.() || 0;
                const bTime = b.lastMessageAt?.toMillis?.() || 0;
                return bTime - aTime;
              });
              setMatches(sortedMatches);
            }
          }
        );
      }
    };
    setupChatListListener();
    
    // Cleanup on unmount
    return () => {
      if (messageUnsubscribeRef.current) {
        messageUnsubscribeRef.current();
      }
      if (typingUnsubscribeRef.current) {
        typingUnsubscribeRef.current();
      }
      if (onlineStatusUnsubscribeRef.current) {
        onlineStatusUnsubscribeRef.current();
      }
      if (chatListUnsubscribeRef.current) {
        chatListUnsubscribeRef.current();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [filterType]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (messages.length > 0 && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadMatches = async (overrideFilterType?: typeof filterType) => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const currentFilterType = overrideFilterType || filterType;
      let chatList: any[] = [];
      
      // Load based on filter type
      if (currentFilterType === 'blocked') {
        chatList = await loadBlockedUsers();
      } else if (currentFilterType === 'unmatched') {
        chatList = await loadUnmatchedUsers();
      } else if (currentFilterType === 'all') {
        // For "Tümü" filter, combine all lists (active, unmatched, blocked)
        // Priority: blocked > unmatched > active (if user exists in multiple lists, show in highest priority)
        const activeChats = await firestoreService.getChatList(user.uid);
        const unmatchedChats = await loadUnmatchedUsers();
        const blockedChats = await loadBlockedUsers();
        
        // Create a map to track which users we've already added (to avoid duplicates)
        const userMap = new Map<string, any>();
        
        // First, add active chats
        activeChats.forEach((chat: any) => {
          userMap.set(chat.id, {
            ...chat,
            category: 'active',
            categoryLabel: 'Aktif',
            isBlocked: false,
            isUnmatched: false,
          });
        });
        
        // Then, override with unmatched chats (higher priority)
        unmatchedChats.forEach((chat: any) => {
          userMap.set(chat.id, {
            ...chat,
            category: 'unmatched',
            categoryLabel: 'Bitti',
            isUnmatched: true,
            isBlocked: false,
          });
        });
        
        // Finally, override with blocked chats (highest priority)
        blockedChats.forEach((chat: any) => {
          userMap.set(chat.id, {
            ...chat,
            category: 'blocked',
            categoryLabel: 'Engel',
            isBlocked: true,
            isUnmatched: false,
          });
        });
        
        // Convert map to array
        chatList = Array.from(userMap.values());
      } else {
        // Get chat list with real message data
        chatList = await firestoreService.getChatList(user.uid);
        
        // Apply filters
        if (currentFilterType === 'unread') {
          chatList = chatList.filter((chat: any) => chat.unreadCount > 0);
        } else if (currentFilterType === 'read') {
          chatList = chatList.filter((chat: any) => chat.unreadCount === 0);
        }
      }
      
      // Sort by last message time (chronological - newest first)
      const sortedMatches = chatList.sort((a, b) => {
        const aTime = a.lastMessageAt?.toMillis?.() || a.lastMessageAt?.getTime?.() || (a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0);
        const bTime = b.lastMessageAt?.toMillis?.() || b.lastMessageAt?.getTime?.() || (b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0);
        return bTime - aTime; // Newest first
      });

      setMatches(sortedMatches);
    } catch (error) {
      console.error('Error loading matches:', error);
      Alert.alert('Hata', 'Eşleşmeler yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMatches();
    setRefreshing(false);
  }, []);

  const handleChatPress = async (match: any) => {
    const user = await authService.getCurrentUser();
    if (!user) return;

    // Check if user is blocked or unmatched - allow viewing but not messaging
    const userDoc = await firestoreService.getUserDocument(user.uid);
    const otherUserDoc = await firestoreService.getUserDocument(match.id);
    
    // Check if current user blocked the other user
    const iBlockedThem = userDoc?.blockedUsers?.includes(match.id) || false;
    // Check if other user blocked current user
    const theyBlockedMe = otherUserDoc?.blockedUsers?.includes(user.uid) || false;
    // User is blocked if either side blocked (mutual blocking)
    const isBlocked = iBlockedThem || theyBlockedMe || match.isBlocked || false;
    const isUnmatched = userDoc?.unmatchedUsers?.includes(match.id) || match.isUnmatched || false;
    
    // Set chat with blocked/unmatched status and blocking direction
    setSelectedChat({ 
      ...match, 
      currentUserId: user.uid,
      isBlocked,
      isUnmatched,
      iBlockedThem, // Current user blocked the other user
      theyBlockedMe, // Other user blocked current user
    });
    setMessages([]);
    setShowMenu(false);
    setShowSettings(false);

    // Cleanup previous listeners
    if (messageUnsubscribeRef.current) {
      messageUnsubscribeRef.current();
    }
    if (typingUnsubscribeRef.current) {
      typingUnsubscribeRef.current();
    }
    if (onlineStatusUnsubscribeRef.current) {
      onlineStatusUnsubscribeRef.current();
    }

    // Set user online when entering chat
    await firestoreService.updateUserOnlineStatus(user.uid, true);

    // Load chat settings for both users
    const [mySettings, otherSettings] = await Promise.all([
      firestoreService.getChatSettings(user.uid, match.id),
      firestoreService.getChatSettings(match.id, user.uid),
    ]);
    setChatSettings(mySettings);
    setOtherUserSettings(otherSettings);

    // Load initial messages
    const initialMessages = await firestoreService.getMessages(user.uid, match.id);
    setMessages(initialMessages);

    // Mark messages as read
    await firestoreService.markMessagesAsRead(user.uid, match.id);

    // Set up real-time message listener
    messageUnsubscribeRef.current = firestoreService.listenToMessages(
      user.uid,
      match.id,
      (newMessages) => {
        // Mark messages as delivered for sent messages (real-time update)
        newMessages.forEach(async (msg: any) => {
          if (msg.senderId === user.uid && !msg.delivered) {
            const chatId = firestoreService.getChatId(user.uid, match.id);
            await firestoreService.markMessageAsDelivered(msg.id, chatId);
          }
        });
        
        // Update messages state (this will trigger re-render with latest read/delivered status)
        setMessages(newMessages);
        
        // Mark received messages as read when chat is open (real-time)
        firestoreService.markMessagesAsRead(user.uid, match.id);
      }
    );

    // Set up typing status listener (only if both users have it enabled and chat is not blocked/unmatched)
    // Blocked/unmatched users için typing indicator gösterilmemeli
    if (!isBlocked && !isUnmatched && mySettings.showTypingIndicator && otherSettings.showTypingIndicator) {
      typingUnsubscribeRef.current = firestoreService.listenToTypingStatus(
        user.uid,
        match.id,
        (isTyping) => {
          setOtherUserTyping(isTyping);
        }
      );
    } else {
      setOtherUserTyping(false);
      // Listener kurulmamalı, bu yüzden null olarak bırakıyoruz
    }

    // Set up online status listener (only if both users have it enabled and chat is not blocked/unmatched)
    // Blocked/unmatched users için online status gösterilmemeli
    if (!isBlocked && !isUnmatched && mySettings.showOnlineStatus && otherSettings.showOnlineStatus) {
      onlineStatusUnsubscribeRef.current = firestoreService.listenToUserOnlineStatus(
        match.id,
        (isOnline) => {
          setIsOnline(isOnline);
        }
      );
    } else {
      setIsOnline(false);
      // Listener kurulmamalı, bu yüzden null olarak bırakıyoruz
    }
  };

  const handleBackToList = async () => {
    // Cleanup listeners
    if (messageUnsubscribeRef.current) {
      messageUnsubscribeRef.current();
      messageUnsubscribeRef.current = null;
    }
    if (typingUnsubscribeRef.current) {
      typingUnsubscribeRef.current();
      typingUnsubscribeRef.current = null;
    }
    if (onlineStatusUnsubscribeRef.current) {
      onlineStatusUnsubscribeRef.current();
      onlineStatusUnsubscribeRef.current = null;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // User is still in message screen, keep online status
    const user = await authService.getCurrentUser();
    if (user) {
      await firestoreService.updateUserOnlineStatus(user.uid, true);
    }

    setSelectedChat(null);
    setMessages([]);
    setOtherUserTyping(false);
    setIsTyping(false);
    setShowMenu(false);
    setShowSettings(false);
    
    // Reload matches to update unread counts
    await loadMatches();
  };

  const handleRemoveMatch = async () => {
    if (!selectedChat) return;

    Alert.alert(
      'Eşleşmeyi Bitir',
      `${selectedChat.userName} ile eşleşmeyi bitirmek istediğinize emin misiniz? Sohbet geçmişi korunacak ancak yeni mesaj gönderemezsiniz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Bitir',
          style: 'destructive',
              onPress: async () => {
                try {
                  const user = await authService.getCurrentUser();
                  if (!user) return;

                  await firestoreService.removeMatch(user.uid, selectedChat.id);
                  
                  // Close chat first
                  handleBackToList();
                  
                  // Switch to unmatched filter to show the removed match
                  setFilterType('unmatched');
                  
                  // Reload unmatched users and matches with the new filter type
                  await loadUnmatchedUsers();
                  await loadMatches('unmatched');
                  
                  Alert.alert('Başarılı', 'Eşleşme başarıyla sonlandırıldı');
                } catch (error) {
                  console.error('Error removing match:', error);
                  Alert.alert('Hata', 'Eşleşme sonlandırılırken bir hata oluştu');
                }
              },
        },
      ]
    );
  };

  const handleRestoreMatch = async () => {
    if (!selectedChat) return;

    Alert.alert(
      'Eşleşmeyi Geri Yükle',
      `${selectedChat.userName} ile eşleşmeyi geri yüklemek istediğinize emin misiniz? Sohbet tekrar aktif hale gelecek ve mesajlaşabileceksiniz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Geri Yükle',
          onPress: async () => {
            try {
              const user = await authService.getCurrentUser();
              if (!user) return;

              await firestoreService.restoreMatch(user.uid, selectedChat.id, selectedChat.matchedMovie);
              
              // Close chat first
              handleBackToList();
              
              // Update filter to 'all' and reload
              setFilterType('all');
              await loadUnmatchedUsers();
              await loadMatches('all');
              
              Alert.alert('Başarılı', 'Eşleşme başarıyla geri yüklendi ve sohbet aktif hale getirildi');
            } catch (error) {
              console.error('Error restoring match:', error);
              Alert.alert('Hata', 'Eşleşme geri yüklenirken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const handleBlockUser = async () => {
    if (!selectedChat) return;

    Alert.alert(
      'Kullanıcıyı Engelle',
      `${selectedChat.userName} kullanıcısını engellemek istediğinize emin misiniz? Engellediğiniz kullanıcı size mesaj gönderemez ve sizi göremez.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Engelle',
          style: 'destructive',
          onPress: async () => {
            try {
              const user = await authService.getCurrentUser();
              if (!user) return;

              await firestoreService.blockUser(user.uid, selectedChat.id);
              await firestoreService.removeMatch(user.uid, selectedChat.id);
              Alert.alert('Başarılı', 'Kullanıcı engellendi');
              handleBackToList();
            } catch (error) {
              console.error('Error blocking user:', error);
              Alert.alert('Hata', 'Kullanıcı engellenirken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const handleUnblockUser = async () => {
    if (!selectedChat) return;

    const user = await authService.getCurrentUser();
    if (!user) return;

    Alert.alert(
      'Engeli Kaldır',
      `${selectedChat.userName} kullanıcısının engelini kaldırmak istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Kaldır',
          onPress: async () => {
            try {
              await firestoreService.unblockUser(user.uid, selectedChat.id);
              
              // Check the current state after unblocking
              const otherUserDoc = await firestoreService.getUserDocument(selectedChat.id);
              const theyStillBlockMe = otherUserDoc?.blockedUsers?.includes(user.uid) || false;
              
              // Also check if we still block them
              const currentUserDoc = await firestoreService.getUserDocument(user.uid);
              const iStillBlockThem = currentUserDoc?.blockedUsers?.includes(selectedChat.id) || false;
              
              // If both unblocked, it's fully unblocked
              const isFullyUnblocked = !theyStillBlockMe && !iStillBlockThem;
              
              if (isFullyUnblocked) {
                Alert.alert('Başarılı', 'Engel kaldırıldı. Her iki taraf da engeli kaldırdığı için eşleşme sonlandırıldı ve sohbet "Bitti" listesine taşındı.');
              } else {
                Alert.alert('Başarılı', 'Engel kaldırıldı. Ancak bu kullanıcı sizi hala engelliyor. Her iki taraf da engeli kaldırmadan mesajlaşamazsınız.');
              }
              
              // Close chat first
              handleBackToList();
              
              // Reload lists
              await loadUnmatchedUsers();
              await loadBlockedUsers();
              
              // If fully unblocked, switch to unmatched filter
              if (isFullyUnblocked) {
                setFilterType('unmatched');
                await loadMatches('unmatched');
              } else {
                // Still blocked by other user, stay in blocked list
                setFilterType('blocked');
                await loadMatches('blocked');
              }
            } catch (error) {
              console.error('Error unblocking user:', error);
              Alert.alert('Hata', 'Engel kaldırılırken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const handleUpdateSettings = async (newSettings: any, settingName: string) => {
    try {
      const user = await authService.getCurrentUser();
      if (!user || !selectedChat) return;

      // Show confirmation dialog with detailed information for bidirectional settings
      const getWarningMessage = (setting: string, value: boolean): string => {
        if (setting === 'showReadReceipts' && !value) {
          return 'Okundu bilgisi kapatıldığında:\n\n• Karşı taraf sizin mesajlarınızın okundu bilgisini göremez\n• Siz de karşı tarafın mesajlarının okundu bilgisini göremezsiniz\n• Her iki tarafta da okundu bilgisi devre dışı kalır\n\nBu ayar iki taraflıdır ve her iki kullanıcıyı da etkiler.';
        } else if (setting === 'showOnlineStatus' && !value) {
          return 'Çevrimiçi durumu kapatıldığında:\n\n• Karşı taraf sizin çevrimiçi durumunuzu göremez\n• Siz de karşı tarafın çevrimiçi durumunu göremezsiniz\n• Her iki tarafta da çevrimiçi durumu devre dışı kalır\n\nBu ayar iki taraflıdır ve her iki kullanıcıyı da etkiler.';
        } else if (setting === 'showTypingIndicator' && !value) {
          return 'Yazıyor bilgisi kapatıldığında:\n\n• Karşı taraf sizin yazıyor durumunuzu göremez\n• Siz de karşı tarafın yazıyor durumunu göremezsiniz\n• Her iki tarafta da yazıyor göstergesi devre dışı kalır\n\nBu ayar iki taraflıdır ve her iki kullanıcıyı da etkiler.';
        } else if (setting === 'showReadReceipts' && value) {
          return 'Okundu bilgisi açıldığında:\n\n• Karşı taraf sizin mesajlarınızın okundu bilgisini görebilir\n• Siz de karşı tarafın mesajlarının okundu bilgisini görebilirsiniz\n\nBu ayar iki taraflıdır ve her iki kullanıcıyı da etkiler.';
        } else if (setting === 'showOnlineStatus' && value) {
          return 'Çevrimiçi durumu açıldığında:\n\n• Karşı taraf sizin çevrimiçi durumunuzu görebilir\n• Siz de karşı tarafın çevrimiçi durumunu görebilirsiniz\n\nBu ayar iki taraflıdır ve her iki kullanıcıyı da etkiler.';
        } else if (setting === 'showTypingIndicator' && value) {
          return 'Yazıyor bilgisi açıldığında:\n\n• Karşı taraf sizin yazıyor durumunuzu görebilir\n• Siz de karşı tarafın yazıyor durumunu görebilirsiniz\n\nBu ayar iki taraflıdır ve her iki kullanıcıyı da etkiler.';
        }
        return '';
      };

      const warningMessage = getWarningMessage(settingName, newSettings[settingName]);
      
      if (warningMessage) {
        Alert.alert(
          'Emin misiniz?',
          warningMessage,
          [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Evet, Değiştir',
              onPress: async () => {
                // Update settings (this will update both users' settings for bidirectional settings)
                await firestoreService.updateChatSettings(user.uid, selectedChat.id, newSettings);
                setChatSettings(newSettings);
                
                // Reload other user's settings since they may have been updated
                const updatedOtherSettings = await firestoreService.getChatSettings(selectedChat.id, user.uid);
                setOtherUserSettings(updatedOtherSettings);
                
                // Update listeners based on new settings
                if (newSettings.showTypingIndicator && updatedOtherSettings.showTypingIndicator && !typingUnsubscribeRef.current) {
                  typingUnsubscribeRef.current = firestoreService.listenToTypingStatus(
                    user.uid,
                    selectedChat.id,
                    (isTyping) => {
                      setOtherUserTyping(isTyping);
                    }
                  );
                } else if ((!newSettings.showTypingIndicator || !updatedOtherSettings.showTypingIndicator) && typingUnsubscribeRef.current) {
                  typingUnsubscribeRef.current();
                  typingUnsubscribeRef.current = null;
                  setOtherUserTyping(false);
                }

                if (newSettings.showOnlineStatus && updatedOtherSettings.showOnlineStatus && !onlineStatusUnsubscribeRef.current) {
                  onlineStatusUnsubscribeRef.current = firestoreService.listenToUserOnlineStatus(
                    selectedChat.id,
                    (isOnline) => {
                      setIsOnline(isOnline);
                    }
                  );
                } else if ((!newSettings.showOnlineStatus || !updatedOtherSettings.showOnlineStatus) && onlineStatusUnsubscribeRef.current) {
                  onlineStatusUnsubscribeRef.current();
                  onlineStatusUnsubscribeRef.current = null;
                }

                Alert.alert('Başarılı', 'Ayarlar güncellendi');
              },
            },
          ]
        );
      } else {
        // No warning needed, just update (for notifications)
        await firestoreService.updateChatSettings(user.uid, selectedChat.id, newSettings);
        setChatSettings(newSettings);
        Alert.alert('Başarılı', 'Ayarlar güncellendi');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Hata', 'Ayarlar güncellenirken bir hata oluştu');
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || sendingMessage || !selectedChat) return;

    // Prevent sending messages to blocked or unmatched users
    const user = await authService.getCurrentUser();
    if (!user) return;
    
    const userDoc = await firestoreService.getUserDocument(user.uid);
    const isBlocked = userDoc?.blockedUsers?.includes(selectedChat.id) || selectedChat.isBlocked || false;
    const isUnmatched = userDoc?.unmatchedUsers?.includes(selectedChat.id) || selectedChat.isUnmatched || false;
    
    if (isBlocked || isUnmatched) {
      Alert.alert(
        isBlocked ? 'Engellenmiş Kullanıcı' : 'Eşleşme Sonlandırılmış',
        isBlocked
          ? 'Engellenmiş kullanıcılara mesaj gönderemezsiniz.'
          : 'Eşleşmeyi sonlandırdığınız kullanıcılara mesaj gönderemezsiniz.'
      );
      return;
    }

    try {
      setSendingMessage(true);

      // Stop typing indicator
      await firestoreService.setTypingStatus(user.uid, selectedChat.id, false);
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Send message
      await firestoreService.sendMessage(user.uid, selectedChat.id, messageText.trim());
      
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Hata', 'Mesaj gönderilirken bir hata oluştu');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleTextChange = async (text: string) => {
    setMessageText(text);
    
    if (!selectedChat) return;
    const user = await authService.getCurrentUser();
    if (!user) return;

    // Check if user is blocked or unmatched - don't send typing indicator
    const userDoc = await firestoreService.getUserDocument(user.uid);
    const isBlocked = userDoc?.blockedUsers?.includes(selectedChat.id) || false;
    const isUnmatched = userDoc?.unmatchedUsers?.includes(selectedChat.id) || false;
    
    if (isBlocked || isUnmatched || selectedChat.isBlocked || selectedChat.isUnmatched) {
      return; // Don't send typing indicator for blocked/unmatched users
    }

    // Set typing indicator
    if (!isTyping && text.trim().length > 0) {
      setIsTyping(true);
      await firestoreService.setTypingStatus(user.uid, selectedChat.id, true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false);
      // Only stop typing if chat is not blocked/unmatched
      if (!selectedChat.isBlocked && !selectedChat.isUnmatched) {
        await firestoreService.setTypingStatus(user.uid, selectedChat.id, false);
      }
    }, 2000);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E50914" />
          <Text style={styles.loadingText}>Mesajlar yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Chat View
  if (selectedChat) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {/* Chat Header */}
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
              <Text style={styles.backButtonText}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.chatHeaderInfo}
              onPress={async () => {
                // Load OTHER user's profile (not own profile)
                try {
                  const user = await authService.getCurrentUser();
                  if (!user || !selectedChat) return;
                  
                  // Load the OTHER person's profile (selectedChat.id is the other user's ID)
                  const otherUserId = selectedChat.id;
                  const userDoc = await firestoreService.getUserDocument(otherUserId);
                  if (userDoc) {
                    // Fetch favorites and watched content for the OTHER user
                    const { userDataManager } = await import('../services/UserDataManager');
                    const favorites = await userDataManager.getUserFavorites(otherUserId);
                    const watchedContent = await userDataManager.getUserWatchedContent(otherUserId);
                    
                    setProfileUser({
                      ...userDoc,
                      bio: userDoc.bio || userDoc.biography || userDoc.profile?.bio || '',
                      biography: userDoc.biography || userDoc.bio || userDoc.profile?.bio || '',
                      letterboxdLink: userDoc.letterboxdLink || userDoc.socialLinks?.letterboxd || userDoc.social?.socialLinks?.letterboxd || '',
                      favorites,
                      watchedContent,
                    });
                    setShowProfileModal(true);
                  }
                } catch (error) {
                  console.error('Error loading user profile:', error);
                  Alert.alert('Hata', 'Profil yüklenirken bir hata oluştu');
                }
              }}
              activeOpacity={0.7}
            >
              {selectedChat.userPhoto ? (
                <Image source={{ uri: selectedChat.userPhoto }} style={styles.chatHeaderAvatar} resizeMode="cover" />
              ) : (
                <View style={[styles.chatHeaderAvatar, styles.noAvatar]}>
                  <Text style={styles.noAvatarTextSmall}>
                    {String((selectedChat.userName?.[0] || '?')).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.chatHeaderText}>
                <Text style={styles.chatHeaderName}>{selectedChat.userName}</Text>
                {/* Don't show online status for blocked/unmatched users */}
                {!(selectedChat.isBlocked || selectedChat.isUnmatched) && (
                  <Text style={styles.chatHeaderStatus}>
                    {chatSettings.showOnlineStatus && otherUserSettings.showOnlineStatus && (isOnline || selectedChat.isOnline) ? '🟢 Çevrimiçi' : 'Çevrimdışı'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.menuButton}
              onPress={() => setShowMenu(true)}
            >
              <Icon name={Icons.moreVert} size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Messages */}
          <ScrollView 
            ref={messagesEndRef}
            style={styles.messagesContainer} 
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => messagesEndRef.current?.scrollToEnd({ animated: true })}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={async () => {
                  setRefreshing(true);
                  const user = await authService.getCurrentUser();
                  if (user && selectedChat) {
                    const newMessages = await firestoreService.getMessages(user.uid, selectedChat.id);
                    setMessages(newMessages);
                  }
                  setRefreshing(false);
                }}
                colors={['#E50914']}
                tintColor="#E50914"
              />
            }
          >
            {messages.map((message) => {
              // Check if message is from current user
              const isOwnMessage = message.senderId === selectedChat?.currentUserId;
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwnMessage={isOwnMessage}
                  showReadReceipts={chatSettings.showReadReceipts}
                  otherUserShowReadReceipts={otherUserSettings.showReadReceipts}
                  isBlocked={selectedChat.isBlocked}
                  isUnmatched={selectedChat.isUnmatched}
                />
              );
            })}
            {chatSettings.showTypingIndicator && otherUserSettings.showTypingIndicator && otherUserTyping && (
              <View style={styles.typingIndicator}>
                <View style={styles.typingBubble}>
                  <View style={styles.typingDot} />
                  <View style={[styles.typingDot, styles.typingDotDelay1]} />
                  <View style={[styles.typingDot, styles.typingDotDelay2]} />
                </View>
                <Text style={styles.typingText}>Yazıyor...</Text>
              </View>
            )}
          </ScrollView>

          {/* Menu Modal */}
          <MenuModal
            visible={showMenu}
            onClose={() => setShowMenu(false)}
            onOpenSettings={!(selectedChat.isBlocked || selectedChat.isUnmatched) ? () => {
              setShowMenu(false);
              setShowSettings(true);
            } : undefined}
            onRemoveMatch={!(selectedChat.isBlocked || selectedChat.isUnmatched) ? handleRemoveMatch : undefined}
            onRestoreMatch={undefined} // Never show "Eşleşmeyi Geri Yükle" in menu
            onBlockUser={selectedChat.theyBlockedMe || (!selectedChat.isBlocked && selectedChat.isUnmatched) ? handleBlockUser : (!selectedChat.isBlocked ? handleBlockUser : undefined)} // Show "Engelle" if they blocked me, or if unmatched, or if active chat
            onUnblockUser={selectedChat.iBlockedThem ? handleUnblockUser : undefined} // Only show "Engeli Kaldır" if I blocked them
            isBlocked={selectedChat.isBlocked}
            isUnmatched={selectedChat.isUnmatched}
            iBlockedThem={selectedChat.iBlockedThem}
            theyBlockedMe={selectedChat.theyBlockedMe}
          />

          {/* Settings Modal */}
          <ChatSettingsModal
            visible={showSettings}
            onClose={() => setShowSettings(false)}
            settings={chatSettings}
            onUpdateSettings={handleUpdateSettings}
          />

          {/* Profile Modal */}
          {profileUser && (
            <Modal
              visible={showProfileModal}
              animationType="slide"
              transparent={false}
              onRequestClose={() => {
                setShowProfileModal(false);
                setProfileUser(null);
              }}
            >
              <View style={styles.profileModalContainer}>
                <TouchableOpacity
                  style={styles.profileModalCloseButton}
                  onPress={() => {
                    setShowProfileModal(false);
                    setProfileUser(null);
                  }}
                >
                  <Text style={styles.profileModalCloseText}>✕</Text>
                </TouchableOpacity>
                <View style={styles.profileModalContent}>
                  <EnhancedMatchCard
                    user={profileUser}
                    onPass={() => {
                      setShowProfileModal(false);
                      setProfileUser(null);
                    }}
                    onLike={() => {
                      setShowProfileModal(false);
                      setProfileUser(null);
                    }}
                    currentMovie={null}
                    allowSwipeRight={false}
                    swipeLeftText=""
                    fullScreen={true}
                  />
                </View>
              </View>
            </Modal>
          )}

          {/* Message Input - Only show if chat is not blocked or unmatched */}
          {!(selectedChat.isBlocked || selectedChat.isUnmatched) && (
            <View style={styles.messageInputContainer}>
              <TextInput
                style={styles.messageInput}
                placeholder="Mesaj yazın..."
                placeholderTextColor="#666"
                value={messageText}
                onChangeText={handleTextChange}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!messageText.trim() || sendingMessage}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.sendButtonText}>➤</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
          
          {/* Blocked/Unmatched Message */}
          {(selectedChat.isBlocked || selectedChat.isUnmatched) && (
            <View style={styles.blockedMessageContainer}>
              <Text style={styles.blockedMessageText}>
                {selectedChat.isBlocked 
                  ? selectedChat.iBlockedThem && selectedChat.theyBlockedMe
                    ? 'Bu kullanıcı karşılıklı olarak engellenmiş. Her iki taraf da engeli kaldırmadan mesaj gönderemezsiniz.'
                    : selectedChat.iBlockedThem
                    ? 'Bu kullanıcıyı engellediniz. Engeli kaldırmak için menüden "Engeli Kaldır" seçeneğini kullanın.'
                    : selectedChat.theyBlockedMe
                    ? 'Bu kullanıcı sizi engellemiş. Mesaj gönderemezsiniz.'
                    : 'Bu kullanıcı engellenmiş. Mesaj gönderemezsiniz.'
                  : 'Bu eşleşme sonlandırılmış. Mesaj gönderemezsiniz.'}
              </Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Chats List View
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Icon name={Icons.matches} size={20} color="#E50914" />
          <Text style={styles.headerTitle}>Eşleşmeler & Mesajlar</Text>
        </View>
        <Text style={styles.headerSubtitle}>{String(matches.length)} eşleşme</Text>
      </View>

      {/* Filter Buttons */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
          onPress={() => {
            setFilterType('all');
            loadMatches();
          }}
        >
          <Text style={[styles.filterButtonText, filterType === 'all' && styles.filterButtonTextActive]}>
            Tümü
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'unread' && styles.filterButtonActive]}
          onPress={() => {
            setFilterType('unread');
            loadMatches();
          }}
        >
          <Text style={[styles.filterButtonText, filterType === 'unread' && styles.filterButtonTextActive]}>
            Okunmamış
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'read' && styles.filterButtonActive]}
          onPress={() => {
            setFilterType('read');
            loadMatches();
          }}
        >
          <Text style={[styles.filterButtonText, filterType === 'read' && styles.filterButtonTextActive]}>
            Okunmuş
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'unmatched' && styles.filterButtonActive]}
          onPress={() => {
            setFilterType('unmatched');
            loadMatches();
          }}
        >
          <Text style={[styles.filterButtonText, filterType === 'unmatched' && styles.filterButtonTextActive]}>
            Bitti
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterType === 'blocked' && styles.filterButtonActive]}
          onPress={() => {
            setFilterType('blocked');
            loadMatches();
          }}
        >
          <Text style={[styles.filterButtonText, filterType === 'blocked' && styles.filterButtonTextActive]}>
            Engel
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView
        style={styles.chatsList}
        contentContainerStyle={[
          styles.chatsListContent,
          matches.length === 0 && styles.emptyScrollContent
        ]}
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
        {matches.length > 0 ? (
          <>
            {matches.map((match) => (
              <ChatPreviewCard
                key={`${match.id}-${match.category || 'active'}`}
                match={match}
                onPress={() => handleChatPress(match)}
                showCategoryLabel={filterType === 'all'}
              />
            ))}
            <View style={styles.bottomSpace} />
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Icon name={Icons.matches} size={48} color="#8C8C8C" />
            <Text style={styles.emptyTitle}>Henüz Eşleşme Yok</Text>
            <Text style={styles.emptySubtitle}>
              Match ekranından kullanıcıları sağa kaydırarak beğenin. Onlar da sizi beğenince burada görünecekler!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Blocked Users Modal */}
      <Modal
        visible={showBlockedUsers}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBlockedUsers(false)}
      >
        <View style={styles.blockedModalOverlay}>
          <View style={styles.blockedModalContent}>
            <View style={styles.blockedModalHeader}>
              <Text style={styles.blockedModalTitle}>Engel</Text>
              <TouchableOpacity onPress={() => setShowBlockedUsers(false)}>
                <Icon name={Icons.close} size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.blockedList}>
              {blockedUsers.length > 0 ? (
                blockedUsers.map((blocked) => (
                  <View key={blocked.id} style={styles.blockedUserItem}>
                    {blocked.userPhoto ? (
                      <Image source={{ uri: blocked.userPhoto }} style={styles.blockedUserAvatar} />
                    ) : (
                      <View style={[styles.blockedUserAvatar, styles.noAvatar]}>
                        <Text style={styles.noAvatarText}>
                          {String((blocked.userName?.[0] || '?')).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.blockedUserInfo}>
                      <Text style={styles.blockedUserName}>{blocked.userName}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.unblockButton}
                      onPress={async () => {
                        Alert.alert(
                          'Engeli Kaldır',
                          `${blocked.userName} kullanıcısının engelini kaldırmak istediğinize emin misiniz?`,
                          [
                            { text: 'İptal', style: 'cancel' },
                            {
                              text: 'Evet, Kaldır',
                              onPress: async () => {
                                try {
                                  const user = await authService.getCurrentUser();
                                  if (user) {
                                    await firestoreService.unblockUser(user.uid, blocked.id);
                                    await loadBlockedUsers();
                                    if (filterType === 'blocked') {
                                      await loadMatches();
                                    }
                                    Alert.alert('Başarılı', 'Engel kaldırıldı');
                                  }
                                } catch (error) {
                                  console.error('Error unblocking user:', error);
                                  Alert.alert('Hata', 'Engel kaldırılırken bir hata oluştu');
                                }
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.unblockButtonText}>Engeli Kaldır</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.emptyBlockedContainer}>
                  <Text style={styles.emptyBlockedText}>Engellenmiş kullanıcı yok</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#CCCCCC',
    fontSize: 14,
    marginTop: 4,
  },
  chatsList: {
    flex: 1,
  },
  chatsListContent: {
    paddingHorizontal: 20,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  chatPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1A1A1A',
  },
  noAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E50914',
  },
  noAvatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  noAvatarTextSmall: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#000',
  },
  chatInfo: {
    flex: 1,
  },
  chatPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  chatName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  chatTime: {
    color: '#CCCCCC',
    fontSize: 12,
  },
  chatLastMessage: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  unreadBadge: {
    backgroundColor: '#E50914',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomSpace: {
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#CCCCCC',
    fontSize: 16,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
  },
  // Chat View Styles
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    backgroundColor: '#1A1A1A',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#2A2A2A',
  },
  chatHeaderName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  chatHeaderStatus: {
    color: '#CCCCCC',
    fontSize: 12,
    marginTop: 2,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  messagesContent: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#E50914',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1A1A1A',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 10,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherMessageTime: {
    color: '#CCCCCC',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    color: '#FFFFFF',
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E50914',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#666',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  readIcon: {
    marginLeft: 4,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    marginRight: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CCCCCC',
    marginHorizontal: 2,
  },
  typingDotDelay1: {
    opacity: 0.7,
  },
  typingDotDelay2: {
    opacity: 0.4,
  },
  typingText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontStyle: 'italic',
  },
  chatHeaderText: {
    flex: 1,
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  menuItemText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
  },
  menuItemDanger: {
    color: '#FF6B6B',
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  settingsContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  settingsTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingsScroll: {
    maxHeight: 400,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    color: '#CCCCCC',
    fontSize: 12,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    padding: 2,
  },
  toggleActive: {
    backgroundColor: '#E50914',
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  settingsFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  saveButton: {
    backgroundColor: '#E50914',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  profileModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  profileModalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalCloseText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileModalContent: {
    flex: 1,
  },
  filterScroll: {
    maxHeight: 50,
    marginBottom: 8,
  },
  filterContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  filterButtonActive: {
    backgroundColor: '#E50914',
    borderColor: '#E50914',
  },
  filterButtonText: {
    color: '#CCCCCC',
    fontSize: 12,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  blockedModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  blockedModalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  blockedModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  blockedModalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  blockedList: {
    maxHeight: 500,
  },
  blockedUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  blockedUserAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  blockedUserInfo: {
    flex: 1,
  },
  blockedUserName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  unblockButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E50914',
  },
  unblockButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyBlockedContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyBlockedText: {
    color: '#CCCCCC',
    fontSize: 16,
  },
  readReceiptContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  readIconSecond: {
    marginLeft: -8,
  },
  blockedMessageContainer: {
    padding: 16,
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockedMessageText: {
    color: '#CCCCCC',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
