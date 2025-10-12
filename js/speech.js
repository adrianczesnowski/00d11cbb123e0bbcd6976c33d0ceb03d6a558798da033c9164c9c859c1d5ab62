const Speech = (() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
    let rec = null;
    function available() { return !!SpeechRecognition; }
    function start(onResult) {
        if (!SpeechRecognition) throw new Error('SpeechRecognition not available');
        rec = new SpeechRecognition();
        rec.lang = 'pl-PL'; rec.interimResults = false; rec.maxAlternatives = 1;
        rec.onresult = e => onResult(e.results[0][0].transcript);
        rec.onerror = e => console.error('Speech error', e);
        rec.start();
    }
    function stop() { if (rec) rec.stop(); }
    return { available, start, stop };
})();