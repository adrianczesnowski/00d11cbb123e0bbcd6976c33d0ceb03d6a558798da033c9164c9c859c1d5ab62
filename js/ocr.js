const OCR = (() => {
    async function fromCamera() {
        return new Promise(async (resolve, reject) => {
            try {
                const video = document.createElement('video');
                video.autoplay = true;
                video.playsInline = true;
                video.style.display = 'none';
                document.body.appendChild(video);

                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;

                await new Promise(r => video.onloadedmetadata = r);

                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0);

                stream.getTracks().forEach(t => t.stop());
                video.remove();

                const { createWorker } = Tesseract;
                const worker = await createWorker();
                await worker.loadLanguage('eng');
                await worker.initialize('eng');
                const { data } = await worker.recognize(canvas);
                await worker.terminate();

                resolve(data.text);
            } catch (err) {
                reject(err);
            }
        });
    }
    return { fromCamera };
})();
