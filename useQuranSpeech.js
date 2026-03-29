import { useState, useEffect, useRef } from 'react';

export const useQuranSpeech = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);
  const isManualStopRef = useRef(false); // Deteksi apakah user menekan tombol Berhenti
  const previousTranscriptRef = useRef(''); // Teks dari sesi-sesi mic sebelumnya
  const currentTranscriptRef = useRef('');  // Teks dari sesi mic yang sedang berjalan

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Browser tidak mendukung fitur pengenalan suara. Gunakan Google Chrome/Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    // KUNCI: continuous HARUS false di Android agar memori mesin tidak menumpuk/mengulang
    recognition.continuous = false; 
    recognition.interimResults = true; 
    recognition.lang = 'ar-SA'; // Bahasa Arab

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript + ' ';
        }
      }
      
      if (final !== '') {
        previousTranscriptRef.current += ' ' + final.trim();
        currentTranscriptRef.current = ''; 
      } else {
        currentTranscriptRef.current = interim;
      }
      
      setTranscript((previousTranscriptRef.current + ' ' + currentTranscriptRef.current).trim());
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
        // Simpan hasil tangkapan sesi ini ke memori permanen sebelum restart
        if (currentTranscriptRef.current.trim() !== '') {
          previousTranscriptRef.current += ' ' + currentTranscriptRef.current.trim();
        }
        currentTranscriptRef.current = ''; // Kosongkan sesi saat ini
        
        // Jeda sangat singkat (50ms) sebelum restart agar mesin browser HP tidak crash
        setTimeout(() => {
          if (!isManualStopRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch(e) {
              setIsListening(false);
            }
          }
        }, 50);
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
    setTranscript('');
    previousTranscriptRef.current = '';
    currentTranscriptRef.current = '';
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
      
      // Amankan sisa teks terakhir jika ada
      if (currentTranscriptRef.current.trim() !== '') {
        previousTranscriptRef.current += ' ' + currentTranscriptRef.current.trim();
        currentTranscriptRef.current = '';
        setTranscript(previousTranscriptRef.current.trim());
      }
    }
  };

  return { transcript, isListening, startListening, stopListening, error };
};