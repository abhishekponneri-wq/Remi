// Web Speech API wrapper with human-like voice synthesis tuned for warmth and clarity

let preferredWarmVoice: SpeechSynthesisVoice | null = null;

// Ranking list of highest-quality neural, expressive, and human-sounding voices across OSs
const PREFERRED_VOICE_NAMES = [
  'Google UK English Female',
  'Google US English',
  'Microsoft Jenny Online (Natural)',
  'Microsoft Aria Online (Natural)',
  'Microsoft Sonia Online (Natural)',
  'Samantha (Enhanced)',
  'Samantha',
  'Moira',
  'Karen',
  'Victoria',
  'Tessa',
  'en-GB-Neural2-A',
  'en-US-Neural2-F'
];

function pickBestWarmVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Try explicit preferred list
  for (const preferred of PREFERRED_VOICE_NAMES) {
    const match = voices.find(v => v.name.toLowerCase().includes(preferred.toLowerCase()));
    if (match) return match;
  }

  // 2. Try any Natural or Neural English voice
  const naturalMatch = voices.find(v => 
    v.lang.startsWith('en') && 
    (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Premium'))
  );
  if (naturalMatch) return naturalMatch;

  // 3. Fallback to any gentle female or general English voice
  const femaleEn = voices.find(v => 
    v.lang.startsWith('en') && 
    (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman') || v.name.toLowerCase().includes('girl'))
  );
  if (femaleEn) return femaleEn;

  return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    preferredWarmVoice = pickBestWarmVoice();
  };
  preferredWarmVoice = pickBestWarmVoice();
}

/**
 * Natural Conversational Speech Synthesizer
 * Formats punctuation for warm cadence, calm breaths, and non-robotic phrasing.
 */
export const speakGentleVoice = (text: string, onEnd?: () => void): void => {
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  // Cancel any lingering utterances cleanly
  window.speechSynthesis.cancel();

  // Natural pause normalization: softens periods, ellipses, and commas
  const conversationalText = text
    .replace(/(\d+):(\d+)\s*(AM|PM|am|pm)?/g, '$1 $2 $3') // Speak times fluidly e.g. "5 00 PM"
    .replace(/\b(\d+)m\b/g, '$1 minutes')
    .replace(/\b(\d+)IST\b/g, '$1 I S T')
    .replace(/\s+/g, ' ')
    .trim();

  const utterance = new SpeechSynthesisUtterance(conversationalText);

  if (!preferredWarmVoice) {
    preferredWarmVoice = pickBestWarmVoice();
  }
  if (preferredWarmVoice) {
    utterance.voice = preferredWarmVoice;
  }

  // Conversational sweet parameters:
  // rate: 0.92 gives time for comprehension without sounding sluggish
  // pitch: 1.04 provides warm, friendly bedside-manner inflection
  utterance.rate = 0.92;
  utterance.pitch = 1.04;
  utterance.volume = 1.0;

  let ended = false;
  const finish = () => {
    if (!ended) {
      ended = true;
      if (onEnd) onEnd();
    }
  };

  utterance.onend = finish;
  utterance.onerror = (e) => {
    console.debug('Speech playback error/cancel:', e);
    finish();
  };

  window.speechSynthesis.speak(utterance);
};

export const stopSpeaking = (): void => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

export class VoiceRecognizer {
  private recognition: any = null;
  private isListening = false;

  constructor(
    private onResult: (transcript: string) => void,
    private onError: (error: string) => void,
    private onStateChange: (listening: boolean) => void
  ) {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.onStateChange(true);
      };

      this.recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          this.onResult(finalTranscript.trim());
        }
      };

      this.recognition.onerror = (event: any) => {
        this.onError(event.error || 'Speech capture failed');
        this.isListening = false;
        this.onStateChange(false);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.onStateChange(false);
      };
    }
  }

  public start(): boolean {
    if (!this.recognition) {
      this.onError('Speech recognition is unavailable. Please click one of the quick suggestions or type below.');
      return false;
    }
    try {
      this.recognition.start();
      return true;
    } catch (e) {
      console.warn('Recognition start error:', e);
      return false;
    }
  }

  public stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.warn('Recognition stop error:', e);
      }
    }
  }
}
