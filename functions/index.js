/**
 * Firebase Functions - Email Notification Service
 * 
 * Bu dosya Firebase Functions projesinde kullanılmalıdır.
 * Kurulum:
 * 1. Firebase CLI ile functions klasörü oluştur: firebase init functions
 * 2. Bu dosyayı functions/index.js olarak kaydet
 * 3. npm install nodemailer (veya başka bir email servisi)
 * 4. firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

// Email transporter oluştur (lazy load)
function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: functions.config().email.user,
      pass: functions.config().email.password,
    },
  });
}

// HTTP Callable function - Email gönderimi için
exports.sendReportEmailHTTP = functions.https.onCall(async (data, context) => {
  // Auth kontrolü
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Kullanıcı giriş yapmamış');
  }

  const reportData = data.reportData;
  const reportId = data.reportId;

  try {
    const transporter = getTransporter();
    const categories = reportData.categories || [];
    const reporterName = reportData.reporterInfo?.displayName || 
                        reportData.reporterInfo?.firstName || 
                        'Bilinmeyen';
    const reportedName = reportData.reportedInfo?.displayName || 
                        reportData.reportedInfo?.firstName || 
                        'Bilinmeyen';

    const mailOptions = {
      from: functions.config().email.user,
      to: 'memodee333@gmail.com',
      subject: `🚨 Yeni Kullanıcı Bildirimi - ${categories.join(', ')}`,
      html: `
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
                <p><span class="label">Bildirim ID:</span> ${reportId}</p>
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
                ${reportData.screenshots.map((url) => 
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
      `,
      text: `
YENİ KULLANICI BİLDİRİMİ

Bildirim ID: ${reportId}
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
      `.trim(),
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully for report ${reportId}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new functions.https.HttpsError('internal', 'Email gönderilemedi', error);
  }
});

// Firestore'da yeni bildirim oluşturulduğunda email gönder (backup trigger)
exports.sendReportEmail = functions.firestore
  .document('reports/{reportId}')
  .onCreate(async (snap, context) => {
    const reportData = snap.data();
    const reportId = context.params.reportId;

    try {
      const categories = reportData.categories || [];
      const reporterName = reportData.reporterInfo?.displayName || 
                          reportData.reporterInfo?.firstName || 
                          'Bilinmeyen';
      const reportedName = reportData.reportedInfo?.displayName || 
                          reportData.reportedInfo?.firstName || 
                          'Bilinmeyen';

      const mailOptions = {
        from: functions.config().email.user,
        to: 'memodee333@gmail.com',
        subject: `🚨 Yeni Kullanıcı Bildirimi - ${categories.join(', ')}`,
        html: `
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
                  <p><span class="label">Bildirim ID:</span> ${reportId}</p>
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
                  ${reportData.screenshots.map((url) => 
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
        `,
        text: `
YENİ KULLANICI BİLDİRİMİ

Bildirim ID: ${reportId}
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
        `.trim(),
      };

      const transporter = getTransporter();
      await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully for report ${reportId}`);
      return null;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  });

