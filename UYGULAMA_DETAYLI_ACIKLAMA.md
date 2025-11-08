# 🎬 WMatch - Film/Dizi Tabanlı Sosyal Eşleşme Uygulaması

## 📱 UYGULAMA GENEL BAKIŞ

**WMatch** (eski adıyla MWatch), film ve dizi zevklerine göre kullanıcıları eşleştiren, Tinder tarzı bir sosyal eşleşme uygulamasıdır. Kullanıcılar, izledikleri filmler ve diziler üzerinden ortak zevklere sahip kişilerle tanışabilir, gerçek zamanlı olarak aynı içeriği izleyenlerle eşleşebilir ve mesajlaşabilirler.

---

## 🎯 UYGULAMANIN AMACI

WMatch'in temel amacı, **film ve dizi zevklerine göre insanları bir araya getirmek** ve sosyal bağlantılar kurmalarını sağlamaktır. Uygulama şu sorunları çözer:

1. **Ortak İlgi Alanı Bulma**: Film/dizi zevklerine göre uyumlu kişileri bulma
2. **Gerçek Zamanlı Eşleşme**: Aynı anda aynı içeriği izleyenlerle anında eşleşme
3. **Sosyal Keşif**: Benzer izleme geçmişine sahip kişilerle tanışma
4. **İçerik Keşfi**: Yeni film ve diziler keşfetme

---

## 🏗️ TEKNİK MİMARİ

### **Teknoloji Stack:**
- **Frontend**: React Native 0.71.14 + Expo 48
- **Backend**: Firebase (Firestore, Authentication, Storage)
- **Film Verileri**: TMDB (The Movie Database) API
- **State Management**: Zustand
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **UI Framework**: React Native Paper
- **Animasyonlar**: React Native Reanimated, React Native Animatable

### **Ana Servisler:**
1. **AuthService**: Kullanıcı kimlik doğrulama ve yönetimi
2. **FirestoreService**: Veritabanı işlemleri
3. **TMDBService**: Film/dizi verilerini TMDB'den çekme
4. **MatchService**: Eşleşme algoritması ve skorlama
5. **RealTimeWatchingService**: Gerçek zamanlı izleme takibi
6. **UserDataManager**: Kullanıcı verilerini yönetme
7. **MovieWatchingService**: Film izleme durumu yönetimi

---

## 📺 EKRANLAR VE ÖZELLİKLER

### **1. 🏠 Welcome Screen (Hoş Geldiniz Ekranı)**
**Amaç**: Uygulamaya ilk giriş noktası

**Özellikler:**
- Modern ve animasyonlu karşılama ekranı
- Logo ve marka tanıtımı
- "Hesap Oluştur" ve "Giriş Yap" butonları
- Smooth fade-in animasyonları

**Kullanıcı Akışı:**
- Yeni kullanıcılar → Register Screen
- Mevcut kullanıcılar → Login Screen

---

### **2. 📝 Register Screen (Kayıt Ekranı)**
**Amaç**: Yeni kullanıcı kaydı (5 adımlı süreç)

**Adım 1: Kişisel Bilgiler**
- Ad, Soyad (opsiyonel)
- Kullanıcı adı (benzersizlik kontrolü ile)
- E-posta (benzersizlik kontrolü ile)
- Real-time validation

**Adım 2: Profil Fotoğrafları**
- En az 3, en fazla 7 fotoğraf
- Drag & drop ile sıralama
- 3:4 oranında fotoğraf yükleme
- Fotoğraf düzenleme ve silme
- Gelişmiş animasyonlu sürükle-bırak sistemi

**Adım 3: Güvenlik**
- Şifre oluşturma (güçlü şifre kontrolü)
- Şifre tekrarı
- Şifre güçlülük göstergesi
- Şifre görünürlük toggle

**Adım 4: Profil Bilgileri**
- Biyografi (max 500 karakter)
- Doğum tarihi seçimi (18+ kontrolü)
- Cinsiyet seçimi (Erkek/Kadın/Diğer)
- İlgi alanları (en az 3 seçim)
- Letterboxd profil linki (opsiyonel)

**Adım 5: Film Tercihleri**
- En az 5 film/dizi seçimi
- TMDB entegrasyonu ile arama
- Film/dizi kartları ile seçim
- Favori filmlerin otomatik kaydı

**Özel Özellikler:**
- Email doğrulama sistemi (kayıt sonrası email gönderilir)
- Pending profile data (email doğrulanana kadar AsyncStorage'da tutulur)
- Email doğrulandıktan sonra profil otomatik tamamlanır

---

### **3. 🔐 Login Screen (Giriş Ekranı)**
**Amaç**: Mevcut kullanıcıların giriş yapması

**Özellikler:**
- E-posta ve şifre ile giriş
- Şifre görünürlük toggle
- Email doğrulama kontrolü
- Email doğrulama linki yeniden gönderme
- Pending profile data tamamlama (ilk girişte)

**Güvenlik:**
- Email doğrulanmamış kullanıcılar otomatik çıkış yaptırılır
- Email doğrulama zorunludur

---

### **4. 🎬 Watch Screen (İzle ve Keşfet)**
**Amaç**: Film/dizi keşfetme ve izlemeye başlama

**Ana Bölümler:**

#### **A. Şu An İzlenenler (Gerçek Zamanlı)**
- Tüm kullanıcıların şu anda izlediği içerikler
- Canlı gösterge (kırmızı nokta animasyonu)
- İzleyici sayısı ve profil avatarları
- Film/Dizi filtreleme (Tümü/Filmler/Diziler)
- Her 10 saniyede otomatik güncelleme
- Real-time listener'lar

#### **B. Arama Sistemi**
- Film ve dizi arama
- Kategori filtreleme (Tümü/Filmler/Diziler)
- 500ms debounce ile performanslı arama
- TMDB API entegrasyonu
- 20 sonuç gösterimi

#### **C. İçerik Kategorileri**
1. **Popüler Filmler**: En popüler filmler (sayfalama ile)
2. **En Yüksek Puan Alan Filmler**: Top rated filmler
3. **Popüler Diziler**: En popüler TV dizileri
4. **En Yüksek Puan Alan Diziler**: Top rated diziler

**Film Kartı Özellikleri:**
- Poster görseli
- Başlık ve yıl
- Tür bilgisi
- IMDB puanı
- Detay modal'ına tıklama

**Film Detay Modal:**
- Tam film/dizi bilgileri
- "İzle" butonu (currentlyWatching'e ekler)
- "Favorilere Ekle" butonu
- "İzledim" işaretleme
- Film açıklaması, oyuncular, türler

**Özel Özellikler:**
- Pull-to-refresh
- Sonsuz scroll (pagination)
- Loading states
- Empty states

---

### **5. ❤️ Match Screen (Gerçek Zamanlı Eşleşme)**
**Amaç**: Şu anda aynı filmi izleyen kişilerle eşleşme

**Çalışma Mantığı:**
1. Kullanıcının şu an izlediği film alınır
2. Aynı filmi izleyen diğer kullanıcılar bulunur
3. Match score hesaplanır (ortak film sayısına göre)
4. Kullanıcı kartları gösterilir
5. Swipe ile beğen/geç

**Eşleşme Algoritması:**
```typescript
matchScore = (ortak_film_sayısı / toplam_film) * bonus_çarpan
bonus_çarpan = min(ortak_film_sayısı / 3, 2) // Max 2x
Minimum score: 0.3
```

**Kullanıcı Kartı Özellikleri:**
- **Fotoğraf Galerisi**: Çoklu fotoğraf (swipe ile geçiş)
- **Temel Bilgiler**: İsim, yaş, kullanıcı adı, biyografi
- **İlgi Alanları**: Tag'ler halinde gösterim
- **Favoriler Sekmesi**: Kullanıcının favori filmleri (Film/Dizi filtresi ile)
- **İzlenenler Sekmesi**: Kullanıcının izlediği içerikler
- **Film Kartları**: Horizontal scroll ile film gösterimi
- **Swipe Animasyonları**: Sağa kaydır = Beğen, Sola kaydır = Geç

**Swipe Mekaniği:**
- PanResponder ile gesture kontrolü
- Rotasyon animasyonu
- Like/Nope overlay göstergeleri
- Smooth animasyonlar
- 120px threshold ile tetikleme

**Eşleşme Sistemi:**
- Sağa kaydır → `likedUsers` listesine eklenir
- Karşılıklı beğeni kontrolü
- Match oluşursa → `matches` listesine eklenir
- Bildirim gösterilir: "🎉 Eşleşme!"

**Özel Durumlar:**
- Şu anda izlenen film yoksa → Uyarı mesajı
- Eşleşme bulunamazsa → Bilgilendirme
- Tüm kartlar görüldüyse → "Yenile" butonu

---

### **6. ⭐ Discover Screen (Senin İçin)**
**Amaç**: Geçmiş izleme geçmişine göre öneriler

**Çalışma Mantığı:**
1. Kullanıcının izlediği tüm filmler alınır
2. Diğer kullanıcıların izledikleri ile karşılaştırılır
3. Ortak izlenen filmler bulunur
4. Match score hesaplanır
5. Yüksek skorlu kullanıcılar gösterilir

**Eşleşme Algoritması:**
```typescript
matchScore = (ortak_film_sayısı / toplam_film) * bonus_çarpan
bonus_çarpan = min(ortak_film_sayısı / 10, 1.5) // Max 1.5x
Minimum score: 0.2
```

**Kullanıcı Kartı Özellikleri:**
- Profil fotoğrafları
- İsim, yaş, konum
- Biyografi
- **Ortak İzlenen Filmler**: İki kullanıcının birlikte izlediği filmler
- İlgi alanları
- Swipe mekaniği (Match Screen ile aynı)

**Özel Özellikler:**
- Pull-to-refresh
- Ortak film sayısı gösterimi
- Film thumbnail'ları
- Empty states

---

### **7. 👍 Liked Screen (Beğeniler)**
**Amaç**: Beğenilen kullanıcıları görüntüleme ve yönetme

**İki Sekme:**

#### **A. Beğendiklerim**
- Kullanıcının beğendiği tüm kullanıcılar
- Henüz match olmamışlar
- Grid layout ile gösterim
- Kullanıcı kartları (fotoğraf, isim, yaş, bio)

#### **B. Beni Beğenenler**
- Kullanıcıyı beğenen ama henüz match olmamış kullanıcılar
- Swipeable modal ile detaylı görüntüleme
- Swipe ile beğen/geç
- Match oluşturma imkanı

**Swipeable Like Card Modal:**
- Tam ekran kullanıcı kartı
- Çoklu fotoğraf gösterimi
- Swipe ile beğen/geç
- Match oluşursa otomatik mesaj ekranına yönlendirme

**Özel Özellikler:**
- Pull-to-refresh
- Match olanlar otomatik filtrelenir
- Empty states
- Sayı göstergeleri

---

### **8. 💬 Message Screen (Mesajlaşma)**
**Amaç**: Eşleşen kullanıcılarla mesajlaşma

**Ana Özellikler:**

#### **A. Eşleşmeler Listesi**
- Tüm eşleşmelerin listesi
- Profil fotoğrafı
- Kullanıcı adı
- Online durumu (🟢/⚫)
- Son mesaj zamanı
- Okunmamış mesaj sayısı (badge)
- Eşleşme zamanı

#### **B. Chat Ekranı**
- Mesaj baloncukları (kendi/karşı taraf)
- Mesaj zamanı gösterimi
- Klavye uyumlu layout
- Mesaj gönderme butonu
- Online durumu gösterimi

**Not**: Mesajlaşma backend entegrasyonu hazırlanmıştır. UI tamamen hazırdır, Firestore subcollection yapısı ile entegre edilebilir.

**Özel Özellikler:**
- Pull-to-refresh
- Empty states
- Loading states

---

### **9. 👤 Profile Screen (Profil)**
**Amaç**: Kullanıcı profilini görüntüleme ve düzenleme

**Ana Bölümler:**

#### **A. Tinder Tarzı Fotoğraf Galerisi**
- Büyük fotoğraf gösterimi (ekranın %55'i)
- Çoklu fotoğraf (swipe ile geçiş)
- Fotoğraf nokta göstergeleri
- Sol/sağ tap alanları ile geçiş
- Fotoğraf düzenleme butonu

#### **B. Kullanıcı Bilgileri**
- İsim (düzenlenebilir)
- Kullanıcı adı (düzenlenebilir, benzersizlik kontrolü ile)
- Biyografi (düzenlenebilir)
- Yaş bilgisi

#### **C. Film/Dizi Koleksiyonları**
**İki Sekme:**
1. **Favoriler**: Kullanıcının favori filmleri/dizileri
2. **İzlenenler**: Kullanıcının izlediği içerikler

**Filtreler:**
- Tümü
- Filmler
- Diziler

**Grid Layout:**
- 3 sütunlu grid
- Film posterleri
- Başlık, yıl, puan, tür bilgisi
- Film detay modal'ına tıklama

#### **D. Fotoğraf Galerisi Düzenleyici**
- Drag & drop ile sıralama
- Fotoğraf ekleme (max 6)
- Fotoğraf silme
- Sıralama numaraları
- Gelişmiş animasyonlar
- Floating photo efekti

#### **E. Hesap Yönetimi**
- Hesabı Sil (tüm verileri siler)
- Çıkış Yap

**Düzenleme Modalları:**
- İsim düzenleme
- Kullanıcı adı düzenleme (real-time validation)
- Biyografi düzenleme

**Özel Özellikler:**
- Pull-to-refresh
- Loading states
- Empty states
- Retry mekanizması

---

## 🔄 GERÇEK ZAMANLI SİSTEMLER

### **1. RealTimeWatchingService**
**Amaç**: Kullanıcıların şu anda izlediği içerikleri gerçek zamanlı takip

**Özellikler:**
- Firestore listener'ları ile anlık güncelleme
- Tüm kullanıcıların izleme durumunu toplama
- Film bazında gruplama
- İzleyici sayısı ve profil bilgileri
- Her 10 saniyede otomatik refresh

**Veri Yapısı:**
```typescript
users/{userId}/currentlyWatching[]
{
  movieId: 123,
  movieTitle: "Inception",
  moviePoster: "/path.jpg",
  media_type: "movie",
  startedAt: Timestamp,
  progress: 0
}
```

### **2. CurrentMovieBar**
**Amaç**: Üst bar'da şu anda izlenen filmi gösterme

**Özellikler:**
- Her 5 saniyede güncelleme
- Pulse animasyonu (canlı gösterge)
- Film poster ve başlık
- Watch ekranına yönlendirme
- Event-based güncelleme

---

## 🎯 EŞLEŞME ALGORİTMALARI

### **1. Currently Watching Matches (Match Screen)**
**Hedef**: Şu anda aynı filmi izleyenler

**Algoritma:**
1. Kullanıcının `currentlyWatching` listesi alınır
2. Tüm kullanıcıların `currentlyWatching` listeleri kontrol edilir
3. Ortak film ID'leri bulunur
4. Match score hesaplanır:
   ```
   score = (ortak_film_sayısı / toplam_film) * bonus
   bonus = min(ortak_film_sayısı / 3, 2)
   ```
5. Minimum score: 0.3
6. Sonuçlar randomize edilir

### **2. Watched Content Matches (Discover Screen)**
**Hedef**: Geçmiş izleme geçmişine göre uyumlu kişiler

**Algoritma:**
1. Kullanıcının `watched` listesi alınır
2. Diğer kullanıcıların `watched` listeleri ile karşılaştırılır
3. Ortak izlenen filmler bulunur
4. Match score hesaplanır:
   ```
   score = (ortak_film_sayısı / toplam_film) * bonus
   bonus = min(ortak_film_sayısı / 10, 1.5)
   ```
5. Minimum score: 0.2
6. Yüksek skorlu kullanıcılar önceliklendirilir

---

## 💾 VERİ YAPISI (Firestore)

### **Kullanıcı Dokümanı:**
```typescript
users/{userId}
{
  // Temel Bilgiler
  uid: string
  email: string
  firstName: string
  lastName?: string
  username: string
  
  // Profil
  profilePhotos: string[]  // Firebase Storage URL'leri
  bio?: string
  age?: number
  gender?: string
  interests?: string[]
  location?: string
  
  // Film Verileri
  currentlyWatching: [{
    movieId: number
    movieTitle: string
    moviePoster: string
    media_type: "movie" | "tv"
    startedAt: Timestamp
    progress: number
  }]
  
  watched: [{
    id: number
    title: string
    poster_path: string
    watchedAt: Timestamp
    rating?: number
  }]
  
  favorites: [{
    id: number
    title: string
    poster_path: string
    addedAt: Timestamp
  }]
  
  // Sosyal
  social: {
    likedUsers: string[]  // Beğenilen kullanıcı ID'leri
    matches: [{
      matchedUserId: string
      matchedAt: Timestamp
      matchedMovie?: string
    }]
  }
  
  // Durum
  isOnline: boolean
  lastActivity: Timestamp
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

## 🎨 KULLANICI ARAYÜZÜ (UI/UX)

### **Tasarım Prensipleri:**
- **Dark Theme**: Siyah arka plan (#000) ile modern görünüm
- **Accent Color**: Kırmızı (#E50914) - Netflix tarzı
- **Animasyonlar**: Smooth ve performanslı
- **Responsive**: Farklı ekran boyutlarına uyumlu
- **Accessibility**: Erişilebilir kontroller

### **Animasyonlar:**
- Fade-in/fade-out
- Scale animasyonları
- Rotasyon efektleri
- Pulse animasyonları
- Swipe animasyonları
- Loading skeletons

### **Bileşenler:**
- AnimatedButton
- AnimatedCard
- AnimatedText
- MovieCard
- SkeletonLoader
- ToastComponents
- ErrorBoundary

---

## 🔐 GÜVENLİK ÖZELLİKLERİ

### **Authentication:**
- Firebase Authentication
- Email/Password ile giriş
- Email doğrulama zorunluluğu
- Güvenli şifre gereksinimleri
- Otomatik session yönetimi

### **Data Security:**
- Firestore Security Rules
- Kullanıcılar sadece kendi verilerini düzenleyebilir
- Fotoğraflar Firebase Storage'da güvenli saklanır
- Hassas veriler şifrelenir

### **Validation:**
- Email format kontrolü
- Şifre güçlülük kontrolü
- Kullanıcı adı benzersizlik kontrolü
- Email benzersizlik kontrolü
- Real-time validation feedback

---

## 📊 PERFORMANS OPTİMİZASYONLARI

### **1. Caching:**
- TMDB verileri cache'lenir
- Kullanıcı verileri cache'lenir
- React Query ile otomatik cache yönetimi

### **2. Lazy Loading:**
- Sayfalama (pagination) ile içerik yükleme
- Image lazy loading
- Component lazy loading

### **3. Debouncing:**
- Arama sorguları 500ms debounce
- Username/email validation debounce

### **4. Batch Operations:**
- Toplu kullanıcı verisi çekme
- Promise.all ile paralel işlemler

---

## 🚀 ÖZEL ÖZELLİKLER

### **1. Drag & Drop Fotoğraf Sıralama**
- Profil fotoğraflarını sürükleyerek sıralama
- Gelişmiş animasyonlar
- Magnet efekti
- Haptic feedback

### **2. Real-Time Updates**
- Şu anda izlenenler anlık güncellenir
- Firestore listener'ları
- Event-based updates

### **3. Swipe Mekaniği**
- Tinder tarzı swipe
- Smooth animasyonlar
- Like/Nope göstergeleri
- Gesture recognition

### **4. Multi-Photo Gallery**
- Çoklu fotoğraf gösterimi
- Swipe ile geçiş
- Nokta göstergeleri
- Tap areas

### **5. Film Detay Modal**
- TMDB'den detaylı bilgi
- İzle/Favori/İzledim butonları
- Film açıklaması
- Oyuncular ve türler

---

## 📱 KULLANIM SENARYOLARI

### **Senaryo 1: Yeni Kullanıcı Kaydı**
1. Welcome ekranından "Hesap Oluştur"
2. 5 adımlı kayıt süreci
3. Email doğrulama linki gönderilir
4. Email doğrulandıktan sonra giriş yap
5. Profil otomatik tamamlanır

### **Senaryo 2: Gerçek Zamanlı Eşleşme**
1. Watch ekranından bir film seç
2. "İzle" butonuna bas
3. Match ekranına git
4. Aynı filmi izleyenleri gör
5. Swipe ile beğen/geç
6. Karşılıklı beğeni → Eşleşme!

### **Senaryo 3: Geçmiş Bazlı Eşleşme**
1. Birkaç film izle (Watch → İzle)
2. Discover (Senin İçin) ekranına git
3. Benzer filmler izleyenleri gör
4. Swipe ile değerlendir
5. Beğen → Liked listesine eklenir

### **Senaryo 4: Mesajlaşma**
1. Match oluştur (karşılıklı beğeni)
2. Message ekranına git
3. Eşleşen kişiyi seç
4. Mesaj yaz ve gönder
5. Chat geçmişi görüntüle

---

## 🎬 FİLM/DİZİ YÖNETİMİ

### **Film Durumları:**
1. **Currently Watching**: Şu anda izleniyor
2. **Watched**: İzlenmiş
3. **Favorite**: Favorilere eklenmiş
4. **Watchlist**: İzlenecekler listesi (gelecek özellik)

### **Film İşlemleri:**
- **İzle**: `currentlyWatching` listesine ekler
- **Favorilere Ekle**: `favorites` listesine ekler
- **İzledim**: `watched` listesine ekler, `currentlyWatching`'den çıkarır
- **Favorilerden Çıkar**: `favorites` listesinden siler

---

## 🔔 BİLDİRİM SİSTEMİ

### **Bildirim Türleri:**
1. **Eşleşme Bildirimi**: "🎉 Eşleşme!" (karşılıklı beğeni)
2. **Email Doğrulama**: Email doğrulama linki gönderildi
3. **Yeni Beğeni**: Birisi sizi beğendi (gelecek özellik)
4. **Yeni Mesaj**: Yeni mesaj geldi (gelecek özellik)

---

## 🛠️ GELİŞTİRME ÖZELLİKLERİ

### **Error Handling:**
- Global error handler
- Error boundary
- Try-catch blokları
- Kullanıcı dostu hata mesajları

### **Logging:**
- Console logging
- Performance monitoring
- Error tracking

### **Testing:**
- Component testleri (hazırlanabilir)
- Integration testleri (hazırlanabilir)

---

## 📈 İSTATİSTİKLER VE ANALİTİK

### **Kullanıcı İstatistikleri:**
- Favori sayısı
- İzlenen içerik sayısı
- Eşleşme sayısı
- Beğeni sayısı

### **Analytics Events:**
- Film izleme başlatma
- Eşleşme oluşturma
- Mesaj gönderme
- Profil görüntüleme

---

## 🎯 GELECEK ÖZELLİKLER (Roadmap)

1. **Gerçek Mesajlaşma**: Firestore subcollection ile tam entegrasyon
2. **Push Notifications**: Yeni eşleşme ve mesaj bildirimleri
3. **Gelişmiş Filtreler**: Yaş, konum, cinsiyet filtreleri
4. **Super Like**: Özel beğeni özelliği
5. **Reklamlar**: Monetizasyon (gelecek)
6. **Premium Üyelik**: Ekstra özellikler (gelecek)
7. **Video Profil**: Kısa video profiller
8. **Sosyal Paylaşım**: Profil paylaşma

---

## 🐛 BİLİNEN SINIRLAMALAR

1. **Mesajlaşma**: UI hazır, backend entegrasyonu gerekiyor
2. **Push Notifications**: Henüz implement edilmedi
3. **Offline Mode**: Sınırlı destek
4. **Video Streaming**: Film/dizi oynatma yok (sadece takip)

---

## 📝 SONUÇ

WMatch, film ve dizi zevklerine göre insanları bir araya getiren, modern ve kullanıcı dostu bir sosyal eşleşme uygulamasıdır. Gerçek zamanlı eşleşme sistemi, gelişmiş swipe mekaniği ve kapsamlı profil yönetimi ile kullanıcılara benzersiz bir deneyim sunar.

**Ana Güçlü Yönler:**
- ✅ Gerçek zamanlı eşleşme sistemi
- ✅ Profesyonel UI/UX
- ✅ Güvenli authentication
- ✅ Performanslı veri yönetimi
- ✅ Kapsamlı profil sistemi
- ✅ Modern animasyonlar

**Teknik Mükemmellik:**
- ✅ TypeScript ile tip güvenliği
- ✅ Modüler servis mimarisi
- ✅ Error handling
- ✅ Performance optimizasyonları
- ✅ Clean code principles

Uygulama production-ready durumda ve kullanıcıların film/dizi zevklerine göre sosyal bağlantılar kurmasını sağlamak için tasarlanmıştır.

