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
} from 'react-native';
import { useCoreEngine } from '../core/CoreEngine';
import { firestoreService } from '../services/FirestoreService';
import { messageService, Message } from '../services/MessageService';
import { Timestamp } from 'firebase/firestore';
import { logger } from '../utils/Logger';

// Chat Preview Card Component
const ChatPreviewCard: React.FC<{
  match: any;
  onPress: () => void;
}> = ({ match, onPress }) => {
  const hasPhoto = match.userPhoto && match.userPhoto.trim() !== '';
  const timeAgo = getTimeAgo(match.lastMessageAt);

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
        {match.isOnline && <View style={styles.onlineIndicator} />}
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatPreviewHeader}>
          <Text style={styles.chatName} numberOfLines={1}>{match.userName || 'Kullanıcı'}</Text>
          <Text style={styles.chatTime}>{timeAgo}</Text>
        </View>
        <Text style={styles.chatLastMessage} numberOfLines={1}>
          {match.lastMessage || 'Henüz mesaj yok'}
        </Text>
      </View>

      {match.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{String(match.unreadCount)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Message Bubble Component
const MessageBubble: React.FC<{
  message: Message;
  isOwnMessage: boolean;
}> = ({ message, isOwnMessage }) => {
  return (
    <View style={[styles.messageBubble, isOwnMessage ? styles.ownMessage : styles.otherMessage]}>
      <Text style={[styles.messageText, isOwnMessage ? styles.ownMessageText : styles.otherMessageText]}>
        {message.text}
      </Text>
      <Text style={[styles.messageTime, isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime]}>
        {getTimeAgo(message.createdAt)}
      </Text>
    </View>
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
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadMatches();
    const loadCurrentUser = async () => {
      const user = await authService.getCurrentUser();
      if (user) {
        setCurrentUserId(user.uid);
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    if (selectedChat) {
      const loadMessages = async () => {
        const currentUser = await authService.getCurrentUser();
        if (!currentUser) return;

        const chatId = [currentUser.uid, selectedChat.id].sort().join('_');
        const unsubscribe = messageService.getMessages(chatId, (newMessages) => {
          setMessages(newMessages);
        });

        return () => unsubscribe();
      };
      loadMessages();
    }
  }, [selectedChat, authService]);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const loadMatches = async () => {
    try {
      setLoading(true);
      const user = await authService.getCurrentUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const userDoc = await firestoreService.getUserDocument(user.uid);
      if (!userDoc || !userDoc.social || !userDoc.social.matches) {
        setMatches([]);
        setLoading(false);
        return;
      }

      const userMatches = userDoc.social.matches || [];
      
      const matchesData = await Promise.all(
        userMatches.map(async (match: any) => {
          try {
            const matchedUser = await firestoreService.getUserDocument(match.matchedUserId);
            if (!matchedUser) return null;

            return {
              id: match.matchedUserId,
              userName: matchedUser.firstName || matchedUser.username || 'Kullanıcı',
              userPhoto: matchedUser.profilePhotos?.[0] || '',
              matchedAt: match.matchedAt,
              lastMessage: match.lastMessage || '',
              lastMessageAt: match.lastMessageAt || match.matchedAt,
              isOnline: matchedUser.isOnline || false,
              unreadCount: 0, // Implement unread count logic later
            };
          } catch (error) {
            logger.error(`Error fetching match ${match.matchedUserId}:`, 'MessageScreen', error);
            return null;
          }
        })
      );

      const validMatches = matchesData.filter(m => m !== null);
      const sortedMatches = validMatches.sort((a, b) => {
        const aTime = a.lastMessageAt?.toMillis?.() || 0;
        const bTime = b.lastMessageAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setMatches(sortedMatches);
    } catch (error) {
      logger.error('Error loading matches:', 'MessageScreen', error);
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

  const handleChatPress = (match: any) => {
    setSelectedChat(match);
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    setMessages([]);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || sendingMessage) return;

    try {
      setSendingMessage(true);
      const user = await authService.getCurrentUser();
      if (!user) return;

      await messageService.sendMessage(user.uid, selectedChat.id, messageText.trim());
      
      setMessageText('');
    } catch (error) {
      logger.error('Error sending message:', 'MessageScreen', error);
      Alert.alert('Hata', 'Mesaj gönderilirken bir hata oluştu');
    } finally {
      setSendingMessage(false);
    }
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

  if (selectedChat) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={handleBackToList} style={styles.backButton}>
              <Text style={styles.backButtonText}>‹</Text>
            </TouchableOpacity>
            <View style={styles.chatHeaderInfo}>
              {selectedChat.userPhoto ? (
                <Image source={{ uri: selectedChat.userPhoto }} style={styles.chatHeaderAvatar} resizeMode="cover" />
              ) : (
                <View style={[styles.chatHeaderAvatar, styles.noAvatar]}>
                  <Text style={styles.noAvatarTextSmall}>
                    {String((selectedChat.userName?.[0] || '?')).toUpperCase()}
                  </Text>
                </View>
              )}
              <View>
                <Text style={styles.chatHeaderName}>{selectedChat.userName}</Text>
                <Text style={styles.chatHeaderStatus}>
                  {selectedChat.isOnline ? '🟢 Çevrimiçi' : 'Çevrimdışı'}
                </Text>
              </View>
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
          >
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwnMessage={message.senderId === currentUserId}
              />
            ))}
          </ScrollView>

          <View style={styles.messageInputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Mesaj yazın..."
              placeholderTextColor="#666"
              value={messageText}
              onChangeText={setMessageText}
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
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💕 Eşleşmeler & Mesajlar</Text>
        <Text style={styles.headerSubtitle}>{String(matches.length)} eşleşme</Text>
      </View>

      {matches.length > 0 ? (
        <ScrollView
          style={styles.chatsList}
          contentContainerStyle={styles.chatsListContent}
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
          {matches.map((match) => (
            <ChatPreviewCard
              key={match.id}
              match={match}
              onPress={() => handleChatPress(match)}
            />
          ))}
          <View style={styles.bottomSpace} />
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💕</Text>
          <Text style={styles.emptyTitle}>Henüz Eşleşme Yok</Text>
          <Text style={styles.emptySubtitle}>
            Match ekranından kullanıcıları sağa kaydırarak beğenin. Onlar da sizi beğenince burada görünecekler!
          </Text>
        </View>
      )}
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
    color: '#8C8C8C',
    fontSize: 14,
    marginTop: 4,
  },
  chatsList: {
    flex: 1,
  },
  chatsListContent: {
    paddingHorizontal: 20,
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
  chatName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  chatTime: {
    color: '#666',
    fontSize: 12,
  },
  chatLastMessage: {
    color: '#8C8C8C',
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
    color: '#8C8C8C',
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
    color: '#8C8C8C',
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
    color: '#8C8C8C',
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
    color: '#666',
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
});
