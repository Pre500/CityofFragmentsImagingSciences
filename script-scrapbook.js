(() => {
    const uploadInput = document.getElementById("imageUpload");
    const textInput = document.getElementById("userText");
    const addBtn = document.getElementById("addBtn");
    const canvas = document.getElementById("canvas");

    if (!uploadInput || !textInput || !addBtn || !canvas) {
        console.warn("Scrapbook: required elements not found; skipping init");
        return;
    }

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

    function saveRemotePositions() {
        if (!useFirebase) return;
        scrapbook.forEach((item) => {
            if (item.firestoreId) {
                db.collection('scrapbook').doc(item.firestoreId).set({
                    x: item.x,
                    y: item.y,
                    text: item.text,
                    rotation: item.rotation
                }, { merge: true }).catch((err) => {
                    console.error("Error saving to Firebase:", err);
                });
            }
        });
    }

    function save() {
        saveLocal();
        saveRemotePositions();
    }

    // Load from Firestore with real-time updates
    function loadFromFirebase() {
        if (!useFirebase) return;

        try {
            db.collection('scrapbook').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    const data = change.doc.data();
                    data.firestoreId = change.doc.id;

                    if (change.type === 'added') {
                        const existing = document.querySelector(`.polaroid[data-id="${data.id}"]`);
                        if (!existing) {
                            createEntry(data, false);
                            scrapbook.push(data);
                        }
                    }

                    if (change.type === 'removed') {
                        const element = document.querySelector(`.polaroid[data-id="${data.id}"]`);
                        if (element) {
                            element.remove();
                        }
                        scrapbook = scrapbook.filter(item => item.firestoreId !== change.doc.id);
                        saveLocal();
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

        if (!data.id) {
            data.id = Date.now() + Math.random();
        }
        item.dataset.id = data.id;

        const img = document.createElement("img");
        img.src = data.image;

        const caption = document.createElement("div");
        caption.className = "polaroid-text";
        caption.textContent = data.text || "";

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "✕";
        deleteBtn.addEventListener("click", () => deleteEntry(data.id));

        item.appendChild(img);
        item.appendChild(caption);
        item.appendChild(deleteBtn);

        enableDrag(item, data);
        canvas.appendChild(item);

        if (saveToStorage) {
            scrapbook.push(data);
            save();
        }
    }

    async function deleteEntry(id) {
        if (!confirm("Delete this photo?")) return;

        const element = document.querySelector(`.polaroid[data-id="${id}"]`);
        if (element) {
            element.remove();
        }

        const entry = scrapbook.find(item => item.id == id);

        if (useFirebase && entry && entry.firestoreId) {
            try {
                await db.collection('scrapbook').doc(entry.firestoreId).delete();

                if (entry.storagePath) {
                    await storage.ref(entry.storagePath).delete();
                }
            } catch (error) {
                console.error("Error deleting from Firebase:", error);
            }
        }

        scrapbook = scrapbook.filter(item => item.id != id);
        save();
    }

    function enableDrag(el, data) {
        let offsetX, offsetY;

        el.addEventListener("mousedown", (e) => {
            el.style.zIndex = Date.now();
            offsetX = e.clientX - el.offsetLeft;
            offsetY = e.clientY - el.offsetTop;

            function move(ev) {
                el.style.left = (ev.clientX - offsetX) + "px";
                el.style.top = (ev.clientY - offsetY) + "px";
            }

            function stop() {
                document.removeEventListener("mousemove", move);
                document.removeEventListener("mouseup", stop);

                data.x = parseInt(el.style.left, 10);
                data.y = parseInt(el.style.top, 10);
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

        const useLocalStorage = () => {
            const reader = new FileReader();
            reader.onload = () => {
                entry.image = reader.result;
                createEntry(entry);

                addBtn.disabled = false;
                addBtn.textContent = "✨ Add to Scrapbook";
                uploadInput.value = "";
                textInput.value = "";
            };
            reader.readAsDataURL(file);
        };

        if (useFirebase) {
            try {
                const uploadTimeout = setTimeout(() => {
                    console.warn("Firebase upload timeout, using localStorage");
                    useLocalStorage();
                }, 5000);

                const storageRef = storage.ref(`scrapbook/${entry.id}_${file.name}`);
                const snapshot = await storageRef.put(file);
                const imageUrl = await snapshot.ref.getDownloadURL();

                clearTimeout(uploadTimeout);

                entry.image = imageUrl;
                entry.storagePath = `scrapbook/${entry.id}_${file.name}`;

                const docRef = await db.collection('scrapbook').add(entry);
                entry.firestoreId = docRef.id;

                createEntry(entry, false);
                scrapbook.push(entry);
                saveLocal();

                addBtn.disabled = false;
                addBtn.textContent = "Add to Scrapbook";
                uploadInput.value = "";
                textInput.value = "";
            } catch (error) {
                console.error("Error uploading to Firebase:", error);
                useLocalStorage();
            }
        } else {
            useLocalStorage();
        }
    });

    if (useFirebase) {
        loadFromFirebase();
    } else {
        loadFromLocal();
    }
})();
