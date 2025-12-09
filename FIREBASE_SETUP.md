# Firebase Setup Instructions 

## What's Changed
- ✅ Photos now shared between all users
- ✅ Photos persist permanently in cloud storage
- ✅ Delete button appears on hover (red X)
- ✅ Real-time updates when anyone adds/deletes
- ✅ Fallback to localStorage if Firebase fails

## Setup Steps

### 1. Create Firebase Project
1. Go to https://firebase.google.com/
2. Click "Get Started" → "Add Project"
3. Name: "CityOfFragments" (or your choice)
4. Disable Google Analytics (optional)
5. Click "Create Project"

### 2. Enable Firestore Database
1. In Firebase Console, click "Firestore Database"
2. Click "Create Database"
3. Select "Start in test mode"
4. Choose a location (closest to your users)
5. Click "Enable"

### 3. Enable Firebase Storage
1. In Firebase Console, click "Storage"
2. Click "Get Started"
3. Select "Start in test mode"
4. Click "Done"

### 4. Get Your Firebase Config
1. Click gear icon (⚙️) → "Project Settings"
2. Scroll to "Your apps" section
3. Click web icon (</>)
4. Register app name: "City of Fragments Web"
5. Copy the `firebaseConfig` object

### 5. Update firebase-config.js
Open `firebase-config.js` and replace these values with your actual config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 6. Set Firebase Security Rules

#### Firestore Rules
Go to Firestore → Rules and paste:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scrapbook/{document} {
      allow read: if true;
      allow create: if true;
      allow delete: if true;
      allow update: if true;
    }
  }
}
```

#### Storage Rules
Go to Storage → Rules and paste:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /scrapbook/{allPaths=**} {
      allow read: if true;
      allow write: if true;
      allow delete: if true;
    }
  }
}
```

### 7. Deploy to GitHub
```bash
git add .
git commit -m "Add Firebase shared scrapbook functionality"
git push
```

### 8. Test
1. Wait 2-3 minutes for GitHub Pages to deploy
2. Open your site in multiple browsers/devices
3. Upload a photo in one browser
4. See it appear in all browsers!

## Important Notes

⚠️ **Test Mode Security**: The rules above allow anyone to read/write. For production:
- Implement Firebase Authentication
- Update rules to require authentication
- Add user-based permissions

## Troubleshooting

**Photos not appearing?**
- Check browser console for errors
- Verify Firebase config is correct
- Ensure Firestore and Storage are enabled
- Check security rules are published

**Still using localStorage?**
- Firebase config may be incorrect
- Check if firebase-config.js loads before script-scrapbook.js
- Open browser console to see error messages

## Cost
Firebase free tier includes:
- 1 GB storage
- 10 GB/month bandwidth
- 50K reads/day
- 20K writes/day

This should be sufficient for a small community scrapbook!
