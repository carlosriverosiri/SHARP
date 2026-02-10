type DictationOptions = {
  dictationBtn: HTMLButtonElement | null;
  dictationStatus: HTMLElement | null;
  promptEl: HTMLTextAreaElement | null;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultLike[];
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function initDictation({ dictationBtn, dictationStatus, promptEl }: DictationOptions) {
  if (!dictationBtn || !dictationStatus || !promptEl) return;
  const safeBtn = dictationBtn;
  const safeStatus = dictationStatus;
  const safePrompt = promptEl;

  const SpeechRecognition = ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) as SpeechRecognitionCtor | undefined;

  if (!SpeechRecognition) {
    safeBtn.style.display = 'none';
    console.log('Web Speech API stöds inte i denna webbläsare');
    return;
  }

  let recognition: SpeechRecognitionLike | null = new SpeechRecognition();
  let isRecording = false;
  let finalTranscript = '';
  let interimTranscript = '';

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'sv-SE';

  recognition.onstart = () => {
    isRecording = true;
    safeBtn.classList.add('recording');
    safeStatus.textContent = '🎤 Lyssnar... (tala nu)';
    safeStatus.className = 'dictation-status recording';
    finalTranscript = safePrompt.value; // Behåll befintlig text
  };

  recognition.onresult = (event) => {
    interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += (finalTranscript ? ' ' : '') + transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    safePrompt.value = finalTranscript + (interimTranscript ? ' ' + interimTranscript : '');
    safePrompt.scrollTop = safePrompt.scrollHeight;
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error || 'unknown');
    stopDictation();

    if (event.error === 'not-allowed') {
      safeStatus.textContent = '❌ Mikrofon nekad. Tillåt mikrofon i webbläsaren.';
    } else if (event.error === 'no-speech') {
      safeStatus.textContent = '⚠️ Inget tal upptäcktes. Försök igen.';
    } else if (event.error === 'network') {
      safeStatus.textContent = '❌ Nätverksfel. Kontrollera internetanslutning.';
    } else {
      safeStatus.textContent = `❌ Fel: ${event.error || 'okänt fel'}`;
    }
    safeStatus.className = 'dictation-status error';
  };

  recognition.onend = () => {
    if (isRecording) {
      try {
        recognition?.start();
      } catch {
        stopDictation();
      }
    }
  };

  function startDictation() {
    if (!recognition) {
      safeStatus.textContent = '❌ Diktering stöds inte i denna webbläsare';
      safeStatus.className = 'dictation-status error';
      return;
    }

    try {
      recognition.start();
    } catch (e) {
      console.error('Could not start recognition:', e);
      safeStatus.textContent = '❌ Kunde inte starta mikrofonen';
      safeStatus.className = 'dictation-status error';
    }
  }

  function stopDictation() {
    isRecording = false;
    safeBtn.classList.remove('recording');

    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Ignore stop errors
      }
    }

    if (safePrompt.value.trim()) {
      safeStatus.textContent = '✓ Diktering klar - text tillagd';
      safeStatus.className = 'dictation-status success';
      setTimeout(() => {
        safeStatus.textContent = '';
      }, 3000);
    } else {
      if (!safeStatus.classList.contains('error')) {
        safeStatus.textContent = '';
      }
    }
  }

  function toggleDictation() {
    if (isRecording) {
      stopDictation();
    } else {
      startDictation();
    }
  }

  safeBtn.addEventListener('click', toggleDictation);
}
