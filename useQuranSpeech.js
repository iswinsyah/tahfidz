import { useState, useEffect, useRef } from 'react';

export const useQuranSpeech = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);
  const isManualStopRef = useRef(false); // Deteksi apakah user menekan tombol Berhenti
  const fullTranscriptRef = useRef(''); // Akumulasi teks yang stabil

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Browser tidak mendukung fitur pengenalan suara. Gunakan Google Chrome/Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; 
    // Matikan interim agar tidak ada kata yang menumpuk/mengulang (stuttering)
    recognition.interimResults = false; 
    recognition.lang = 'ar-SA'; // Bahasa Arab

    recognition.onresult = (event) => {
      let currentChunk = '';
      // Hanya ambil blok kata yang baru dan sudah final
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentChunk += event.results[i][0].transcript + ' ';
      }
      fullTranscriptRef.current += currentChunk;
      setTranscript(fullTranscriptRef.current.trim());
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        console.error('Speech recognition error', event.error);
        setError(event.error);
      }
    };

    recognition.onend = () => {
      // Jika mic mati sendiri (karena jeda napas) padahal user belum tekan "Berhenti", hidupkan lagi!
      if (!isManualStopRef.current) {
        try {
          recognition.start();
        } catch(e) {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
    setTranscript('');
    fullTranscriptRef.current = '';
    setError(null);
    isManualStopRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Mic sudah aktif atau error:", e);
      }
    }
  };

  const stopListening = () => {
    isManualStopRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return { transcript, isListening, startListening, stopListening, error };
};