const app = (() => {
    const getEl = (id) => document.getElementById(id);

    const views = {
        auth: getEl('view-auth'),
        list: getEl('view-list'),
        editor: getEl('view-editor'),
        settings: getEl('view-settings')
    };

    const ui = {
        btnLoginBio: getEl('btn-auth-biometrics'),
        btnLoginPinShow: getEl('btn-auth-pin-login-show'),
        loginPinArea: getEl('login-pin-area'),
        loginPinInput: getEl('login-pin-input'),
        btnLoginPinSubmit: getEl('btn-auth-pin-submit'),
        btnShowRegister: getEl('btn-show-register'),
        registerArea: getEl('register-area'),
        registerPinInput: getEl('register-pin-input'),
        btnRegisterPinSave: getEl('btn-register-pin-save'),
        btnRegisterBio: getEl('btn-auth-register'),
        btnEnterAppFresh: getEl('btn-enter-app-fresh'),
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
        Object.values(views).forEach(el => {
            if (el) el.classList.add('d-none');
        });
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

    addClick('btn-go-list', () => {
        showView('list');
        loadNotes();
    });
    addClick('btn-go-settings', () => showView('settings'));

    addClick('btn-auth-biometrics', async () => {
        try {
            const success = await Auth.login();
            if (success) {
                enterApp();
            } else {
                alert('Nie rozpoznano użytkownika. Jeśli to Twój pierwszy raz, kliknij "Utwórz nowe konto" na dole.');
            }
        } catch (e) {
            console.error(e);
            alert('Błąd logowania. Spróbuj PIN-u lub zarejestruj się.');
        }
    });

    addClick('btn-auth-pin-login-show', () => {
        ui.loginPinArea.classList.remove('d-none');
        ui.loginPinInput.focus();
    });

    addClick('btn-auth-pin-submit', () => {
        const pin = ui.loginPinInput.value;
        if (Auth.checkPin(pin)) {
            enterApp();
        } else {
            alert('Błędny PIN. Jeśli nie masz konta, zjedź niżej i utwórz je.');
            ui.loginPinInput.value = '';
        }
    });

    aaddClick('btn-show-register', () => {
        ui.registerArea.classList.toggle('d-none');
        if (!ui.registerArea.classList.contains('d-none')) {
            setTimeout(() => {
                ui.registerArea.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 100);
        }
    });

    addClick('btn-register-pin-save', () => {
        const pin = ui.registerPinInput.value;
        if (pin.length < 4) return alert('PIN musi mieć minimum 4 cyfry.');
        Auth.setPin(pin);
        alert('PIN zapisany! Możesz teraz używać go do logowania.');
    });

    addClick('btn-auth-register', async () => {
        if (!window.PublicKeyCredential) return alert('Twoje urządzenie nie wspiera biometrii (WebAuthn). Użyj PINu.');
        const ok = await Auth.register();
        if (ok) alert('Biometria dodana pomyślnie!');
        else alert('Nie udało się dodać biometrii.');
    });

    addClick('btn-enter-app-fresh', () => {
        if (!localStorage.getItem('securenotes-pin') && !localStorage.getItem('webauthn-cred')) {
            if (!confirm('Nie ustawiłeś PINu ani biometrii. Aplikacja nie będzie zabezpieczona. Kontynuować?')) return;
        }
        enterApp();
    });

    function enterApp() {
        showView('list');
        loadNotes();
    }

    async function loadNotes() {
        if (typeof DB === 'undefined') return;
        try {
            const notes = await DB.getAll();
            renderList(notes);
        } catch (e) {
            console.error(e);
        }
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
            btn.onclick = () => {
                currentNoteId = n.id;
                openNote(n.id);
            };
            ui.listContainer.appendChild(btn);
        });
    }

    addClick('btn-new-note', () => {
        currentNoteId = null;
        resetEditor();
        showView('editor');
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

    addClick('btn-full-reset', async () => {
        if (!confirm("CZY NA PEWNO? Ta operacja usunie wszystkie dane.")) return;
        try {
            localStorage.clear();
            await DB.clearAll();
            alert("Wyczyszczono. Restart.");
            window.location.reload();
        } catch (e) {
            alert("Błąd resetu");
        }
    });

    addClick('btn-camera', async () => {
        if (cameraStream) {
            stopCamera();
            return;
        }
        try {
            ui.camInterface.style.display = 'block';
            cameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment'
                }
            });
            ui.video.srcObject = cameraStream;
        } catch (e) {
            alert('Błąd kamery (HTTPS wymagany)');
        }
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

    function resetEditor() {
        ui.title.value = '';
        ui.body.value = '';
        ui.date.textContent = 'Nowa notatka';
        ui.imgPreview.src = '';
        ui.imgPreview.classList.add('d-none');
        stopCamera();
    }

    async function openNote(id) {
        const n = await DB.getNote(id);
        if (!n) return;

        resetEditor();

        ui.title.value = n.title;
        ui.body.value = n.body;
        ui.date.textContent = new Date(n.updated).toLocaleString();
        if (n.image) {
            ui.imgPreview.src = n.image;
            ui.imgPreview.classList.remove('d-none');
        } else {
            ui.imgPreview.classList.add('d-none');
        }

        showView('editor');
    }

    if (typeof Speech !== 'undefined' && Speech.available()) {
        let isRec = false;
        const btn = getEl('btn-speech');
        if (btn) btn.addEventListener('click', () => {
            if (isRec) {
                Speech.stop();
                isRec = false;
                btn.classList.remove('btn-danger');
            } else {
                isRec = true;
                btn.classList.add('btn-danger');
                Speech.start(t => ui.body.value += t + ' ', () => {
                    isRec = false;
                    btn.classList.remove('btn-danger');
                });
            }
        });
    }

    if (ui.search) ui.search.addEventListener('input', async (e) => {
        const val = e.target.value.toLowerCase();
        const notes = await DB.getAll();
        renderList(notes.filter(n => (n.title + n.body).toLowerCase().includes(val)));
    });

    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferredPrompt = e;
        if (ui.installAlert) ui.installAlert.classList.remove('d-none');
    });
    addClick('btn-install', () => {
        if (deferredPrompt) deferredPrompt.prompt();
        if (ui.installAlert) ui.installAlert.classList.add('d-none');
    });

    const checkOnline = () => {
        if (ui.offlineIndicator) ui.offlineIndicator.style.display = navigator.onLine ? 'none' : 'block';
    };
    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', checkOnline);
    checkOnline();

})();