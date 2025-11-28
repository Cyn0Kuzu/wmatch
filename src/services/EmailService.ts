import { logger } from '../utils/Logger';
import axios from 'axios';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { FirebaseService } from './FirebaseService';

/**
 * Email Service
 * Bildirim ve rapor email'lerini göndermek için kullanılır
 */
export class EmailService {
  private static instance: EmailService;
  private adminEmail = 'memodee333@gmail.com';
  private emailApiUrl: string | null = null;

  private constructor() {
    // Email API URL'i environment variable'dan alınabilir
    // Şimdilik null, Firebase Functions veya başka bir servis kullanılabilir
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Email API URL'ini ayarla (Firebase Functions veya başka bir servis)
   */
  public setEmailApiUrl(url: string): void {
    this.emailApiUrl = url;
  }

  /**
   * Bildirim email'i gönder
   * Not: Email gönderimi Firebase Functions tarafından otomatik yapılır
   * (Firestore trigger: reports/{reportId} onCreate)
   * Bu metod sadece loglama için kullanılır
   */
  public async sendReportNotification(reportData: {
    reportId: string;
    reporterId: string;
    reportedUserId: string;
    categories: string[];
    description: string;
    reporterInfo: any;
    reportedInfo: any;
    screenshots?: string[];
  }): Promise<void> {
    try {
      logger.info(`Sending report notification email: ${reportData.reportId}`, 'EmailService');
      
      // Önce Firebase Functions HTTP callable function'ı dene
      try {
        const firebaseService = FirebaseService.getInstance();
        const functions = getFunctions(firebaseService.getApp());
        const sendReportEmailHTTP = httpsCallable(functions, 'sendReportEmailHTTP');
        
        await sendReportEmailHTTP({
          reportId: reportData.reportId,
          reportData: reportData,
        });
        
        logger.info(`Report notification email sent successfully to ${this.adminEmail}`, 'EmailService');
        return;
      } catch (functionsError: any) {
        logger.warn('Firebase Functions call failed, trying alternative methods', 'EmailService', functionsError);
      }
      
      // Alternatif: HTTP endpoint kullan
      if (this.emailApiUrl) {
        try {
          const emailContent = this.formatReportEmail(reportData);
          await axios.post(this.emailApiUrl, {
            to: this.adminEmail,
            subject: `Yeni Kullanıcı Bildirimi - ${reportData.categories.join(', ')}`,
            html: emailContent,
            text: this.formatReportEmailText(reportData),
          });
          logger.info(`Report notification email sent via API to ${this.adminEmail}`, 'EmailService');
          return;
        } catch (apiError: any) {
          logger.warn('Email API call failed', 'EmailService', apiError);
        }
      }
      
      // Son çare: Firestore trigger'a güven (otomatik çalışır)
      logger.info(`Report notification queued for email (Firestore trigger will handle it): ${reportData.reportId}`, 'EmailService');
      this.logReportToConsole(reportData);
      
    } catch (error: any) {
      logger.error('Failed to process report notification', 'EmailService', error);
      // Email gönderilemese bile bildirim kaydedildi, hata fırlatma
      this.logReportToConsole(reportData);
    }
  }

  /**
   * Email içeriğini formatla (HTML)
   */
  private formatReportEmail(reportData: any): string {
    const categories = reportData.categories || [];
    const reporterName = reportData.reporterInfo?.displayName || reportData.reporterInfo?.firstName || 'Bilinmeyen';
    const reportedName = reportData.reportedInfo?.displayName || reportData.reportedInfo?.firstName || 'Bilinmeyen';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #E50914; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; }
          .section { margin-bottom: 20px; padding: 15px; background-color: white; border-radius: 5px; }
          .label { font-weight: bold; color: #E50914; }
          .screenshot { max-width: 100%; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚨 Yeni Kullanıcı Bildirimi</h1>
          </div>
          <div class="content">
            <div class="section">
              <h2>Bildirim Detayları</h2>
              <p><span class="label">Bildirim ID:</span> ${reportData.reportId}</p>
              <p><span class="label">Kategoriler:</span> ${categories.join(', ')}</p>
              <p><span class="label">Açıklama:</span></p>
              <p>${reportData.description || 'Açıklama yok'}</p>
            </div>

            <div class="section">
              <h2>Bildiren Kullanıcı</h2>
              <p><span class="label">Ad Soyad:</span> ${reporterName}</p>
              <p><span class="label">Kullanıcı Adı:</span> ${reportData.reporterInfo?.username || 'N/A'}</p>
              <p><span class="label">Email:</span> ${reportData.reporterInfo?.email || 'N/A'}</p>
              <p><span class="label">User ID:</span> ${reportData.reporterId}</p>
              <p><span class="label">Bio:</span> ${reportData.reporterInfo?.bio || 'N/A'}</p>
              <p><span class="label">Konum:</span> ${reportData.reporterInfo?.location || 'N/A'}</p>
              <p><span class="label">Takipçi:</span> ${reportData.reporterInfo?.followers || 0}</p>
              <p><span class="label">Takip:</span> ${reportData.reporterInfo?.following || 0}</p>
              <p><span class="label">Eşleşme:</span> ${reportData.reporterInfo?.matches || 0}</p>
              <p><span class="label">İzlenen Film:</span> ${reportData.reporterInfo?.moviesWatched || 0}</p>
              <p><span class="label">Hesap Oluşturulma:</span> ${reportData.reporterInfo?.createdAt ? new Date(reportData.reporterInfo.createdAt.seconds * 1000).toLocaleString('tr-TR') : 'N/A'}</p>
              <p><span class="label">Son Aktiflik:</span> ${reportData.reporterInfo?.lastActive ? new Date(reportData.reporterInfo.lastActive.seconds * 1000).toLocaleString('tr-TR') : 'N/A'}</p>
            </div>

            <div class="section">
              <h2>Bildirilen Kullanıcı</h2>
              <p><span class="label">Ad Soyad:</span> ${reportedName}</p>
              <p><span class="label">Kullanıcı Adı:</span> ${reportData.reportedInfo?.username || 'N/A'}</p>
              <p><span class="label">Email:</span> ${reportData.reportedInfo?.email || 'N/A'}</p>
              <p><span class="label">User ID:</span> ${reportData.reportedUserId}</p>
              <p><span class="label">Bio:</span> ${reportData.reportedInfo?.bio || 'N/A'}</p>
              <p><span class="label">Konum:</span> ${reportData.reportedInfo?.location || 'N/A'}</p>
              <p><span class="label">Takipçi:</span> ${reportData.reportedInfo?.followers || 0}</p>
              <p><span class="label">Takip:</span> ${reportData.reportedInfo?.following || 0}</p>
              <p><span class="label">Eşleşme:</span> ${reportData.reportedInfo?.matches || 0}</p>
              <p><span class="label">İzlenen Film:</span> ${reportData.reportedInfo?.moviesWatched || 0}</p>
              <p><span class="label">Hesap Oluşturulma:</span> ${reportData.reportedInfo?.createdAt ? new Date(reportData.reportedInfo.createdAt.seconds * 1000).toLocaleString('tr-TR') : 'N/A'}</p>
              <p><span class="label">Son Aktiflik:</span> ${reportData.reportedInfo?.lastActive ? new Date(reportData.reportedInfo.lastActive.seconds * 1000).toLocaleString('tr-TR') : 'N/A'}</p>
            </div>

            ${reportData.screenshots && reportData.screenshots.length > 0 ? `
            <div class="section">
              <h2>Ekran Görüntüleri</h2>
              ${reportData.screenshots.map((url: string) => 
                `<img src="${url}" alt="Screenshot" class="screenshot" />`
              ).join('')}
            </div>
            ` : ''}

            <div class="section">
              <p><span class="label">Tarih:</span> ${new Date().toLocaleString('tr-TR')}</p>
            </div>
          </div>
          <div class="footer">
            <p>Bu email otomatik olarak MWatch uygulaması tarafından gönderilmiştir.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Email içeriğini formatla (Plain Text)
   */
  private formatReportEmailText(reportData: any): string {
    const categories = reportData.categories || [];
    const reporterName = reportData.reporterInfo?.displayName || reportData.reporterInfo?.firstName || 'Bilinmeyen';
    const reportedName = reportData.reportedInfo?.displayName || reportData.reportedInfo?.firstName || 'Bilinmeyen';
    
    return `
YENİ KULLANICI BİLDİRİMİ

Bildirim ID: ${reportData.reportId}
Kategoriler: ${categories.join(', ')}
Tarih: ${new Date().toLocaleString('tr-TR')}

AÇIKLAMA:
${reportData.description || 'Açıklama yok'}

BİLDİREN KULLANICI:
Ad Soyad: ${reporterName}
Kullanıcı Adı: ${reportData.reporterInfo?.username || 'N/A'}
Email: ${reportData.reporterInfo?.email || 'N/A'}
User ID: ${reportData.reporterId}
Bio: ${reportData.reporterInfo?.bio || 'N/A'}
Konum: ${reportData.reporterInfo?.location || 'N/A'}
Takipçi: ${reportData.reporterInfo?.followers || 0}
Takip: ${reportData.reporterInfo?.following || 0}
Eşleşme: ${reportData.reporterInfo?.matches || 0}
İzlenen Film: ${reportData.reporterInfo?.moviesWatched || 0}
Hesap Oluşturulma: ${reportData.reporterInfo?.createdAt ? new Date(reportData.reporterInfo.createdAt.seconds * 1000).toLocaleString('tr-TR') : 'N/A'}
Son Aktiflik: ${reportData.reporterInfo?.lastActive ? new Date(reportData.reporterInfo.lastActive.seconds * 1000).toLocaleString('tr-TR') : 'N/A'}

BİLDİRİLEN KULLANICI:
Ad Soyad: ${reportedName}
Kullanıcı Adı: ${reportData.reportedInfo?.username || 'N/A'}
Email: ${reportData.reportedInfo?.email || 'N/A'}
User ID: ${reportData.reportedUserId}
Bio: ${reportData.reportedInfo?.bio || 'N/A'}
Konum: ${reportData.reportedInfo?.location || 'N/A'}
Takipçi: ${reportData.reportedInfo?.followers || 0}
Takip: ${reportData.reportedInfo?.following || 0}
Eşleşme: ${reportData.reportedInfo?.matches || 0}
İzlenen Film: ${reportData.reportedInfo?.moviesWatched || 0}
Hesap Oluşturulma: ${reportData.reportedInfo?.createdAt ? new Date(reportData.reportedInfo.createdAt.seconds * 1000).toLocaleString('tr-TR') : 'N/A'}
Son Aktiflik: ${reportData.reportedInfo?.lastActive ? new Date(reportData.reportedInfo.lastActive.seconds * 1000).toLocaleString('tr-TR') : 'N/A'}

${reportData.screenshots && reportData.screenshots.length > 0 ? 
  `Ekran Görüntüleri: ${reportData.screenshots.length} adet\n` : ''}

---
Bu email otomatik olarak MWatch uygulaması tarafından gönderilmiştir.
    `.trim();
  }

  /**
   * Email gönderilemezse console'a log yaz
   */
  private logReportToConsole(reportData: any): void {
    console.log('='.repeat(50));
    console.log('📧 YENİ KULLANICI BİLDİRİMİ (Email Gönderilemedi)');
    console.log('='.repeat(50));
    console.log('Bildirim ID:', reportData.reportId);
    console.log('Kategoriler:', reportData.categories?.join(', '));
    console.log('Açıklama:', reportData.description);
    console.log('Bildiren:', reportData.reporterInfo?.displayName || reportData.reporterInfo?.email);
    console.log('Bildirilen:', reportData.reportedInfo?.displayName || reportData.reportedInfo?.email);
    console.log('Tarih:', new Date().toLocaleString('tr-TR'));
    console.log('='.repeat(50));
    console.log(`\n⚠️ Email API URL yapılandırılmamış.`);
    console.log(`📧 Email göndermek için EmailService.setEmailApiUrl() metodunu kullanın.`);
    console.log(`📧 Veya Firebase Functions ile email gönderimi yapılandırın.\n`);
  }

  /**
   * Test email gönder
   */
  public async sendTestEmail(): Promise<void> {
    try {
      await this.sendReportNotification({
        reportId: 'test-' + Date.now(),
        reporterId: 'test-reporter',
        reportedUserId: 'test-reported',
        categories: ['test'],
        description: 'Bu bir test bildirimidir.',
        reporterInfo: {
          displayName: 'Test Kullanıcı',
          email: 'test@example.com',
        },
        reportedInfo: {
          displayName: 'Test Bildirilen',
          email: 'reported@example.com',
        },
      });
    } catch (error) {
      logger.error('Failed to send test email', 'EmailService', error);
      throw error;
    }
  }
}

export const emailService = EmailService.getInstance();

