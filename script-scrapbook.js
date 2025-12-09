const uploadInput = document.getElementById("imageUpload");
const textInput = document.getElementById("userText");
const addBtn = document.getElementById("addBtn");
const canvas = document.getElementById("canvas");

let scrapbook = [];

// Check if Firebase is available and properly configured
let useFirebase = false;
try {
    useFirebase = typeof firebase !== 'undefined' && 
                  firebase.apps.length > 0 && 
                  typeof db !== 'undefined' && 
                  typeof storage !== 'undefined';
    
    if (!useFirebase) {
        console.log("Firebase not configured, using localStorage");
    }
} catch (e) {
    console.log("Firebase error, using localStorage:", e);
    useFirebase = false;
}

// Save to localStorage as fallback
function saveLocal() {
    localStorage.setItem("scrapbookPage", JSON.stringify(scrapbook));
}

// Load from Firestore with real-time updates
function loadFromFirebase() {
    if (!useFirebase) return;
    
    try {
        // Set up real-time listener for additions and deletions
        db.collection('scrapbook').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                data.firestoreId = change.doc.id;
                
                if (change.type === 'added') {
                    // Check if entry already exists in DOM
                    const existing = document.querySelector(`.polaroid[data-id="${data.id}"]`);
                    if (!existing) {
                        createEntry(data, false);
                        scrapbook.push(data);
                    }
                }
                
                if (change.type === 'removed') {
                    // Remove from DOM
                    const element = document.querySelector(`.polaroid[data-id="${data.id}"]`);
                    if (element) {
                        element.remove();
                    }
                    // Remove from scrapbook array
                    scrapbook = scrapbook.filter(item => item.firestoreId !== change.doc.id);
                }
            });
        }, (error) => {
            console.error("Error with Firebase listener:", error);
            loadFromLocal();
        });
    } catch (error) {
        console.error("Error loading from Firebase:", error);
        loadFromLocal();
    }
}

// Load from localStorage as fallback
function loadFromLocal() {
    scrapbook = JSON.parse(localStorage.getItem("scrapbookPage")) || [];
    scrapbook.forEach(data => createEntry(data, false));
}

function createEntry(data, saveToStorage = true) {
    const item = document.createElement("div");
    item.className = "polaroid";
    item.style.left = data.x + "px";
    item.style.top = data.y + "px";
    item.style.setProperty("--rotation", data.rotation);

    // Add unique ID for deletion
    if (!data.id) {
        data.id = Date.now() + Math.random();
    }
    item.dataset.id = data.id;

    item.innerHTML = `
        <img src="${data.image}">
        <div class="polaroid-text">${data.text || ""}</div>
        <button class="delete-btn" onclick="deleteEntry('${data.id}')">✕</button>
    `;

    enableDrag(item, data);
    canvas.appendChild(item);

    if (saveToStorage) {
        scrapbook.push(data);
        save();
    }
}

async function deleteEntry(id) {
    if (!confirm("Delete this photo?")) return;
    
    // Remove from DOM
    const element = document.querySelector(`.polaroid[data-id="${id}"]`);
    if (element) {
        element.remove();
    }
    
    // Find entry to get firestoreId
    const entry = scrapbook.find(item => item.id == id);
    
    // Remove from Firebase
    if (useFirebase && entry && entry.firestoreId) {
        try {
            await db.collection('scrapbook').doc(entry.firestoreId).delete();
            
            // Delete image from Storage if exists
            if (entry.storagePath) {
                await storage.ref(entry.storagePath).delete();
            }
        } catch (error) {
            console.error("Error deleting from Firebase:", error);
        }
    }
    
    // Remove from scrapbook array
    scrapbook = scrapbook.filter(item => item.id != id);
    saveLocal();
}

function enableDrag(el, data) {
    let offsetX, offsetY;

    el.addEventListener("mousedown", (e) => {
        el.style.zIndex = Date.now();
        offsetX = e.clientX - el.offsetLeft;
        offsetY = e.clientY - el.offsetTop;

        function move(e) {
            el.style.left = (e.clientX - offsetX) + "px";
            el.style.top = (e.clientY - offsetY) + "px";
        }

        function stop() {
            document.removeEventListener("mousemove", move);
            document.removeEventListener("mouseup", stop);

            data.x = parseInt(el.style.left);
            data.y = parseInt(el.style.top);
            save();
        }

        document.addEventListener("mousemove", move);
        document.addEventListener("mouseup", stop);
    });
}

addBtn.addEventListener("click", async () => {
    const file = uploadInput.files[0];
    const text = textInput.value.trim();

    if (!file) {
        alert("Please upload an image first!");
        return;
    }

    // Disable button during upload
    addBtn.disabled = true;
    addBtn.textContent = "Uploading...";

    const entry = {
        id: Date.now() + Math.random(),
        text,
        x: Math.random() * (window.innerWidth - 200),
        y: Math.random() * (window.innerHeight - 300),
        rotation: Math.floor(Math.random() * 10 - 5),
        timestamp: Date.now()
    };

    // Function to use local storage (fast fallback)
    const useLocalStorage = () => {
        const reader = new FileReader();
        reader.onload = () => {
            entry.image = reader.result;
            createEntry(entry);
            
            // Re-enable button and reset form
            addBtn.disabled = false;
            addBtn.textContent = "✨ Add to Scrapbook";
            uploadInput.value = "";
            textInput.value = "";
        };
        reader.readAsDataURL(file);
    };

    if (useFirebase) {
        try {
            // Set a timeout to fallback to localStorage if Firebase is too slow
            const uploadTimeout = setTimeout(() => {
                console.warn("Firebase upload timeout, using localStorage");
                useLocalStorage();
            }, 5000); // 5 second timeout

            // Upload image to Firebase Storage
            const storageRef = storage.ref(`scrapbook/${entry.id}_${file.name}`);
            const snapshot = await storageRef.put(file);
            const imageUrl = await snapshot.ref.getDownloadURL();
            
            // Clear timeout if successful
            clearTimeout(uploadTimeout);
            
            entry.image = imageUrl;
            entry.storagePath = `scrapbook/${entry.id}_${file.name}`;
            
            // Save to Firestore
            const docRef = await db.collection('scrapbook').add(entry);
            entry.firestoreId = docRef.id;
            
            createEntry(entry, false);
            scrapbook.push(entry);
            
            // Re-enable button and reset form
            addBtn.disabled = false;
            addBtn.textContent = "Add to Scrapbook";
            uploadInput.value = "";
            textInput.value = "";
        } catch (error) {
            console.error("Error uploading to Firebase:", error);
            
            // Fallback to local storage
            useLocalStorage();
        }
    } else {
        // Use localStorage if Firebase not available
        useLocalStorage();
    }
});

// Load existing scrapbook entries on page load
if (useFirebase) {
    loadFromFirebase();
} else {
    loadFromLocal();
}
