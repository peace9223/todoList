import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";

/*
  =========================================
  FIREBASE CONFIGURATION (실시간 동기화 설정)
  =========================================
  1. https://console.firebase.google.com/ 에 접속합니다.
  2. 구글 로그인 후 [프로젝트 만들기]를 클릭해 새 프로젝트를 생성합니다.
  3. 좌측 메뉴에서 [빌드] -> [Realtime Database]를 클릭하고 '데이터베이스 만들기'를 누릅니다.
     이때, 규칙은 "테스트 모드(Test Mode)"로 시작하도록 선택합니다.
  4. 좌측 상단의 톱니바퀴 -> [프로젝트 설정]으로 이동하여 아래쪽의 [</> (웹 앱 추가)] 버튼을 누릅니다.
  5. 앱 등록을 완료하면 나타나는 "firebaseConfig" 항목 안의 값들을
     아래 빈칸에 그대로 복사해서 붙여넣기 하시면 실시간 동기화가 활성화됩니다!
*/
const firebaseConfig = {
    apiKey: "",             // 예: "AIzaSyCxV2-..."
    authDomain: "",         // 예: "my-todo-app.firebaseapp.com"
    databaseURL: "",        // 예: "https://my-todo-app-default-rtdb.firebaseio.com"
    projectId: "",          // 예: "my-todo-app"
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};

// Check if Firebase is configured by user
const isFirebaseEnabled = firebaseConfig.apiKey !== "";

let db = null;
let roomRef = null;

// Shareable URL Logic: Generate or Read Room ID from URL
function getRoomId() {
    const urlParams = new URLSearchParams(window.location.search);
    let room = urlParams.get('room');

    // If no room specified, create a new random room
    if (!room) {
        room = Math.random().toString(36).substring(2, 10);
        // Silently update the URL so the user can easily copy it
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + '?room=' + room;
        window.history.pushState({ path: newUrl }, '', newUrl);
    }
    return room;
}

const currentRoom = getRoomId();

// App State
let tasks = [];

// DOM Elements
const taskInput = document.getElementById('task-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const taskCount = document.getElementById('task-count');
const statusBadge = document.getElementById('status-badge');
const shareBtn = document.getElementById('share-btn');
const toast = document.getElementById('toast');

// Initialize State
if (isFirebaseEnabled) {
    try {
        const app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        roomRef = ref(db, 'rooms/' + currentRoom + '/tasks');

        // Listen for Realtime Changes from Firebase
        onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            // Data in Firebase might come as an object, map it to an array
            tasks = data ? Object.values(data) : [];
            renderTasks();
        });

        // Update UI
        statusBadge.textContent = 'Cloud Sync';
        statusBadge.className = 'badge cloud';
        statusBadge.title = "Connected to Firebase Realtime Database. Real-time sync enabled.";
    } catch (e) {
        console.error("Firebase Initialization Error. Check your configuration.", e);
        fallbackToLocalStorage();
    }
} else {
    fallbackToLocalStorage();
}

function fallbackToLocalStorage() {
    statusBadge.textContent = 'Local Mode';
    statusBadge.className = 'badge local';
    statusBadge.title = "Firebase is NOT configured yet. Data is saved locally.";

    // Load from local storage
    const localData = localStorage.getItem('tasks_' + currentRoom);
    if (localData) {
        tasks = JSON.parse(localData);
    }
    renderTasks();
}

// ---------------------------
// CORE DATA FUNCTIONS
// ---------------------------
function saveTasks() {
    if (isFirebaseEnabled && roomRef) {
        // Save to Firebase (Convert Array back to Object where keys are task IDs)
        const tasksObj = {};
        tasks.forEach(t => tasksObj[t.id] = t);
        set(roomRef, tasksObj);
    } else {
        // Save to LocalStorage
        localStorage.setItem('tasks_' + currentRoom, JSON.stringify(tasks));
    }
}

function addTask(text) {
    if (!text.trim()) return;

    const newTask = {
        id: Date.now().toString(),
        text: text,
        completed: false
    };

    // Add to top of list
    tasks.unshift(newTask);

    saveTasks();

    // If local, we must re-render manually. Firebase's onValue does it automatically.
    if (!isFirebaseEnabled) {
        renderTasks();
    }

    taskInput.value = '';
}

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        if (!isFirebaseEnabled) renderTasks();
    }
}

function deleteTask(id, element) {
    // Add fade out animation
    element.classList.add('fadeOut');

    setTimeout(() => {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        if (!isFirebaseEnabled) renderTasks();
    }, 280); // Wait for the transition to finish
}

// ---------------------------
// RENDER UI
// ---------------------------
function renderTasks() {
    todoList.innerHTML = '';

    let activeTasks = 0;

    tasks.forEach(task => {
        if (!task.completed) activeTasks++;

        const li = document.createElement('li');
        li.className = `todo-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;

        li.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${task.completed ? 'checked' : ''}>
            <span class="todo-text">${escapeHTML(task.text)}</span>
            <button class="delete-btn" aria-label="Delete Task"><i class="ph ph-trash"></i></button>
        `;

        // Setup Event Listeners within generated elements
        const checkbox = li.querySelector('.todo-checkbox');
        checkbox.addEventListener('change', () => toggleTask(task.id));

        const delBtn = li.querySelector('.delete-btn');
        delBtn.addEventListener('click', () => deleteTask(task.id, li));

        todoList.appendChild(li);
    });

    taskCount.textContent = activeTasks;
}

// Security function to prevent Cross-Site Scripting (XSS)
function escapeHTML(str) {
    const p = document.createElement("p");
    p.appendChild(document.createTextNode(str));
    return p.innerHTML;
}

// ---------------------------
// EVENT LISTENERS
// ---------------------------
addBtn.addEventListener('click', () => {
    addTask(taskInput.value);
});

taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask(taskInput.value);
    }
});

// Share Action (Copy URL)
shareBtn.addEventListener('click', () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000); // Hide toast
    }).catch(err => {
        console.error("Could not copy text: ", err);
    });
});
