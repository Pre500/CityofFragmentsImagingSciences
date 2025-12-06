const uploadInput = document.getElementById("imageUpload");
const textInput = document.getElementById("userText");
const addBtn = document.getElementById("addBtn");
const canvas = document.getElementById("canvas");

let scrapbook = [];

// Check if Firebase is available
const useFirebase = typeof firebase !== 'undefined' && firebase.apps.length > 0;

// Save to localStorage as fallback
function saveLocal() {
    localStorage.setItem("scrapbookPage", JSON.stringify(scrapbook));
}

// Load from Firestore
async function loadFromFirebase() {
    if (!useFirebase) return;
    
    try {
        const snapshot = await db.collection('scrapbook').orderBy('timestamp', 'desc').get();
        snapshot.forEach(doc => {
            const data = doc.data();
            data.firestoreId = doc.id;
            createEntry(data, false);
        });
    } catch (error) {
        console.error("Error loading from Firebase:", error);
        // Fallback to localStorage
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

    if (useFirebase) {
        try {
            // Upload image to Firebase Storage
            const storageRef = storage.ref(`scrapbook/${entry.id}_${file.name}`);
            const snapshot = await storageRef.put(file);
            const imageUrl = await snapshot.ref.getDownloadURL();
            
            entry.image = imageUrl;
            entry.storagePath = `scrapbook/${entry.id}_${file.name}`;
            
            // Save to Firestore
            const docRef = await db.collection('scrapbook').add(entry);
            entry.firestoreId = docRef.id;
            
            createEntry(entry, false);
            scrapbook.push(entry);
        } catch (error) {
            console.error("Error uploading to Firebase:", error);
            alert("Failed to upload. Using local storage.");
            
            // Fallback to local storage
            const reader = new FileReader();
            reader.onload = () => {
                entry.image = reader.result;
                createEntry(entry);
            };
            reader.readAsDataURL(file);
        }
    } else {
        // Use localStorage if Firebase not available
        const reader = new FileReader();
        reader.onload = () => {
            entry.image = reader.result;
            createEntry(entry);
        };
        reader.readAsDataURL(file);
    }

    // Re-enable button and reset form
    addBtn.disabled = false;
    addBtn.textContent = "✨ Add to Scrapbook";
    uploadInput.value = "";
    textInput.value = "";
});

// Load existing scrapbook entries on page load
if (useFirebase) {
    loadFromFirebase();
} else {
    loadFromLocal();
}
