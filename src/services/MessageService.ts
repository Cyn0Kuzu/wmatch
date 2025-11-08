import { firestoreService, FirestoreService } from './FirestoreService';
import { authService, AuthService } from './AuthService';
import { Timestamp, onSnapshot, collection, addDoc, query, orderBy, doc } from 'firebase/firestore';
import { logger } from '../utils/Logger';

export interface Message {
  id: string;
  text: string;
  createdAt: Timestamp;
  senderId: string;
  receiverId: string;
  isRead: boolean;
}

export class MessageService {
  private static instance: MessageService;
  private firestoreService: FirestoreService;
  private authService: AuthService;

  private constructor() {
    this.firestoreService = firestoreService;
    this.authService = authService;
  }

  public static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }

  // A method to create a unique chat ID between two users
  private getChatId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  // Method to send a message
  public async sendMessage(senderId: string, receiverId: string, text: string): Promise<void> {
    try {
      if (!text.trim()) {
        throw new Error("Message text cannot be empty.");
      }

      const chatId = this.getChatId(senderId, receiverId);
      const messagesCollection = collection(this.firestoreService.getDatabase(), 'chats', chatId, 'messages');

      await addDoc(messagesCollection, {
        text,
        createdAt: Timestamp.now(),
        senderId,
        receiverId,
        isRead: false,
      });

      // Also update the last message in the match document for both users
      await this.firestoreService.updateLastMessage(senderId, receiverId, text);

    } catch (error) {
      logger.error('Error sending message', 'MessageService', error);
      throw error;
    }
  }

  // Method to get messages for a chat in real-time
  public getMessages(chatId: string, callback: (messages: Message[]) => void): () => void {
    try {
      const messagesCollection = collection(this.firestoreService.getDatabase(), 'chats', chatId, 'messages');
      const q = query(messagesCollection, orderBy('createdAt', 'asc'));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const messages: Message[] = [];
        querySnapshot.forEach((doc) => {
          messages.push({ id: doc.id, ...doc.data() } as Message);
        });
        callback(messages);
      });

      return unsubscribe;
    } catch (error) {
      logger.error('Error getting messages', 'MessageService', error);
      throw error;
    }
  }

  // Method to mark messages as read
  public async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    // This is a more complex operation that requires querying for unread messages
    // and updating them in a batch. For now, we will leave this as a placeholder.
    logger.info(`Marking messages as read for user ${userId} in chat ${chatId}`, 'MessageService');
  }
}

export const messageService = MessageService.getInstance();
