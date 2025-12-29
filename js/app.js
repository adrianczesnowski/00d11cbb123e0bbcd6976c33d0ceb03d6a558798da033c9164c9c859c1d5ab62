const app = (() => {
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');
    const pinArea = document.getElementById('pin-area');
    const notesList = document.getElementById('notes-list');
    const editor = document.getElementById('editor');
    const empty = document.getElementById('empty');
    const noteTitle = document.getElementById('note-title');
    const noteBody = document.getElementById('note-body');
    const noteMeta = document.getElementById('note-meta');
    const search = document.getElementById('search');
    const btnSpeech = document.getElementById('btn-speech');

    let currentId = null;

    document.getElementById('btn-register').addEventListener('click', async () => {
        if (!window.PublicKeyCredential) {
            alert('Brak WebAuth');
            return;
        } 
        const ok = await Auth.register();
        alert(ok ? 'Zarejestrowano!' : 'Nieudane.');
    });

    document.getElementById('btn-auth').addEventListener('click', async () => {
        const ok = await Auth.login();
        if (ok) showApp();
        else alert('Nieudane logowanie');
    });

    document.getElementById('btn-fallback').addEventListener('click', () => {
        pinArea.classList.toggle('d-none');
    });

    document.getElementById('btn-pin-set').addEventListener('click', () => {
        Auth.setPin(document.getElementById('pin-input').value);
        alert('PIN ustawiony poprawnie');
    });

    document.getElementById('btn-pin-login').addEventListener('click', () => {
        if (Auth.checkPin(document.getElementById('pin-input').value)) showApp();
        else alert('Zły kod PIN');
    });

    function showApp() {
        authView.classList.add('d-none');
        appView.classList.remove('d-none');
        loadNotes();
    }

    async function loadNotes() {
        const notes = await DB.getAll();
        renderList(notes);
    }

    function renderList(notes) {
        notesList.innerHTML = '';
        if (!notes || !notes.length) {
            notesList.innerHTML = '<div class="text-muted">Brak notatek</div>';
            return;
        }

        notes.sort((a, b) => b.updated - a.updated);

        for (const n of notes) {
            const el = document.createElement('a');
            el.className = 'list-group-item list-group-item-action note-item';
            el.textContent = n.title || '(brak tytułu)';
            el.dataset.id = n.id;

            const meta = document.createElement('div');
            meta.className = 'small text-muted';
            meta.textContent = new Date(n.updated).toLocaleString();

            el.appendChild(meta);
            el.addEventListener('click', () => openNote(n.id));
            notesList.appendChild(el);
        }
    }

    document.getElementById('btn-new').addEventListener('click', () => openNewNote());

    async function openNewNote() {
        currentId = crypto.randomUUID();
        noteTitle.value = '';
        noteBody.value = '';
        noteMeta.textContent = 'Nowa notatka';
        editor.classList.remove('d-none');
        empty.classList.add('d-none');
    }

    async function openNote(id) {
        const n = await DB.getNote(id);
        if (!n) return;
        currentId = id;
        noteTitle.value = n.title;
        noteBody.value = n.body;
        noteMeta.textContent = 'Zapisano: ' + new Date(n.updated).toLocaleString();
        editor.classList.remove('d-none');
        empty.classList.add('d-none');

        document.querySelectorAll('#notes-list .note-item').forEach(el => {
            el.classList.toggle('active', el.dataset.id === id);
        });
    }

    document.getElementById('btn-save').addEventListener('click', async () => {
        const now = Date.now();
        const note = {
            id: currentId || crypto.randomUUID(),
            title: noteTitle.value.trim(),
            body: noteBody.value.trim(),
            updated: now,
            created: currentId ? (await DB.getNote(currentId))?.created || now : now
        };

        await DB.addNote(note);
        await loadNotes();

        editor.classList.add('d-none');
        empty.classList.remove('d-none');
        currentId = null;

        alert('Notatka zapisana!');
    });

    document.getElementById('btn-delete').addEventListener('click', async () => {
        if (!currentId) return;
        if (!confirm('Usunąć notatkę?')) return;
        await DB.deleteNote(currentId);
        editor.classList.add('d-none');
        empty.classList.remove('d-none');
        await loadNotes();
    });

    if (!Speech.available()) {
        btnSpeech.disabled = true;
        btnSpeech.textContent = 'Dyktowanie niedostępne';
    } else {
        let isRecording = false;

        const startDictation = () => {
            if (isRecording) return;
            isRecording = true;
            btnSpeech.classList.add('btn-danger');
            btnSpeech.classList.remove('btn-outline-secondary');
            btnSpeech.textContent = 'Słucham...';

            Speech.start(
                (text) => {
                    noteBody.value += text + ' ';
                },
                (error) => {
                    alert('Nie udało się rozpocząć dyktowania. Sprawdź uprawnienia do mikrofonu.');
                    console.error(error);
                },
                () => {
                    stopDictation();
                }
            );
        };

        const stopDictation = () => {
            if (!isRecording) return;
            isRecording = false;
            Speech.stop();
            btnSpeech.classList.remove('btn-danger');
            btnSpeech.classList.add('btn-outline-secondary');
            btnSpeech.textContent = 'Dyktuj tekst';
        };

        btnSpeech.addEventListener('mousedown', startDictation);
        btnSpeech.addEventListener('mouseup', stopDictation);
        btnSpeech.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startDictation();
        });
        btnSpeech.addEventListener('touchend', stopDictation);
    }

    search.addEventListener('input', async () => {
        const notes = await DB.getAll();
        const filtered = notes.filter(n => n.title.toLowerCase().includes(search.value.toLowerCase()));
        renderList(filtered);
    });
})();