const OCR = (() => {
    async function fromCamera() {
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const ocrPreview = document.getElementById('ocr-preview');

        return new Promise(async (resolve, reject) => {
            try {
                video.classList.remove('d-none');
                ocrPreview.textContent = 'Skieruj aparat na tekst i poczekaj na zrobienie zdjęcia...';

                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                video.srcObject = stream;

                await new Promise(r => setTimeout(r, 3000));

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0);

                stream.getTracks().forEach(t => t.stop());
                video.classList.add('d-none');

                ocrPreview.textContent = 'Przetwarzanie obrazu...';

                const { createWorker } = Tesseract;
                const worker = await createWorker('pol');
                const { data } = await worker.recognize(canvas);
                await worker.terminate();

                resolve(data.text);
            } catch (err) {
                console.error(err);
                ocrPreview.textContent = 'Błąd podczas skanowania. Sprawdź uprawnienia do kamery.';
                video.classList.add('d-none');
                reject(err);
            }
        });
    }
    return { fromCamera };
})();