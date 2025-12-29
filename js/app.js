const app = (() => {
    const getEl = (id) => document.getElementById(id);

    const views = {
        auth: getEl('view-auth'),
        list: getEl('view-list'),
        editor: getEl('view-editor'),
        settings: getEl('view-settings')
    };

    const ui = {
        pinArea: getEl('pin-area'),
        pinInput: getEl('pin-input'),
        listContainer: getEl('notes-list-container'),
        search: getEl('search-input'),
        installAlert: getEl('install-alert'),
        title: getEl('note-title'),
        date: getEl('note-date'),
        body: getEl('note-body'),
        imgPreview: getEl('note-image-preview'),
        camInterface: getEl('camera-interface'),
        video: getEl('video-feed'),
        canvas: getEl('camera-canvas'),
        offlineIndicator: getEl('offline-indicator')
    };

    let currentNoteId = null;
    let cameraStream = null;

    function showView(viewName) {
        if (!views[viewName]) return;
        Object.values(views).forEach(el => { if (el) el.classList.add('d-none') });
        views[viewName].classList.remove('d-none');

        const btnSettings = getEl('btn-go-settings');
        const btnBack = getEl('btn-go-list');

        if (viewName === 'list') {
            if (btnSettings) btnSettings.classList.remove('d-none');
            if (btnBack) btnBack.classList.add('d-none');
            stopCamera();
        } else if (viewName === 'editor' || viewName === 'settings') {
            if (btnSettings) btnSettings.classList.add('d-none');
            if (btnBack) btnBack.classList.remove('d-none');
        } else {
            if (btnSettings) btnSettings.classList.add('d-none');
            if (btnBack) btnBack.classList.add('d-none');
        }
    }

    const addClick = (id, fn) => {
        const el = getEl(id);
        if (el) el.addEventListener('click', fn);
    };

    addClick('btn-go-list', () => { showView('list'); loadNotes(); });
    addClick('btn-go-settings', () => showView('settings'));

    addClick('btn-auth-biometrics', async () => {
        const success = await Auth.login();
        if (success) enterApp();
        else alert('Błąd logowania.');
    });
    addClick('btn-auth-register', async () => {
        if (!window.PublicKeyCredential) return alert('Brak WebAuthn');
        const ok = await Auth.register();
        alert(ok ? 'OK' : 'Błąd');
    });
    addClick('btn-auth-pin-toggle', () => ui.pinArea.classList.remove('d-none'));
    addClick('btn-auth-pin-set', () => {
        if (ui.pinInput.value.length < 4) return alert('Za krótki PIN');
        Auth.setPin(ui.pinInput.value);
        alert('Zapisano PIN');
    });
    addClick('btn-auth-pin-login', () => {
        if (Auth.checkPin(ui.pinInput.value)) enterApp();
        else alert('Zły PIN');
    });

    function enterApp() { showView('list'); loadNotes(); }

    addClick('btn-new-note', () => {
        currentNoteId = null;
        resetEditor();
        showView('editor');
    });

    addClick('btn-full-reset', async () => {
        if (!confirm("CZY NA PEWNO? Ta operacja jest nieodwracalna.")) return;
        if (!confirm("To usunie WSZYSTKIE notatki, PIN i ustawienia biometrii. Kontynuować?")) return;

        try {
            localStorage.clear();
            await DB.clearAll();
            alert("Aplikacja została wyczyszczona. Nastąpi restart.");
            window.location.reload();
        } catch (e) {
            console.error(e);
            alert("Wystąpił błąd podczas czyszczenia danych.");
        }
    });

    addClick('btn-save', async () => {
        const now = Date.now();
        let created = now;

        if (currentNoteId) {
            const old = await DB.getNote(currentNoteId);
            if (old && old.created) created = old.created;
        }

        const note = {
            id: currentNoteId || crypto.randomUUID(),
            title: ui.title.value.trim(),
            body: ui.body.value.trim(),
            image: ui.imgPreview.src.startsWith('data:') ? ui.imgPreview.src : null,
            updated: now,
            created: created
        };

        await DB.addNote(note);
        alert('Zapisano');
        showView('list');
        loadNotes();
    });

    addClick('btn-delete', async () => {
        if (!currentNoteId) return showView('list');
        if (confirm('Usunąć?')) {
            await DB.deleteNote(currentNoteId);
            showView('list');
            loadNotes();
        }
    });

    addClick('btn-camera', async () => {
        if (cameraStream) { stopCamera(); return; }
        try {
            ui.camInterface.style.display = 'block';
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            ui.video.srcObject = cameraStream;
        } catch (e) { alert('Błąd kamery (wymagany HTTPS)'); console.error(e); }
    });

    addClick('btn-take-photo', () => {
        if (!cameraStream) return;
        ui.canvas.width = ui.video.videoWidth;
        ui.canvas.height = ui.video.videoHeight;
        ui.canvas.getContext('2d').drawImage(ui.video, 0, 0);
        ui.imgPreview.src = ui.canvas.toDataURL('image/jpeg', 0.7);
        ui.imgPreview.classList.remove('d-none');
        stopCamera();
    });

    function stopCamera() {
        if (cameraStream) {
            cameraStream.getTracks().forEach(t => t.stop());
            cameraStream = null;
        }
        if (ui.camInterface) ui.camInterface.style.display = 'none';
    }

    if (typeof Speech !== 'undefined' && Speech.available()) {
        let isRec = false;
        const btn = getEl('btn-speech');
        if (btn) {
            btn.addEventListener('click', () => {
                if (isRec) {
                    Speech.stop();
                    isRec = false;
                    btn.classList.remove('btn-danger');
                } else {
                    isRec = true;
                    btn.classList.add('btn-danger');
                    Speech.start(
                        txt => { ui.body.value += txt + ' '; },
                        () => { isRec = false; btn.classList.remove('btn-danger'); },
                        () => { isRec = false; btn.classList.remove('btn-danger'); }
                    );
                }
            });
        }
    } else {
        const btn = getEl('btn-speech');
        if (btn) btn.disabled = true;
    }

    if (ui.search) {
        ui.search.addEventListener('input', async (e) => {
            const val = e.target.value.toLowerCase();
            const notes = await DB.getAll();
            renderList(notes.filter(n => (n.title + n.body).toLowerCase().includes(val)));
        });
    }

    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (ui.installAlert) ui.installAlert.classList.remove('d-none');
    });
    addClick('btn-install', () => {
        if (deferredPrompt) deferredPrompt.prompt();
        if (ui.installAlert) ui.installAlert.classList.add('d-none');
    });

    async function loadNotes() {
        if (typeof DB === 'undefined') return;
        const notes = await DB.getAll();
        renderList(notes);
    }

    function renderList(notes) {
        if (!ui.listContainer) return;
        ui.listContainer.innerHTML = '';
        if (!notes || !notes.length) {
            ui.listContainer.innerHTML = '<div class="text-muted p-3 text-center">Brak notatek</div>';
            return;
        }
        notes.sort((a, b) => b.updated - a.updated);
        notes.forEach(n => {
            const btn = document.createElement('button');
            btn.className = 'list-group-item list-group-item-action py-3';
            btn.innerHTML = `
                <div class="fw-bold text-truncate">${n.title || 'Bez tytułu'}</div>
                <div class="small text-muted">${new Date(n.updated).toLocaleDateString()}</div>
                ${n.image ? '📷' : ''}
            `;
            btn.onclick = () => { currentNoteId = n.id; openNote(n.id); };
            ui.listContainer.appendChild(btn);
        });
    }

    async function openNote(id) {
        const n = await DB.getNote(id);
        if (!n) return;
        ui.title.value = n.title;
        ui.body.value = n.body;
        ui.date.textContent = new Date(n.updated).toLocaleString();
        if (n.image) {
            ui.imgPreview.src = n.image;
            ui.imgPreview.classList.remove('d-none');
        } else {
            ui.imgPreview.classList.add('d-none');
        }
        resetEditor();
        showView('editor');
    }

    function resetEditor() {
        stopCamera();
    }

    const checkOnline = () => {
        if (ui.offlineIndicator) ui.offlineIndicator.style.display = navigator.onLine ? 'none' : 'block';
    }
    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', checkOnline);
    checkOnline();

})();