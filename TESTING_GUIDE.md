# Testing Guide - User View Navigation Implementation

## ✅ Testing Checklist

### Prerequisites
- ✓ Backend server running on http://localhost:5000
- ✓ Frontend server running on http://localhost:8081
- ✓ Logged in as impaired user: `janedoe@fake.com` / `password`

### 1. **User View UI Test**
Navigate to the User view (http://localhost:8081 → Login → User view)

**Expected UI:**
- ✅ Three equal sections:
  - 🔴 **Emergency** (Red background, top)
  - 🔵 **Navigate** (Blue background, middle)
  - ⚪ **Recent Places** (Gray background, bottom)
- ✅ Status indicator at top showing "Ready" or "Active"
- ✅ Back to Home button at bottom

### 2. **Voice Feedback Test**
**Single Tap/Press each zone:**
- ✅ Emergency: Should log "Emergency help - Double tap to activate emergency alert"
- ✅ Navigate: Should log "Start navigation - Double tap to speak your destination"
- ✅ Recent Places: Should log "Recent places - Double tap to hear your frequent destinations"

**Note:** On web, check browser console for voice logs. On native, you'll hear actual speech.

### 3. **Navigation Simulation Test**
**Long press the Navigate zone:**

**Expected Flow:**
1. ✅ Voice announces: "Where would you like to navigate to?"
2. ✅ After 2s: "Where are you starting from?"
3. ✅ After 2s more: "Starting navigation from [from] to [to]"
4. ✅ Modal popup appears with:
   - Gray overlay (70% opacity)
   - White popup card showing destination
   - Direction instructions
5. ✅ Every 2 seconds, new direction announced:
   - "Turn left in X steps"
   - "Turn right in X steps"
   - "Continue straight in X steps"
6. ✅ After 15-35 steps total: "You have arrived at [destination]"
7. ✅ Modal auto-closes after 3 seconds
8. ✅ Status returns to "Ready"

### 4. **Backend Integration Test**
**During Navigation:**

**Check Backend Logs:**
```
POST /api/user/current_trip - Should see trip created
```

**After Arrival:**
```
DELETE /api/user/current_trip - Should see trip ended
POST /api/user/past_trip - Should see destination saved
```

**Verify Database:**
- ✅ Trip appears in `past_trips` table
- ✅ `destination_location` matches where you "navigated" to

### 5. **Stop Navigation Test**
**During active navigation:**
- ✅ Press "Stop Navigation" button
- ✅ Should announce: "Stopping navigation"
- ✅ Modal closes
- ✅ Status changes to "Ready"
- ✅ Backend receives DELETE request to end trip

### 6. **Voice Commands Test** (Auto-listening)
When view loads, voice assistant starts automatically.

**Simulated Commands (check console for detection):**
- ✅ "What is my most recent location" → Should announce last destination
- ✅ "Emergency contact" → Should announce primary contact info
- ✅ "Navigate" → Starts navigation flow
- ✅ "Stop" (during nav) → Ends navigation

### 7. **Recent Places Test**
**Long press Recent Places zone:**
- ✅ Should announce recent destinations from database
- ✅ If no trips: "You have no recent places"
- ✅ If trips exist: Lists up to 3 most recent

### 8. **Emergency Test**
**Long press Emergency zone:**
- ✅ Announces: "Emergency alert activated. Contacting emergency contacts."
- ✅ Alert popup appears: "Emergency contacts have been notified"

---

## 🔍 Debugging Tips

### Console Logs to Monitor:
```javascript
[Voice]: <message>              // All voice announcements
Starting navigation from...     // Navigation start
turn left in 5 steps           // Direction announcements
You have arrived at...         // Navigation complete
```

### Backend Endpoints Used:
- `GET /api/user/past_trip` - Fetch recent locations
- `POST /api/user/current_trip` - Start navigation
- `DELETE /api/user/current_trip` - End navigation
- `POST /api/user/past_trip` - Save completed trip
- `GET /api/user/emergency_contact` - Get emergency contacts

### Common Issues:

**"Unable to resolve expo-speech"**
- ✅ **Fixed**: Code now uses platform-specific speech (Web Speech API for web, expo-speech for native)

**No voice on web:**
- ✅ Check browser console for `[Voice]` logs
- ✅ Some browsers require user interaction before allowing speech
- ✅ Try Chrome/Edge for best Web Speech API support

**Backend 401 Unauthorized:**
- ✅ Make sure you're logged in as impaired user
- ✅ Check session cookie is being sent

**Navigation doesn't start:**
- ✅ Check backend is running on port 5000
- ✅ Verify you're logged in as impaired user (caretakers can't navigate)
- ✅ Check console for any fetch errors

---

## 📱 Platform-Specific Notes

### Web (http://localhost:8081)
- Voice uses Web Speech API (check console for fallback)
- Long press = click and hold for ~500ms
- All features functional via browser

### Mobile (Expo Go)
- Scan QR code from Expo server
- Voice uses native expo-speech module
- Touch gestures work naturally
- Requires actual device with microphone for full experience

---

## 🎯 Success Criteria

All tests pass when:
- ✅ UI matches Figma design (3 colored zones)
- ✅ Voice feedback on all interactions
- ✅ Navigation simulation runs smoothly (15-35 steps)
- ✅ Backend API calls succeed (trip CRUD operations)
- ✅ Recent locations display correctly
- ✅ Stop button and voice command both work
- ✅ Grayed overlay appears during navigation
- ✅ Trips save to database automatically

---

## 📝 Next Steps

After successful testing, you can:
1. **Add real voice recognition** instead of simulated input
2. **Integrate with camera/object detection** during navigation
3. **Add more voice commands** (e.g., "where am I", "call emergency")
4. **Customize navigation patterns** (use actual GPS/routing data)
5. **Enhance UI** with animations and haptic feedback
6. **Add caretaker notifications** during navigation

---

## 🐛 Report Issues

If you encounter any issues:
1. Check browser console for errors
2. Check backend terminal for API errors  
3. Verify you're using the impaired user account
4. Ensure both servers are running
5. Clear browser cache and reload

Enjoy testing! 🚀
