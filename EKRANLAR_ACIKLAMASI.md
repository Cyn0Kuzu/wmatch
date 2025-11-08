# 📱 WMatch - Ekranlar ve Kullanım Amaçları

## 🎯 GENEL BAKIŞ

WMatch uygulaması **6 ana ekran** (bottom tab), **3 authentication ekranı** ve **4 yardımcı ekran** içerir. Her ekranın belirli bir amacı ve kullanıcı akışındaki rolü vardır.

---

## 📊 HIZLI REFERANS

### **ANA EKRANLAR (Alt Menü)**
1. **🎬 Watch** → Film keşfet, izlemeye başla
2. **❤️ Match** → Aynı filmi izleyenlerle eşleş
3. **⭐ Senin İçin** → Geçmiş izlemelere göre öneriler
4. **👍 Beğeni** → Beğendiklerim / Beni beğenenler
5. **💬 Mesaj** → Eşleşenlerle mesajlaş
6. **👤 Profil** → Profil yönetimi

### **AUTHENTICATION**
7. **🏠 Welcome** → İlk karşılama
8. **📝 Register** → Yeni kayıt (5 adım)
9. **🔐 Login** → Giriş yap

### **YARDIMCI EKRANLAR**
10. **⚙️ Settings** → Ayarlar (gelecek)
11. **✏️ EditProfile** → Profil düzenle
12. **👥 FollowList** → Takip listesi (gelecek)
13. **🏠 Home** → Ana sayfa (kullanılmıyor)

---

## 🎯 GENEL BAKIŞ

---

## 🏠 ANA EKRANLAR (Bottom Tab Navigation)

### **1. 🎬 WATCH EKRANI (İzle ve Keşfet)**

**📍 Konum:** Alt menü - Sol başta (🎬 ikonu)

**🎯 AMAÇ:**
Film ve dizi keşfetme, arama yapma ve **izlemeye başlama** ekranıdır. Bu ekran, eşleşme sisteminin başlangıç noktasıdır.

**🔍 NE İÇİN KULLANILIR:**

1. **Film/Dizi Keşfetme**
   - Popüler filmleri görüntüleme
   - En yüksek puanlı içerikleri keşfetme
   - Trend içerikleri görme

2. **Arama Yapma**
   - Belirli bir film/dizi arama
   - Kategori filtreleme (Film/Dizi/Tümü)
   - TMDB veritabanından gerçek veriler

3. **İzlemeye Başlama (KRİTİK)**
   - Bir film/dizi seçip "İzle" butonuna basma
   - Bu işlem `currentlyWatching` listesine ekler
   - **Match ekranında görünmek için gerekli!**

4. **Gerçek Zamanlı İzleme Takibi**
   - Şu anda kimlerin ne izlediğini görme
   - Canlı gösterge ile anlık güncellemeler
   - İzleyici sayısı ve profil avatarları

**📊 EKRAN İÇERİĞİ:**

```
┌─────────────────────────────────┐
│  🔴 Şu An İzlenenler (Canlı)   │
│  [Film1] [Film2] [Film3] ...   │
├─────────────────────────────────┤
│  🔍 Film/Dizi Ara...            │
│  [Tümü] [Filmler] [Diziler]    │
├─────────────────────────────────┤
│  🎬 Popüler Filmler             │
│  [Film1] [Film2] [Film3] ...   │
├─────────────────────────────────┤
│  🏆 En Yüksek Puanlı Filmler    │
│  [Film1] [Film2] [Film3] ...   │
├─────────────────────────────────┤
│  📺 Popüler Diziler             │
│  [Dizi1] [Dizi2] [Dizi3] ...   │
└─────────────────────────────────┘
```

**🔄 KULLANICI AKIŞI:**

```
Watch Ekranı
    ↓
Film/Dizi Seç
    ↓
"İzle" Butonuna Bas
    ↓
currentlyWatching[] güncellenir
    ↓
Match Ekranına Git → Eşleşmeler görünür!
```

**💡 ÖNEMLİ NOTLAR:**
- ✅ İzlemeye başlamadan Match ekranında kimse görünmez
- ✅ "İzle" butonuna basmak zorunludur
- ✅ Her 10 saniyede otomatik güncelleme
- ✅ Film detay modal'ından da "İzle" yapılabilir

---

### **2. ❤️ MATCH EKRANI (Gerçek Zamanlı Eşleşme)**

**📍 Konum:** Alt menü - İkinci sırada (❤️ ikonu)

**🎯 AMAÇ:**
**Şu anda aynı filmi izleyen kişilerle eşleşme** ekranıdır. Tinder tarzı swipe mekaniği ile kullanıcıları beğenme/geçme.

**🔍 NE İÇİN KULLANILIR:**

1. **Gerçek Zamanlı Eşleşme**
   - Şu anda aynı filmi izleyenleri görme
   - Anlık eşleşme fırsatları
   - Canlı izleme durumuna göre öneriler

2. **Kullanıcı Değerlendirme**
   - Swipe ile beğen/geç
   - Sağa kaydır = Beğen
   - Sola kaydır = Geç

3. **Profil İnceleme**
   - Kullanıcı fotoğrafları
   - Favori filmleri
   - İzlediği içerikler
   - İlgi alanları

4. **Eşleşme Oluşturma**
   - Karşılıklı beğeni → Otomatik eşleşme
   - Eşleşme bildirimi
   - Mesaj ekranına yönlendirme

**📊 EKRAN İÇERİĞİ:**

```
┌─────────────────────────────────┐
│                                 │
│      [KULLANICI KARTI]         │
│                                 │
│  ┌─────────────────────────┐   │
│  │   Fotoğraf Galerisi     │   │
│  │   (Swipe ile geçiş)     │   │
│  └─────────────────────────┘   │
│                                 │
│  İsim, Yaş                      │
│  @kullaniciadi                  │
│  Biyografi...                   │
│                                 │
│  🎯 İlgi Alanları               │
│  [Aksiyon] [Dram] [Komedi]      │
│                                 │
│  ⭐ Favoriler | 👀 İzlenenler  │
│  [Film1] [Film2] [Film3] ...  │
│                                 │
└─────────────────────────────────┘
│  1 / 10                         │
└─────────────────────────────────┘
```

**🔄 KULLANICI AKIŞI:**

```
Match Ekranı
    ↓
Kullanıcı Kartı Görüntüle
    ↓
Swipe Sağa (Beğen) veya Sola (Geç)
    ↓
Beğenilirse → likedUsers[] eklenir
    ↓
Karşılıklı Beğeni Kontrolü
    ↓
Match Varsa → matches[] eklenir
    ↓
🎉 Eşleşme Bildirimi
    ↓
Message Ekranında Görünür
```

**💡 ÖNEMLİ NOTLAR:**
- ⚠️ Watch ekranından "İzle" yapmadan bu ekran boş görünür
- ✅ Sadece aynı filmi izleyenler gösterilir
- ✅ Match score algoritması ile sıralama
- ✅ Tüm kartlar görüldüyse "Yenile" butonu

**🎴 KART ÖZELLİKLERİ:**
- Çoklu fotoğraf (swipe ile)
- Favoriler sekmesi
- İzlenenler sekmesi
- Film/Dizi filtresi
- İlgi alanları
- Swipe animasyonları

---

### **3. ⭐ SENİN İÇİN EKRANI (Discover - Geçmiş Bazlı Öneriler)**

**📍 Konum:** Alt menü - Üçüncü sırada (⭐ ikonu)

**🎯 AMAÇ:**
**Geçmiş izleme geçmişine göre benzer zevklere sahip kişileri bulma** ekranıdır. Match ekranından farklı olarak, şu anda izlenen değil, **daha önce izlenen** filmlere göre eşleşme yapar.

**🔍 NE İÇİN KULLANILIR:**

1. **Geçmiş Bazlı Eşleşme**
   - İzlediğiniz filmlere göre öneriler
   - Benzer zevklere sahip kişiler
   - Ortak izlenen film sayısı

2. **Uzun Vadeli Eşleşme**
   - Şu anda izlemiyorsanız bile eşleşme
   - Film geçmişine göre uyumluluk
   - Daha kalıcı bağlantılar

3. **Ortak İlgi Alanları**
   - Aynı filmleri izleyenleri görme
   - Film zevklerine göre uyumluluk
   - Detaylı profil inceleme

**📊 EKRAN İÇERİĞİ:**

```
┌─────────────────────────────────┐
│  Senin İçin                     │
│  İzlediğiniz filmlere göre      │
│  öneriler                       │
├─────────────────────────────────┤
│                                 │
│      [KULLANICI KARTI]         │
│                                 │
│  ┌─────────────────────────┐   │
│  │   Fotoğraf Galerisi     │   │
│  └─────────────────────────┘   │
│                                 │
│  İsim, Yaş                      │
│  📍 Konum                       │
│  Biyografi...                   │
│                                 │
│  🎬 Aynı Film/Dizileri          │
│  İzlediniz                      │
│  [Film1] [Film2] [Film3] ...  │
│  "5 ortak içerik"               │
│                                 │
│  🎯 İlgi Alanları               │
│  [Aksiyon] [Dram] [Komedi]      │
│                                 │
└─────────────────────────────────┘
│  [✕ Geç]    [♥ Beğen]          │
│  1 / 15                         │
└─────────────────────────────────┘
```

**🔄 KULLANICI AKIŞI:**

```
Discover Ekranı
    ↓
Geçmiş izleme geçmişi analiz edilir
    ↓
Benzer filmler izleyenler bulunur
    ↓
Match score hesaplanır
    ↓
Kullanıcı kartları gösterilir
    ↓
Swipe ile beğen/geç
    ↓
Beğenilirse → likedUsers[] eklenir
```

**💡 ÖNEMLİ NOTLAR:**
- ✅ Watch ekranından film izlemeden de çalışır
- ✅ Geçmiş izleme geçmişine göre öneriler
- ✅ Ortak film sayısı gösterilir
- ✅ Match ekranından farklı algoritma

**🆚 MATCH EKRANI İLE FARKLAR:**

| Özellik | Match Ekranı | Discover Ekranı |
|---------|-------------|-----------------|
| **Veri Kaynağı** | Şu anda izlenenler | Geçmiş izlenenler |
| **Zamanlama** | Gerçek zamanlı | Geçmiş bazlı |
| **Eşleşme Tipi** | Anlık | Uzun vadeli |
| **Gereksinim** | İzlemeye başlamalı | Film izlemiş olmalı |

---

### **4. 👍 BEĞENİ EKRANI (Liked Screen)**

**📍 Konum:** Alt menü - Dördüncü sırada (👍 ikonu)

**🎯 AMAÇ:**
Beğenilen kullanıcıları görüntüleme, yönetme ve **"Beni Beğenenler"** ile etkileşim kurma ekranıdır.

**🔍 NE İÇİN KULLANILIR:**

1. **Beğendiklerimi Görüntüleme**
   - Sağa kaydırdığınız (beğendiğiniz) kullanıcılar
   - Henüz match olmamışlar
   - Beklemede olan beğeniler

2. **Beni Beğenenleri Görüntüleme**
   - Sizi beğenen ama henüz match olmamış kullanıcılar
   - Swipeable modal ile detaylı görüntüleme
   - Hemen eşleşme fırsatı

3. **Eşleşme Oluşturma**
   - "Beni Beğenenler"den birini beğenme
   - Anında eşleşme oluşturma
   - Mesaj ekranına yönlendirme

**📊 EKRAN İÇERİĞİ:**

```
┌─────────────────────────────────┐
│  Beğeniler                      │
│  5 kullanıcı beğendiniz         │
├─────────────────────────────────┤
│  [💝 Beğendiklerim] [❤️ Beni   │
│   Beğenenler]                   │
│  ────────────────               │
├─────────────────────────────────┤
│  ┌─────┐  ┌─────┐  ┌─────┐     │
│  │Foto1│  │Foto2│  │Foto3│     │
│  │İsim │  │İsim │  │İsim │     │
│  │Yaş  │  │Yaş  │  │Yaş  │     │
│  └─────┘  └─────┘  └─────┘     │
│                                 │
│  [Grid Layout - 2 sütun]        │
│                                 │
└─────────────────────────────────┘
```

**🔄 KULLANICI AKIŞI:**

#### **Beğendiklerim Sekmesi:**
```
Beğendiklerim
    ↓
Beğendiğiniz kullanıcılar listesi
    ↓
Kart'a tıkla
    ↓
"Henüz sizi beğenmedi" mesajı
    ↓
Beklemede kalır
```

#### **Beni Beğenenler Sekmesi:**
```
Beni Beğenenler
    ↓
Sizi beğenen kullanıcılar listesi
    ↓
Kart'a tıkla
    ↓
Swipeable Modal açılır
    ↓
Swipe Sağa (Beğen)
    ↓
🎉 Anında Eşleşme!
    ↓
Message Ekranında Görünür
```

**💡 ÖNEMLİ NOTLAR:**
- ✅ İki sekme: "Beğendiklerim" ve "Beni Beğenenler"
- ✅ Match olanlar otomatik filtrelenir
- ✅ "Beni Beğenenler"den beğenince anında match
- ✅ Swipeable modal ile detaylı görüntüleme

**🎴 KART ÖZELLİKLERİ:**
- Profil fotoğrafı
- İsim ve yaş
- Biyografi (kısa)
- Grid layout (2 sütun)
- Tıklanabilir kartlar

---

### **5. 💬 MESAJ EKRANI (Message Screen)**

**📍 Konum:** Alt menü - Beşinci sırada (💬 ikonu)

**🎯 AMAÇ:**
**Eşleşen kullanıcılarla mesajlaşma** ekranıdır. Sadece match olan kullanıcılarla iletişim kurulabilir.

**🔍 NE İÇİN KULLANILIR:**

1. **Eşleşmeleri Görüntüleme**
   - Tüm eşleşmelerin listesi
   - Profil fotoğrafları
   - Online durumu
   - Son mesaj zamanı

2. **Mesajlaşma**
   - Chat ekranı
   - Mesaj gönderme/alma
   - Mesaj geçmişi
   - Okundu bilgisi (gelecek)

3. **Chat Yönetimi**
   - Chat listesi
   - Son mesaj önizlemesi
   - Okunmamış mesaj sayısı
   - Online/offline durumu

**📊 EKRAN İÇERİĞİ:**

#### **Chat Listesi:**
```
┌─────────────────────────────────┐
│  💕 Eşleşmeler & Mesajlar      │
│  3 eşleşme                     │
├─────────────────────────────────┤
│  ┌──┐  Kullanıcı 1     2dk    │
│  │👤│  Son mesaj...           │
│  └──┘  🟢 Çevrimiçi           │
├─────────────────────────────────┤
│  ┌──┐  Kullanıcı 2     5dk    │
│  │👤│  Son mesaj...           │
│  └──┘  ⚫ Çevrimdışı          │
└─────────────────────────────────┘
```

#### **Chat Ekranı:**
```
┌─────────────────────────────────┐
│  ← Kullanıcı 1  🟢 Çevrimiçi   │
├─────────────────────────────────┤
│                                 │
│  [Karşı Taraf Mesajı]           │
│  "Merhaba!"           2dk       │
│                                 │
│              [Kendi Mesajım]    │
│              "Selam!"   1dk     │
│                                 │
├─────────────────────────────────┤
│  [Mesaj yazın...]        [➤]   │
└─────────────────────────────────┘
```

**🔄 KULLANICI AKIŞI:**

```
Message Ekranı
    ↓
Eşleşmeler listesi görüntülenir
    ↓
Bir chat'e tıkla
    ↓
Chat ekranı açılır
    ↓
Mesaj yaz ve gönder
    ↓
Real-time mesaj alma (gelecek)
```

**💡 ÖNEMLİ NOTLAR:**
- ⚠️ Sadece match olan kullanıcılarla mesajlaşılabilir
- ✅ UI tamamen hazır
- ⚠️ Backend entegrasyonu yapılması gerekiyor
- ✅ Online durumu gösterilir

**📝 MEVCUT DURUM:**
- ✅ Chat listesi çalışıyor
- ✅ Chat ekranı UI hazır
- ⚠️ Mesaj gönderme mock (gerçek değil)
- ⚠️ Real-time mesaj alma yok
- ⚠️ Backend entegrasyonu gerekli

---

### **6. 👤 PROFİL EKRANI (Profile Screen)**

**📍 Konum:** Alt menü - Sağ başta (👤 ikonu)

**🎯 AMAÇ:**
Kendi profilini görüntüleme, düzenleme ve hesap yönetimi ekranıdır.

**🔍 NE İÇİN KULLANILIR:**

1. **Profil Görüntüleme**
   - Kendi fotoğraflarını görme
   - Profil bilgilerini kontrol etme
   - Favori ve izlenen filmleri görme

2. **Profil Düzenleme**
   - İsim düzenleme
   - Kullanıcı adı değiştirme (benzersizlik kontrolü)
   - Biyografi güncelleme
   - Fotoğraf ekleme/silme/sıralama

3. **Film Koleksiyonları**
   - Favori filmleri görüntüleme
   - İzlenen filmleri görüntüleme
   - Film/Dizi filtresi

4. **Hesap Yönetimi**
   - Çıkış yapma
   - Hesabı silme

**📊 EKRAN İÇERİĞİ:**

```
┌─────────────────────────────────┐
│  ┌─────────────────────────┐   │
│  │   BÜYÜK FOTOĞRAF        │   │
│  │   (Tinder tarzı)        │   │
│  │   [• • •] (noktalar)    │   │
│  └─────────────────────────┘   │
├─────────────────────────────────┤
│  İsim, Yaş              [✎]   │
│  @kullaniciadi          [✎]    │
│  Biyografi...           [✎]    │
├─────────────────────────────────┤
│  [⭐ Favoriler] [👀 İzlenenler]│
│  [Tümü] [Filmler] [Diziler]    │
├─────────────────────────────────┤
│  ┌──┐  ┌──┐  ┌──┐              │
│  │🎬│  │🎬│  │🎬│              │
│  └──┘  └──┘  └──┘              │
│  [Film Grid - 3 sütun]         │
├─────────────────────────────────┤
│  [🗑️ Hesabı Sil] [🚪 Çıkış Yap]│
└─────────────────────────────────┘
```

**🔄 KULLANICI AKIŞI:**

#### **Profil Düzenleme:**
```
Profil Ekranı
    ↓
Düzenleme ikonuna tıkla (✎)
    ↓
Modal açılır
    ↓
Bilgiyi düzenle
    ↓
Kaydet
    ↓
Firestore güncellenir
```

#### **Fotoğraf Yönetimi:**
```
Fotoğraf Düzenle Butonuna Tıkla
    ↓
Galeri Editörü Açılır
    ↓
Fotoğraf ekle/sil/sırala
    ↓
Drag & drop ile sıralama
    ↓
Kaydet
```

**💡 ÖNEMLİ NOTLAR:**
- ✅ Tinder tarzı büyük fotoğraf gösterimi
- ✅ Çoklu fotoğraf (max 6)
- ✅ Drag & drop sıralama
- ✅ Real-time validation (kullanıcı adı)
- ✅ Film koleksiyonları görüntüleme

**🎴 ÖZEL ÖZELLİKLER:**
- Fotoğraf galerisi düzenleyici
- Film grid görünümü
- Filtreleme (Film/Dizi/Tümü)
- Hesap silme (tüm verileri siler)

---

## 🔧 YARDIMCI EKRANLAR (Stack Navigation)

### **10. ⚙️ SETTINGS EKRANI (Ayarlar)**

**📍 Konum:** Profile Stack içinde (gelecek özellik)

**🎯 AMAÇ:**
Uygulama ayarlarını yönetme ekranı (henüz tam implement edilmemiş olabilir).

**🔍 NE İÇİN KULLANILIR:**
- Bildirim ayarları
- Gizlilik ayarları
- Uygulama tercihleri
- Dil seçimi (gelecek)

---

### **11. ✏️ EDIT PROFILE EKRANI (Profil Düzenle)**

**📍 Konum:** Profile Stack içinde

**🎯 AMAÇ:**
Profil bilgilerini detaylı düzenleme ekranı (Profile ekranından açılır).

**🔍 NE İÇİN KULLANILIR:**
- Profil bilgilerini düzenleme
- Fotoğraf yönetimi
- Film tercihlerini güncelleme

---

### **12. 👥 FOLLOW LIST EKRANI (Takip Listesi)**

**📍 Konum:** Profile Stack içinde

**🎯 AMAÇ:**
Takip edilen ve takipçileri görüntüleme ekranı (gelecek özellik).

**🔍 NE İÇİN KULLANILIR:**
- Takipçileri görüntüleme
- Takip edilenleri görüntüleme
- Takip/takipten çıkma

---

### **13. 🏠 HOME EKRANI (Ana Sayfa)**

**📍 Konum:** Stack içinde (şu anda kullanılmıyor)

**🎯 AMAÇ:**
Ana sayfa ekranı (Discover ekranı kullanılıyor, bu ekran yedek).

**🔍 NOT:**
- Şu anda Discover ekranı kullanılıyor
- Bu ekran gelecekte dashboard olarak kullanılabilir

---

## 🔐 AUTHENTICATION EKRANLARI

### **14. 🏠 WELCOME EKRANI (Hoş Geldiniz)**

**📍 Konum:** Uygulama başlangıcı (auth stack)

**🎯 AMAÇ:**
Uygulamaya ilk giriş noktası. Kullanıcıları karşılar ve kayıt/giriş seçenekleri sunar.

**🔍 NE İÇİN KULLANILIR:**

1. **İlk Açılış**
   - Uygulama ilk açıldığında
   - Kullanıcı giriş yapmamışsa
   - Marka tanıtımı

2. **Yönlendirme**
   - Yeni kullanıcılar → Register
   - Mevcut kullanıcılar → Login

**📊 EKRAN İÇERİĞİ:**

```
┌─────────────────────────────────┐
│                                 │
│         [LOGO]                  │
│                                 │
│  Film zevkine göre eşleş        │
│                                 │
│  Binlerce film ve dizi          │
│  arasından geçin. Akıllı        │
│  öneri sistemimizle mükemmel    │
│  eşleşmenizi bulun.             │
│                                 │
│  [Hesap Oluştur]                │
│  [Giriş Yap]                    │
│                                 │
└─────────────────────────────────┘
```

**🔄 KULLANICI AKIŞI:**

```
Uygulama Açılışı
    ↓
Auth Kontrolü
    ↓
Giriş Yapılmamışsa
    ↓
Welcome Ekranı
    ↓
"Hesap Oluştur" → Register
"Giriş Yap" → Login
```

---

### **15. 📝 REGISTER EKRANI (Kayıt)**

**📍 Konum:** Auth stack - Welcome'dan sonra

**🎯 AMAÇ:**
Yeni kullanıcı kaydı. 5 adımlı süreç ile kapsamlı profil oluşturma.

**🔍 NE İÇİN KULLANILIR:**

1. **Yeni Hesap Oluşturma**
   - İlk kez kullanıcı olanlar
   - 5 adımlı kayıt süreci
   - Email doğrulama

2. **Profil Oluşturma**
   - Kişisel bilgiler
   - Fotoğraflar
   - Film tercihleri

**📊 ADIMLAR:**

```
Adım 1: Kişisel Bilgiler
  - Ad, Soyad
  - Kullanıcı adı (benzersizlik kontrolü)
  - E-posta (benzersizlik kontrolü)

Adım 2: Profil Fotoğrafları
  - En az 3, max 7 fotoğraf
  - Drag & drop sıralama
  - 3:4 oranı

Adım 3: Güvenlik
  - Şifre oluşturma
  - Şifre güçlülük kontrolü
  - Şifre tekrarı

Adım 4: Profil Bilgileri
  - Biyografi
  - Doğum tarihi (18+)
  - Cinsiyet
  - İlgi alanları (min 3)
  - Letterboxd linki (opsiyonel)

Adım 5: Film Tercihleri
  - En az 5 film/dizi seçimi
  - TMDB arama
  - Favorilere otomatik ekleme
```

**🔄 KULLANICI AKIŞI:**

```
Register Ekranı
    ↓
5 Adım Doldurulur
    ↓
"Kayıt Ol" Butonuna Bas
    ↓
Firebase Auth User Oluşturulur
    ↓
Email Doğrulama Linki Gönderilir
    ↓
Profil Bilgileri AsyncStorage'a Kaydedilir
    ↓
Kullanıcı Çıkış Yaptırılır
    ↓
Email Doğrulandıktan Sonra Giriş Yap
    ↓
Profil Otomatik Tamamlanır
```

**💡 ÖNEMLİ NOTLAR:**
- ✅ Email doğrulama zorunlu
- ✅ Pending profile data sistemi
- ✅ Real-time validation
- ✅ Benzersizlik kontrolleri

---

### **16. 🔐 LOGIN EKRANI (Giriş)**

**📍 Konum:** Auth stack - Welcome'dan sonra

**🎯 AMAÇ:**
Mevcut kullanıcıların giriş yapması ve email doğrulama kontrolü.

**🔍 NE İÇİN KULLANILIR:**

1. **Giriş Yapma**
   - Email ve şifre ile
   - Email doğrulama kontrolü
   - Session yönetimi

2. **Email Doğrulama**
   - Doğrulanmamış kullanıcıları engelleme
   - Email doğrulama linki yeniden gönderme
   - Otomatik kontrol

3. **Profil Tamamlama**
   - İlk girişte pending profile data
   - Fotoğrafları yükleme
   - Profil bilgilerini kaydetme

**📊 EKRAN İÇERİĞİ:**

```
┌─────────────────────────────────┐
│  Giriş Yap                      │
│  Hesabınıza giriş yapın         │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │ E-posta                 │   │
│  │ [___________________]   │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │ Şifre                   │   │
│  │ [___________________] ○ │   │
│  └─────────────────────────┘   │
│  [Giriş Yap]                    │
├─────────────────────────────────┤
│  Hesabınız yok mu? Kayıt Ol    │
└─────────────────────────────────┘
```

**🔄 KULLANICI AKIŞI:**

```
Login Ekranı
    ↓
Email ve Şifre Gir
    ↓
"Giriş Yap" Butonuna Bas
    ↓
Email Doğrulama Kontrolü
    ↓
Doğrulanmışsa → Ana Ekranlar
Doğrulanmamışsa → Email Doğrulama Uyarısı
    ↓
Pending Profile Data Kontrolü
    ↓
Varsa → Profil Tamamlanır
```

**💡 ÖNEMLİ NOTLAR:**
- ✅ Email doğrulama zorunlu
- ✅ Doğrulanmamış kullanıcılar otomatik çıkış
- ✅ Pending profile data tamamlama
- ✅ Email doğrulama linki yeniden gönderme

---

## 🔄 EKRAN AKIŞ DİYAGRAMI

```
                    ┌─────────────┐
                    │   Welcome   │
                    └──────┬──────┘
                           │
            ┌──────────────┴──────────────┐
            │                             │
      ┌─────▼─────┐               ┌──────▼─────┐
      │  Register │               │   Login    │
      └─────┬─────┘               └──────┬──────┘
            │                             │
            └──────────────┬──────────────┘
                           │
                    ┌──────▼──────┐
                    │ Auth Check  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Main Tabs  │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌──────▼──────┐    ┌─────▼─────┐
   │  Watch  │      │    Match    │    │ Discover  │
   └────┬────┘      └──────┬──────┘    └─────┬─────┘
        │                  │                  │
        │            ┌─────▼─────┐            │
        │            │   Liked   │            │
        │            └─────┬─────┘            │
        │                  │                  │
        │            ┌─────▼─────┐            │
        │            │  Message  │            │
        │            └─────┬─────┘            │
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │   Profile   │
                    └─────────────┘
```

---

## 📋 EKRAN KULLANIM ÖZET TABLOSU

### **ANA EKRANLAR (Bottom Tab)**

| Ekran | İkon | Amaç | Ne Zaman Kullanılır | Kritik Özellik |
|-------|------|------|---------------------|----------------|
| **Watch** | 🎬 | Film keşfetme ve izlemeye başlama | Film arama, izlemeye başlama | "İzle" butonu → Match ekranı için gerekli |
| **Match** | ❤️ | Gerçek zamanlı eşleşme | Aynı filmi izleyenlerle eşleşme | Swipe mekaniği, anlık eşleşme |
| **Discover** | ⭐ | Geçmiş bazlı öneriler | Benzer zevklere sahip kişiler | Ortak film sayısı, uzun vadeli |
| **Liked** | 👍 | Beğenileri yönetme | Beğendiklerim/Beni beğenenler | Swipeable modal, anında match |
| **Message** | 💬 | Eşleşenlerle mesajlaşma | Match olanlarla iletişim | Chat UI hazır, backend gerekli |
| **Profile** | 👤 | Profil yönetimi | Profil düzenleme, hesap yönetimi | Fotoğraf galerisi, film koleksiyonları |

### **AUTHENTICATION EKRANLARI**

| Ekran | Amaç | Ne Zaman Kullanılır | Kritik Özellik |
|-------|------|---------------------|----------------|
| **Welcome** | İlk karşılama | Uygulama açılışı | Yönlendirme |
| **Register** | Yeni kayıt | İlk kez kullanıcı | 5 adımlı süreç, email doğrulama |
| **Login** | Giriş | Mevcut kullanıcı | Email doğrulama kontrolü |

### **YARDIMCI EKRANLAR (Stack)**

| Ekran | Amaç | Ne Zaman Kullanılır | Durum |
|-------|------|---------------------|-------|
| **Settings** | Ayarlar | Uygulama ayarları | Gelecek özellik |
| **EditProfile** | Profil düzenleme | Profil güncelleme | Profile'dan açılır |
| **FollowList** | Takip listesi | Takipçiler/takip edilenler | Gelecek özellik |
| **Home** | Ana sayfa | Dashboard | Şu anda kullanılmıyor |

---

## 🎯 KULLANIM SENARYOLARI

### **Senaryo 1: Yeni Kullanıcı - İlk Eşleşme**
```
1. Welcome → Register
2. 5 Adım Kayıt
3. Email Doğrula
4. Login
5. Watch → Film Seç → "İzle"
6. Match → Swipe → Beğen
7. Karşılıklı Beğeni → Eşleşme!
8. Message → Mesajlaş
```

### **Senaryo 2: Mevcut Kullanıcı - Günlük Kullanım**
```
1. Login
2. Watch → Yeni Film İzlemeye Başla
3. Match → Yeni Eşleşmeler Gör
4. Liked → "Beni Beğenenler" Kontrol Et
5. Message → Eşleşenlerle Mesajlaş
6. Profile → Profil Güncelle
```

### **Senaryo 3: Geçmiş Bazlı Eşleşme**
```
1. Watch → Birkaç Film İzle
2. Discover → "Senin İçin" Ekranına Git
3. Benzer Filmler İzleyenleri Gör
4. Swipe → Beğen
5. Liked → "Beğendiklerim" Kontrol Et
```

---

## 💡 ÖNEMLİ NOTLAR

### **Eşleşme İçin Gereksinimler:**
1. ✅ Watch ekranından "İzle" yapılmalı
2. ✅ Match ekranında görünmek için gerekli
3. ✅ Discover ekranı için film izlemiş olmalı

### **Mesajlaşma İçin Gereksinimler:**
1. ✅ Match olmuş olmalı (karşılıklı beğeni)
2. ✅ Message ekranında görünür
3. ⚠️ Backend entegrasyonu gerekli

### **Ekran Bağımlılıkları:**
- **Match** → **Watch** (izlemeye başlamalı)
- **Discover** → **Watch** (film izlemiş olmalı)
- **Message** → **Match** (eşleşme olmalı)
- **Liked** → **Match/Discover** (beğeni yapılmış olmalı)

---

## ✅ SONUÇ

Her ekranın belirli bir amacı ve kullanıcı akışındaki rolü vardır. Ekranlar birbirini tamamlar ve kullanıcıların film zevklerine göre sosyal bağlantılar kurmasını sağlar.

**Ana Akış:**
1. **Keşfet** (Watch) → Film bul ve izlemeye başla
2. **Eşleş** (Match/Discover) → Benzer zevklere sahip kişilerle eşleş
3. **İletişim Kur** (Message) → Eşleşenlerle mesajlaş
4. **Yönet** (Liked/Profile) → Beğenileri ve profili yönet

Bu ekranlar birlikte, kullanıcıların film/dizi zevklerine göre anlamlı bağlantılar kurmasını sağlar! 🎬❤️

---

## 🔗 EKRANLAR ARASI İLİŞKİLER

### **Bağımlılık Haritası:**

```
Watch Ekranı
    │
    ├─→ "İzle" Butonu
    │       │
    │       └─→ currentlyWatching[] güncellenir
    │               │
    │               └─→ Match Ekranı (eşleşmeler görünür)
    │
    └─→ Film İzleme
            │
            └─→ watched[] listesine eklenir
                    │
                    └─→ Discover Ekranı (öneriler görünür)

Match Ekranı
    │
    ├─→ Swipe Sağa (Beğen)
    │       │
    │       └─→ likedUsers[] eklenir
    │               │
    │               └─→ Liked Ekranı (Beğendiklerim)
    │
    └─→ Karşılıklı Beğeni
            │
            └─→ matches[] eklenir
                    │
                    └─→ Message Ekranı (mesajlaşma)

Discover Ekranı
    │
    ├─→ Swipe Sağa (Beğen)
    │       │
    │       └─→ likedUsers[] eklenir
    │
    └─→ Ortak Film Analizi
            │
            └─→ Match Score Hesaplanır

Liked Ekranı
    │
    ├─→ "Beni Beğenenler" Sekmesi
    │       │
    │       └─→ Swipe Sağa
    │               │
    │               └─→ Anında Match!
    │
    └─→ "Beğendiklerim" Sekmesi
            │
            └─→ Beklemede Olan Beğeniler

Message Ekranı
    │
    └─→ Sadece matches[] içindeki kullanıcılar
            │
            └─→ Mesajlaşma (backend gerekli)

Profile Ekranı
    │
    ├─→ Favoriler / İzlenenler
    │       │
    │       └─→ Watch Ekranından eklenenler
    │
    └─→ Profil Düzenleme
            │
            └─→ EditProfile Ekranı
```

---

## 🎯 EKRAN KULLANIM KILAVUZU

### **Yeni Kullanıcı İçin:**
1. **Welcome** → Uygulamayı keşfet
2. **Register** → Hesap oluştur (5 adım)
3. **Watch** → Film keşfet ve izlemeye başla
4. **Match** → Eşleşmeleri gör
5. **Message** → Eşleşenlerle mesajlaş

### **Günlük Kullanım:**
1. **Watch** → Yeni film izlemeye başla
2. **Match** → Yeni eşleşmeleri kontrol et
3. **Discover** → Geçmiş bazlı önerileri gör
4. **Liked** → "Beni Beğenenler" kontrol et
5. **Message** → Eşleşenlerle mesajlaş
6. **Profile** → Profil güncelle

### **Eşleşme İçin:**
1. **Watch** → Film seç → "İzle" butonuna bas
2. **Match** → Aynı filmi izleyenleri gör
3. Swipe sağa → Beğen
4. Karşılıklı beğeni → Eşleşme!

### **Mesajlaşma İçin:**
1. Match ol (karşılıklı beğeni)
2. **Message** → Eşleşmeleri gör
3. Chat'e tıkla
4. Mesaj yaz ve gönder

---

## 📝 ÖZET

**WMatch uygulaması 13 ekran içerir:**

✅ **6 Ana Ekran** (Bottom Tab) - Günlük kullanım
✅ **3 Authentication Ekranı** - Giriş/Kayıt
✅ **4 Yardımcı Ekran** (Stack) - Profil yönetimi

Her ekranın belirli bir amacı vardır ve kullanıcıların film/dizi zevklerine göre sosyal bağlantılar kurmasını sağlar.

**Ana Akış:**
1. **Keşfet** (Watch) → Film bul ve izlemeye başla
2. **Eşleş** (Match/Discover) → Benzer zevklere sahip kişilerle eşleş
3. **İletişim Kur** (Message) → Eşleşenlerle mesajlaş
4. **Yönet** (Liked/Profile) → Beğenileri ve profili yönet

🎬 **Film zevklerine göre anlamlı bağlantılar kur!** ❤️

