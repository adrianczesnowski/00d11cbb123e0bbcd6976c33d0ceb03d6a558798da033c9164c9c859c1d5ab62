const OCR = (() => {
    async function fromCamera() {
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        await new Promise(r => setTimeout(r, 500));
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        stream.getTracks().forEach(t => t.stop());
        const data = canvas.toDataURL('image/png');
        const worker = Tesseract.createWorker({ logger: m => console.log(m) });
        await worker.load(); await worker.loadLanguage('eng+pol'); await worker.initialize('eng+pol');
        const { data: { text } } = await worker.recognize(data);
        await worker.terminate(); return text;
    }
    return { fromCamera };
})();