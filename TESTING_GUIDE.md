# Movie Tinder (MWatch) - Testing Guide

## 🚀 Quick Start

### Running the App:
```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm start

# Run on Android
npm run android

# Run on iOS  
npm run ios
```

## 🧪 Testing Checklist

### 1. Authentication Flow
- [ ] Open app → See Welcome screen
- [ ] Register with email/password
- [ ] Receive verification email
- [ ] Verify email
- [ ] Login successfully
- [ ] App remembers login state

### 2. Watch Screen
- [ ] See currently watching users
- [ ] Search for movies/shows
- [ ] Filter by Movies/TV/All
- [ ] View trending content
- [ ] Click on a movie → Modal opens
- [ ] Start watching a movie
- [ ] Add movie to favorites
- [ ] Mark movie as watched
- [ ] Pull to refresh
- [ ] Scroll through categories

### 3. Match Screen
- [ ] Start watching a movie (from Watch screen)
- [ ] See users watching the same movie
- [ ] Swipe left to pass
- [ ] Swipe right to like
- [ ] See swipe animations
- [ ] Navigate through user photos
- [ ] View user profile details
- [ ] See common movie highlighted
- [ ] Get match notification on mutual like
- [ ] See "no more matches" when done

### 4. Discover Screen (Senin İçin)
- [ ] See recommended users based on watch history
- [ ] Swipe cards left/right
- [ ] View user profiles
- [ ] See common movies displayed
- [ ] Like users
- [ ] Pass on users
- [ ] Pull to refresh for new recommendations
- [ ] See progress indicator

### 5. Liked Screen (Beğeni)
- [ ] View all liked users
- [ ] Filter: All/Matched/Pending
- [ ] See match badges on matched users
- [ ] See online status
- [ ] Click on user → See details
- [ ] Pull to refresh

### 6. Message Screen
- [ ] View all matches
- [ ] See last message preview
- [ ] See time stamps
- [ ] See online status
- [ ] Click on match → Open chat
- [ ] Send messages
- [ ] See message bubbles (own vs theirs)
- [ ] Back to chat list
- [ ] Pull to refresh

### 7. Profile Screen
- [ ] View your profile
- [ ] See profile photo
- [ ] See stats (favorites, watched, matches, likes)
- [ ] See interests
- [ ] Click edit profile button
- [ ] Click settings items
- [ ] Click logout
- [ ] Confirm logout dialog
- [ ] Pull to refresh

### 8. Navigation
- [ ] Switch between all 6 tabs
- [ ] See active tab highlighted in red
- [ ] Tab icons scale when active
- [ ] Smooth transitions
- [ ] Current movie bar visible (when watching)

## 🎯 Key User Flows

### Flow 1: Find and Match with Someone Watching the Same Movie
1. Go to **Watch** tab
2. Search for a popular movie (e.g., "Inception")
3. Click movie card → Click "İzle" (Watch)
4. Go to **Match** tab
5. See users watching the same movie
6. Swipe right on someone you like
7. If they liked you too → Get match notification
8. Go to **Message** tab to chat

### Flow 2: Discover and Match Based on Watch History
1. Watch several movies (mark as watched)
2. Go to **Senin İçin** tab
3. See recommended users with common interests
4. Swipe right on interesting profiles
5. Go to **Beğeni** tab
6. Check "Eşleşenler" filter for mutual matches
7. Go to **Message** to start chatting

### Flow 3: Browse and Like Users
1. Go to **Watch** tab
2. Start watching a movie
3. Go to **Match** tab
4. Browse users watching the same content
5. Like multiple users
6. Go to **Beğeni** tab
7. See all liked users
8. Wait for them to like back

## 🐛 Common Issues and Solutions

### Issue: "No matches found"
**Solution:** Make sure you have started watching a movie first. Go to Watch screen → Find a movie → Click "İzle"

### Issue: "Henüz öneri yok" in Discover
**Solution:** Watch more movies to get better recommendations. Mark at least 3-5 movies as watched.

### Issue: Photos not loading
**Solution:** Check internet connection. The app uses TMDB API which requires internet.

### Issue: Can't send messages
**Solution:** This is expected - messaging UI is complete but backend integration is pending. It will show "Mesajlaşma özelliği yakında eklenecek!" alert.

### Issue: Login not persisting
**Solution:** Make sure you verified your email. Unverified users are automatically logged out.

## 📊 Expected Behavior

### Matching Algorithm:
- **Match Screen**: Shows only users watching the SAME movie/show RIGHT NOW
- **Discover Screen**: Shows users based on common watched history
- **Match Score**: Higher for more common content
- **Sorting**: Randomized (Tinder-style) to prevent bias

### Content Loading:
- All content comes from TMDB API
- Turkish language priority
- Categories auto-load 10 items initially
- Search returns up to 20 results
- Pull-to-refresh gets fresh data

### Real-time Features:
- Currently watching status updates every 30 seconds
- Match notifications are instant
- Online/offline status is real-time (when implemented)

## 🎨 UI/UX Validation

### Visual Checks:
- [ ] Dark theme throughout (#000 background)
- [ ] Red accent color (#E50914)
- [ ] Smooth animations
- [ ] No layout shifts
- [ ] Consistent spacing
- [ ] Readable text (white on dark)
- [ ] Icons properly sized
- [ ] Cards have shadows/depth

### Interaction Checks:
- [ ] Buttons respond to touch
- [ ] Swipes feel natural
- [ ] Scrolling is smooth
- [ ] Modals slide up nicely
- [ ] Pull-to-refresh works
- [ ] Active states visible
- [ ] Loading indicators show

## 🔐 Security Checks

- [ ] Email verification required
- [ ] Passwords are secure (Firebase handles)
- [ ] User data is private
- [ ] No unauthorized access to other profiles
- [ ] Logout clears session

## 📱 Device Testing

### Test on:
- [ ] Android phone
- [ ] iOS phone (if available)
- [ ] Different screen sizes
- [ ] Different Android versions
- [ ] Tablet (if available)

### Performance:
- [ ] App launches quickly (< 3 seconds)
- [ ] Screens load fast
- [ ] No lag during swipes
- [ ] Smooth scrolling
- [ ] Low memory usage
- [ ] No crashes

## 🎬 Demo Scenarios

### Scenario 1: New User Onboarding
1. Register new account
2. Verify email
3. Login
4. Browse Watch screen
5. Start watching a movie
6. Find matches
7. Like someone
8. Check Beğeni screen

### Scenario 2: Active User
1. Login
2. Check messages
3. Watch new content
4. Match with new users
5. Update profile
6. Logout

### Scenario 3: Content Discovery
1. Search for favorite movie
2. Mark as watched
3. Add to favorites
4. See recommendations
5. Match with similar users

## ✅ Quality Criteria

### MVP Ready if:
- ✅ All screens load without crashes
- ✅ Authentication works
- ✅ Can watch movies
- ✅ Matching works (both real-time and historical)
- ✅ Swipe gestures are smooth
- ✅ Profile displays correctly
- ✅ Navigation works seamlessly
- ✅ UI is polished and professional

### Not Required for MVP (Future):
- ❌ Actual message sending (UI ready)
- ❌ Image upload (UI ready)
- ❌ Push notifications
- ❌ Video calls
- ❌ Advanced filters

## 📝 Feedback Collection

When testing, note:
1. Any crashes or errors
2. Confusing UI elements
3. Slow loading screens
4. Unclear user flows
5. Missing features
6. Design inconsistencies

## 🎉 Success Metrics

The app is working correctly if:
- Users can register and login
- Movies can be searched and watched
- Matching algorithm finds relevant users
- Swipe interactions feel smooth
- Profile displays user information
- No major bugs or crashes
- UI is attractive and professional

---

## 💡 Tips for Best Testing

1. **Test with real data**: Don't just test with one user
2. **Test edge cases**: Empty states, no internet, etc.
3. **Test on real device**: Emulator ≠ real device
4. **Test full flows**: Don't just test individual features
5. **Test performance**: Not just functionality

---

**Happy Testing! 🎬❤️**

If you find any issues, check:
1. Console logs (React Native debugger)
2. Firestore console (for data)
3. Network tab (for API calls)
4. This guide for expected behavior




