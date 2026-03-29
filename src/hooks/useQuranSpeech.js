import { useState, useRef } from 'react';

export const useQuranSpeech = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startListening = async () => {
    setError(null);
    setTranscript('🎙️ Sedang merekam suara (Mode Premium AI)...');
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Deteksi format audio terbaik yang didukung browser HP/Laptop (Android pakai WebM, Apple pakai MP4)
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/mp4'; 
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = ''; 
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorderRef.current.stream = stream; // Simpan referensi stream agar bisa dimatikan

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (err) {
      setError('Akses microphone ditolak atau error. Detail: ' + err.message);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isListening) {
        mediaRecorderRef.current.onstop = () => {
          const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
          // Bungkus pecahan audio menjadi 1 file utuh
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          // Ubah file Audio menjadi teks (Base64) agar bisa dikirim ke Server GAS Google
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            
            // Matikan total semua sensor mic agar lampu indikator HP benar-benar mati
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            
            resolve({ audioBase64: base64String, audioMimeType: mimeType });
          };
        };

        mediaRecorderRef.current.stop();
        setIsListening(false);
        setTranscript('⏳ Memproses dan Mengunggah Audio ke AI...');
      } else {
        resolve(null);
      }
    });
  };

  return { transcript, isListening, startListening, stopListening, error };
};
