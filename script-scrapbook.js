const uploadInput = document.getElementById("imageUpload");
const textInput = document.getElementById("userText");
const addBtn = document.getElementById("addBtn");
const canvas = document.getElementById("canvas");

let scrapbook = JSON.parse(localStorage.getItem("scrapbookPage")) || [];

function save() {
    localStorage.setItem("scrapbookPage", JSON.stringify(scrapbook));
}

function createEntry(data, saveToStorage = true) {
    const item = document.createElement("div");
    item.className = "polaroid";
    item.style.left = data.x + "px";
    item.style.top = data.y + "px";
    item.style.setProperty("--rotation", data.rotation);

    item.innerHTML = `
        <img src="${data.image}">
        <div class="polaroid-text">${data.text || ""}</div>
    `;

    enableDrag(item, data);
    canvas.appendChild(item);

    if (saveToStorage) {
        scrapbook.push(data);
        save();
    }
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

addBtn.addEventListener("click", () => {
    const file = uploadInput.files[0];
    const text = textInput.value.trim();

    if (!file) {
        alert("Please upload an image first!");
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const entry = {
            image: reader.result,
            text,
            x: Math.random() * (window.innerWidth - 200),
            y: Math.random() * (window.innerHeight - 300),
            rotation: Math.floor(Math.random() * 10 - 5)
        };
        createEntry(entry);
        uploadInput.value = "";
        textInput.value = "";
    };
    reader.readAsDataURL(file);
});

// Load existing scrapbook entries on page load
scrapbook.forEach(data => createEntry(data, false));
