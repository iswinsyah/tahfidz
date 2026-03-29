import { useState, useRef } from 'react';

export const useQuranSpeech = () => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null); // Wadah khusus untuk sensor mic

  const startListening = async () => {
    setError(null);
    setTranscript('⏳ Meminta izin akses mikrofon...');
    audioChunksRef.current = [];

    // Cek apakah web diakses lewat HTTP (Bukan HTTPS)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      const msg = "Akses Mikrofon diblokir. Anda wajib membuka web ini menggunakan awalan HTTPS://";
      alert(msg);
      setError(msg);
      setTranscript('Akses Mikrofon Diblokir (Harus HTTPS) ❌');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream; // Simpan sensor mic ke wadah khusus
      
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

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsListening(true);
      setTranscript('🎙️ Sedang merekam suara (Mode Premium AI)...');
    } catch (err) {
      console.error("Mic error:", err);
      let errMsg = "Gagal mengakses mikrofon. ";
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
         errMsg += "Izin ditolak. Silakan klik ikon gembok (🔒) di sebelah URL bar Chrome Anda, lalu izinkan akses mikrofon.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
         errMsg += "Tidak ada mikrofon yang terdeteksi di perangkat ini.";
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
         errMsg += "Mikrofon sedang digunakan oleh aplikasi lain.";
      } else {
         errMsg += "Detail: " + err.message;
      }
      alert(errMsg);
      setError(errMsg);
      setTranscript('Gagal mengakses mikrofon ❌');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && isListening) {
        mediaRecorderRef.current.onstop = () => {
          // Bersihkan tipe format agar sesuai standar Google Gemini (misal: "audio/webm;codecs=opus" jadi "audio/webm")
          const mimeType = (mediaRecorderRef.current.mimeType || 'audio/webm').split(';')[0];
          // Bungkus pecahan audio menjadi 1 file utuh
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          // Ubah file Audio menjadi teks (Base64) agar bisa dikirim ke Server GAS Google
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64String = reader.result.split(',')[1];
            
            // Matikan total semua sensor mic agar lampu indikator HP benar-benar mati
            if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
            }
            
            resolve({ audioBase64: base64String, audioMimeType: mimeType, size: audioBlob.size });
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
