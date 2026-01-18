# FajneNotatki - PWA

Progresywna Aplikacja Webowa (PWA) służąca do bezpiecznego tworzenia i przechowywania notatek multimedialnych. Aplikacja działa w pełni offline, wykorzystuje natywne funkcje urządzenia i zabezpiecza dostęp za pomocą biometrii lub kodu PIN.

## Uruchomienie projektu

Aplikacja nie wymaga procesu budowania. Aby zadziałały funkcje PWA (Service Worker, Kamera, Mikrofon), aplikacja **musi być serwowana przez HTTPS** lub `localhost`.

### Opcja 1: GitHub Pages / Netlify
Wgraj pliki na hosting obsługujący HTTPS.
1. Wrzuć pliki na repozytorium GitHub.
2. Włącz GitHub Pages w ustawieniach repozytorium.
3. Otwórz wygenerowany link na telefonie.

### Opcja 2: Lokalnie
1. Zainstaluj rozszerzenie "Live Server" w VS Code.
2. Kliknij prawym przyciskiem na `index.html` -> "Open with Live Server".
3. Aplikacja otworzy się pod adresem `http://127.0.0.1:5500`.

---

### 1. Instalowalność
Aplikacja posiada poprawny plik `manifest.json` oraz ikony. Użytkownik może dodać aplikację do ekranu głównego (A2HS).
* **Implementacja:** `manifest.json`, obsługa zdarzenia `beforeinstallprompt` w `js/app.js`.

### 2. Wykorzystanie funkcji natywnych
Aplikacja integruje się z API przeglądarki i sprzętu:
1.  **Kamera (MediaDevices API):** Umożliwia wykonanie zdjęcia i dołączenie go bezpośrednio do treści notatki. Podgląd wideo realizowany jest w elemencie `<video>`, a przechwycenie klatki na `<canvas>`.
2.  **Mikrofon (Web Speech API):** Umożliwia dyktowanie treści notatki (Speech-to-Text).
3.  **Biometria (WebAuthn API):** Umożliwia logowanie za pomocą odcisku palca lub FaceID (jeśli urządzenie wspiera `platform authenticator`).

### 3. Tryb Offline i Strategia Buforowania
Aplikacja jest w pełni funkcjonalna bez dostępu do Internetu.
* **Service Worker (`sw.js`):** Wykorzystuje strategię **Cache First** dla zasobów statycznych (HTML, CSS, JS, ikony), co zapewnia natychmiastowe ładowanie.
* **IndexedDB:** Wszystkie notatki (tekst + zdjęcia base64) są zapisywane w lokalnej bazie danych przeglądarki.
* **UI:** Aplikacja wykrywa status sieci (`navigator.onLine`) i wyświetla komunikat ostrzegawczy w trybie offline.

### 4. Architektura Widoków
Aplikacja posiada spójny przepływ składający się z 4 głównych widoków przełączanych dynamicznie bez przeładowania strony:
1.  **Auth View:** Logowanie (Biometria/PIN).
2.  **List View:** Lista notatek z wyszukiwarką.
3.  **Editor View:** Edycja, obsługa kamery i mikrofonu.
4.  **Settings View:** Informacje o aplikacji i reset danych.

---

## 🛠 Technologie

* **HTML5:** Semantyczna struktura.
* **CSS3:** Framework **Bootstrap 5** dla responsywności.
* **JavaScript (ES6+):** Logika aplikacji podzielona na moduły:
    * `app.js`: Główny kontroler UI i nawigacji.
    * `db.js`: Obsługa IndexedDB (CRUD).
    * `auth.js`: Obsługa WebAuthn i PIN.
    * `speech.js`: Wrapper na SpeechRecognition API.

## 📂 Struktura plików

```text
/
├── index.html          # Główny plik aplikacji
├── manifest.json       # Metadane PWA
├── sw.js               # Service Worker
├── css/
│   └── style.css       # Style niestandardowe
├── js/
│   ├── app.js          # Logika widoków i zdarzeń
│   ├── db.js           # Warstwa danych (IndexedDB)
│   ├── auth.js         # Logika autoryzacji
│   └── speech.js       # Obsługa mikrofonu
└── assets/             # Ikony aplikacji
