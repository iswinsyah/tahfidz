// Komponen Utama Aplikasi At Tahfidz
import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, BookOpen, Mic, Award, User, Heart, Share2, Play, Pause, Search, Download, Copy, Check,
  CheckCircle, AlertCircle, Star, Bell, Settings, DollarSign,
  ChevronRight, Volume2, MessageCircle, X, List
} from 'lucide-react';
import { useQuranSpeech } from './hooks/useQuranSpeech';
import { calculateTajwidScore } from './utils/scoring';
import { quranData } from './data/QuranData';

const MOCK_QURAN = {
  surah: "Al-Mulk",
  surahNumber: 67,
  ayat_range: "1-2",
  verses: 2,
  text: [
    { id: 1, arabic: "تَبَٰرَكَ ٱلَّذِى بِيَدِهِ ٱلْمُلْكُ وَهُوَ عَلَىٰ كُلِّ شَىْءٍ قَدِيرٌ", indo: "Mahasuci Allah yang menguasai kerajaan..." },
    { id: 2, arabic: "ٱلَّذِى خَلَقَ ٱلْمَوْتَ وَٱلْحَيَوٰةَ لِيَبْلُوَكُمْ أَيُّكُمْ أَحْسَنُ عَمَلًا ۚ وَهُوَ ٱلْعَزِيزُ ٱلْغَفُورُ", indo: "yang menciptakan mati dan hidup..." }
  ]
};

function App() {
  const [activeTab, setActiveTab] = useState('home'); // Kembali ke beranda
  const [sessionState, setSessionState] = useState('idle');
  const [score, setScore] = useState(null);
  const [showSedekah, setShowSedekah] = useState(false);
  const [selectedUstadz, setSelectedUstadz] = useState('Hamzah');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [quranView, setQuranView] = useState('surah'); // 'surah' atau 'juz'
  const [searchQuery, setSearchQuery] = useState(''); // State pencarian
  const [selectedQari, setSelectedQari] = useState('Husary_128kbps'); // Qari default untuk pemula
  const [playingAyah, setPlayingAyah] = useState(null); // Ayat yang sedang diputar
  const [selectedLearnItem, setSelectedLearnItem] = useState(null); // Menyimpan surah/juz yang dipilih
  const [isLoadingLearnData, setIsLoadingLearnData] = useState(false); // Indikator loading saat ambil data
  const [ayahStart, setAyahStart] = useState(1); // Filter ayat awal
  const [ayahEnd, setAyahEnd] = useState(2); // Filter ayat akhir
  const [aiNote, setAiNote] = useState(''); // Catatan dari AI Gemini
  const [isSpeakingNote, setIsSpeakingNote] = useState(false); // Indikator TTS Ustadz sedang bicara
  const [isCopied, setIsCopied] = useState(false); // Indikator copy hasil
  const [isAutoplay, setIsAutoplay] = useState(false); // Indikator putar berurutan
  const [isMushafMode, setIsMushafMode] = useState(false); // Toggle mode mushaf
  const playlistRef = useRef([]); // Ref untuk menyimpan daftar putar

  const { transcript, isListening, startListening, stopListening, error } = useQuranSpeech();

  const audioRef = useRef(null);

  // Bersihkan audio saat komponen tertutup atau pindah tab
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel(); // Hentikan suara AI jika ganti tab
      }
    };
  }, [activeTab]);

  const handlePlayAyah = (surahNum, ayahNum, autoNext = false) => {
    // Jika ayat yang sama diklik saat sedang play, maka pause
    if (playingAyah === ayahNum && isPlayingAudio) {
      audioRef.current?.pause();
      setIsPlayingAudio(false);
      setPlayingAyah(null);
      setIsAutoplay(false);
      return;
    }

    if (audioRef.current) audioRef.current.pause(); // Hentikan audio sebelumnya

    setIsAutoplay(autoNext);

    // Format nomor menjadi 3 digit (contoh: Surah 1, Ayat 2 => 001002.mp3)
    const surahStr = String(surahNum).padStart(3, '0');
    const ayahStr = String(ayahNum).padStart(3, '0');
    const audioUrl = `https://everyayah.com/data/${selectedQari}/${surahStr}${ayahStr}.mp3`;

    const newAudio = new Audio(audioUrl);
    audioRef.current = newAudio;
    
    newAudio.onplay = () => { setIsPlayingAudio(true); setPlayingAyah(ayahNum); };
    newAudio.onended = () => { 
      if (autoNext) {
        const currentList = playlistRef.current;
        const currentIndex = currentList.findIndex(a => a.id === ayahNum);
        if (currentIndex !== -1 && currentIndex + 1 < currentList.length) {
          // Jika masih ada ayat selanjutnya, putar otomatis
          handlePlayAyah(surahNum, currentList[currentIndex + 1].id, true);
        } else {
          setIsPlayingAudio(false);
          setPlayingAyah(null);
          setIsAutoplay(false);
        }
      } else {
        setIsPlayingAudio(false); 
        setPlayingAyah(null); 
        setIsAutoplay(false);
      }
    };
    newAudio.onerror = () => { alert("Maaf, audio belum tersedia untuk ayat ini."); setIsPlayingAudio(false); setPlayingAyah(null); setIsAutoplay(false); };
    
    newAudio.play();
  };

  const handleDownloadAyah = async (surahNum, ayahNum, e) => {
    e.stopPropagation(); // Mencegah ayat ter-play saat tombol download diklik
    
    const surahStr = String(surahNum).padStart(3, '0');
    const ayahStr = String(ayahNum).padStart(3, '0');
    const audioUrl = `https://everyayah.com/data/${selectedQari}/${surahStr}${ayahStr}.mp3`;

    try {
      // Menggunakan fetch untuk memaksa browser mendownload file mp3 (bukan sekedar membuka tab)
      const response = await fetch(audioUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Surah_${surahStr}_Ayat_${ayahStr}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Fallback: Jika terblokir oleh keamanan browser, buka di tab baru agar bisa disave manual
      window.open(audioUrl, '_blank');
    }
  };

  // Fungsi untuk mengubah teks Saran Ustadz menjadi Suara (Gratis bawaan browser)
  const handleSpeakNote = (text) => {
    if (!window.speechSynthesis) {
      alert("Maaf, browser perangkat ini belum mendukung fitur Suara AI.");
      return;
    }

    if (isSpeakingNote) {
      window.speechSynthesis.cancel(); // Stop jika sedang bicara
      setIsSpeakingNote(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID'; // Bahasa Indonesia
    utterance.rate = 0.9; // Diperlambat sedikit agar terdengar lebih jelas dan berwibawa

    // Logika pemilihan suara Laki-laki (Hamzah) / Perempuan (Humairah)
    const voices = window.speechSynthesis.getVoices();
    const idVoices = voices.filter(v => v.lang.includes('id'));
    
    if (idVoices.length > 0) {
      if (selectedUstadz === 'Hamzah') {
        // Suara Laki-laki: Cari voice laki-laki OS, atau akali dengan pitch (nada) lebih rendah
        utterance.voice = idVoices.find(v => v.name.toLowerCase().includes('male')) || idVoices[0];
        utterance.pitch = 0.8; // Nada lebih berat dan berwibawa
      } else {
        // Suara Perempuan: Cari voice perempuan OS, atau akali dengan pitch (nada) lebih tinggi
        utterance.voice = idVoices.find(v => v.name.toLowerCase().includes('female')) || idVoices[idVoices.length - 1];
        utterance.pitch = 1.2; // Nada lebih lembut
      }
    }

    utterance.onstart = () => setIsSpeakingNote(true);
    utterance.onend = () => setIsSpeakingNote(false);
    utterance.onerror = () => setIsSpeakingNote(false);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopyResult = () => {
    const predicate = getPredicate(score);
    const noteText = aiNote || predicate.note;
    const targetSurah = selectedLearnItem ? selectedLearnItem.data.surah : MOCK_QURAN.surah;
    const targetAyah = selectedLearnItem?.type === 'juz' ? selectedLearnItem.data.ayat_range : `Ayat ${ayahStart}-${ayahEnd}`;
    
    const textToCopy = `📋 *Evaluasi Setoran At Tahfidz*\n📖 Surah: ${targetSurah} (${targetAyah})\n⭐ Nilai: ${score}/100 (${predicate.label})\n\n💡 *Saran Ustadz AI:*\n${noteText}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Kembali ke ikon semula setelah 2 detik
    });
  };

  const handleStartSetoran = () => {
    if (error) {
      alert(error);
      return;
    }
    setSessionState('recording');
    startListening();
  };

  const handleSelectSurah = async (surah) => {
    setActiveTab('learn');
    setIsLoadingLearnData(true);
    
    try {
      // Memanggil data API EQuran (Kemenag)
      const response = await fetch(`https://equran.id/api/v2/surat/${surah.surahNumber}`);
      const result = await response.json();
      
      // Menyusun ulang data agar sesuai format aplikasi kita
      const formattedText = result.data.ayat.map(a => ({
        id: a.nomorAyat,
        arabic: a.teksArab,
        indo: a.teksIndonesia
      }));

      setSelectedLearnItem({
        type: 'surah',
        data: {
          surah: surah.surahName,
          surahNumber: surah.surahNumber,
          ayat_range: `1-${surah.verses}`,
          verses: surah.verses,
          text: formattedText
        }
      });
      
      // Set rentang ayat bawaan ke seluruh isi surah tersebut
      setAyahStart(1);
      setAyahEnd(surah.verses);
    } catch (err) {
      alert("Gagal mengambil data surah. Pastikan koneksi internet lancar.");
    } finally {
      setIsLoadingLearnData(false);
    }
  };

  const handleSelectJuz = (juz) => {
    // Sama seperti surah, ini adalah placeholder untuk demo.
    setSelectedLearnItem({
      type: 'juz',
      data: {
        surah: juz.title,
        ayat_range: `Halaman ${juz.page}`,
        text: [{ id: 1, arabic: `Ini adalah konten untuk ${juz.title}.`, indo: "Konten ayat-ayat untuk juz ini akan ditambahkan segera."}]
      }
    });
    setActiveTab('learn');
  };

  const handleStopSetoran = async () => {
    stopListening();
    setSessionState('processing');
    setAiNote('');

    // Gunakan data dari surah/juz yang sedang dipelajari
    const currentLearnData = selectedLearnItem ? selectedLearnItem.data : MOCK_QURAN;
    const targetText = currentLearnData.text
      .filter(t => t.id >= ayahStart && t.id <= ayahEnd)
      .map(t => t.arabic).join(" ");

    // Jika mic tidak menangkap suara
    if (!transcript || transcript.trim() === "") {
      setScore(0);
      setAiNote("Tidak ada suara yang terdeteksi. Pastikan mic berfungsi dan silakan coba lagi.");
      setSessionState('result');
      return;
    }

    try {
      const GAS_URL = "https://script.google.com/macros/s/AKfycbwqmsSLXdyZxLHAI76DkCLQqs0LpgadjdFL1qMMLpUtkRd5nNTwTDXyvV2gn4C-0WBk/exec";

      const response = await fetch(GAS_URL, {
        method: 'POST',
        // Hapus headers sama sekali agar browser otomatis memakai standard text/plain murni
        // Ini ampuh 100% untuk menghindari blokir Preflight CORS dari sistem Google
        // Kirim juga data ustadz yang terpilih ke GAS
        body: JSON.stringify({ targetText, transcript, ustadz: selectedUstadz })
      });

      const textResponse = await response.text();
      let result;
      try {
        result = JSON.parse(textResponse);
      } catch (e) {
        throw new Error("Balasan GAS bukan JSON (Biasanya karena salah setting Akses): " + textResponse.substring(0, 50));
      }

      setScore(result.score);
      setAiNote(result.note);
      setSessionState('result');

      if (result.score >= 95) {
        setTimeout(() => setShowSedekah(true), 1500);
      }
    } catch (err) {
      // Tampilkan pesan error aslinya agar kita tahu penyebab pastinya
      setScore(0);
      setAiNote("Error Sistem: " + err.message + " | Cek setingan GAS bos (Pilih Execute as: Me, Access: Anyone).");
      setSessionState('result');
    }
  };


  const getPredicate = (s) => {
    if (!s) return { label: '', color: '', bg: '', note: '' };
    if (s >= 95) return { label: 'Mumtaz', color: 'text-green-600', bg: 'bg-green-100', note: 'Masya Allah! Hafalanmu sangat kuat dan lancar.' };
    if (s >= 85) return { label: 'Jayyid Jiddan', color: 'text-blue-600', bg: 'bg-blue-100', note: 'Bagus sekali! Perhatikan kembali tajwid di beberapa bagian ya.' };
    if (s >= 75) return { label: 'Jayyid', color: 'text-yellow-600', bg: 'bg-yellow-100', note: 'Cukup lancar, namun masih ada beberapa keraguan di makhraj.' };
    return { label: 'Aslaha', color: 'text-red-600', bg: 'bg-red-100', note: 'Ayo semangat murajaah lagi sebelum setor kembali.' };
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-4 p-4 pb-24">
            <div className="flex justify-between items-center px-2">
              <h1 className="text-2xl font-bold text-green-800">At Tahfidz</h1>
              <div className="flex gap-3">
                <button className="p-2 bg-white rounded-full shadow-sm text-gray-600"><Bell size={20} /></button>
                <button className="p-2 bg-white rounded-full shadow-sm text-gray-600"><Settings size={20} /></button>
              </div>
            </div>

            {/* Ethical Ads / Sponsorship Banner */}
            <div className="bg-gradient-to-br from-green-700 to-green-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
              <div className="relative z-10 space-y-2">
                <div className="bg-white/20 w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Sponsor Ad</div>
                <h3 className="font-bold text-lg">Wakaf Quran untuk Pelosok</h3>
                <p className="text-xs text-green-100">Bantu 1000 santri di pedalaman mendapatkan Mushaf baru.</p>
                <button className="mt-2 bg-yellow-500 text-green-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-yellow-400 transition-colors flex items-center gap-2">
                  <DollarSign size={14} /> Beri Kontribusi
                </button>
              </div>
              <Heart className="absolute -right-4 -bottom-4 opacity-10 rotate-12" size={120} />
            </div>

            {/* Social Media Feed for Hufadz */}
            <h2 className="font-bold text-gray-700 px-2 pt-2">Kabar Hufadz</h2>
            {[1, 2].map((i) => (
              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-800 overflow-hidden">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i === 1 ? 'Ahmad' : 'Siti'}`} alt="avatar" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{i === 1 ? 'Hamba Allah (Karyawan)' : 'Bunda Sarah'}</p>
                    <p className="text-[10px] text-gray-400">Baru saja menyelesaikan Juz 30</p>
                  </div>
                  <div className="text-[10px] text-gray-500 italic">3 menit lalu</div>
                </div>
                <p className="text-sm text-gray-700">
                  {i === 1 
                    ? "Alhamdulillah, berkat fitur AI At Tahfidz jadi lebih percaya diri buat murajaah di kantor saat istirahat. Mumtaz!" 
                    : "Masya Allah, fitur suaranya Ustadzah Humaira membantu sekali buat koreksi bacaan anak-anak di rumah. Jazakallah!"}
                </p>
                <div className="flex gap-4 pt-3 border-t border-gray-50">
                  <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500"><Heart size={14} /> 42</button>
                  <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500"><MessageCircle size={14} /> 8</button>
                  <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500"><Share2 size={14} /> Share</button>
                </div>
              </div>
            ))}
          </div>
        );

      case 'learn':
        // Tampilkan loading spinner saat data sedang diambil dari API
        if (isLoadingLearnData) {
          return (
             <div className="p-4 pb-24 flex items-center justify-center h-full min-h-[400px]">
               <div className="flex flex-col items-center space-y-4">
                 <div className="w-12 h-12 border-4 border-green-100 border-t-green-600 rounded-full animate-spin"></div>
                 <p className="text-gray-500 font-bold text-sm">Mengunduh ayat dari Kemenag...</p>
               </div>
             </div>
          );
        }

        const currentLearnData = selectedLearnItem ? selectedLearnItem.data : MOCK_QURAN;
        const { surah, surahNumber = 1, text, verses = 2 } = currentLearnData;
        const displayedText = text.filter(item => item.id >= ayahStart && item.id <= ayahEnd);
        playlistRef.current = displayedText; // Simpan ke ref agar bisa dibaca saat putar otomatis

        return (
          <div className="p-4 pb-24 space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-800">Mode Belajar</h1>
              <div className="flex gap-2">
                 <select 
                   value={selectedQari}
                   onChange={(e) => setSelectedQari(e.target.value)}
                   className="text-xs bg-white border border-gray-200 text-gray-700 px-2 py-1 rounded-full font-bold outline-none shadow-sm"
                 >
                   <option value="Husary_128kbps">Tartil Lambat (Al-Husary)</option>
                   <option value="Alafasy_128kbps">Irama Sedang (Mishary)</option>
                   <option value="Abdul_Basit_Murattal_192kbps">Irama Klasik (Abdul Basit)</option>
                 </select>
                 <button 
                   onClick={() => setActiveTab('quran')}
                   className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold flex items-center gap-1"
                 >
                   <List size={14} /> Ganti Surah/Juz
                 </button>
              </div>
            </div>
            
            <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-6">
              <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                <div>
                  <h2 className="text-2xl font-black text-green-800">{surah}</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                    {selectedLearnItem?.type === 'juz' ? currentLearnData.ayat_range : `Target: Ayat ${ayahStart}-${ayahEnd}`}
                  </p>
                </div>
                <button 
                  onClick={() => displayedText.length > 0 && handlePlayAyah(surahNumber, displayedText[0].id, true)}
                  className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${isAutoplay && isPlayingAudio ? 'bg-red-100 text-red-600 scale-105' : 'bg-green-600 text-white shadow-md hover:bg-green-700'}`}
                >
                  {isAutoplay && isPlayingAudio ? <Pause size={18} /> : <Play size={18} />}
                  {isAutoplay && isPlayingAudio ? 'Jeda' : 'Putar Semua'}
                </button>
              </div>
              
              <div className="flex justify-center mb-2 mt-4">
                <div className="flex bg-gray-100 p-1 rounded-xl w-full">
                  <button 
                    onClick={() => setIsMushafMode(false)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${!isMushafMode ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Mode Terjemah
                  </button>
                  <button 
                    onClick={() => setIsMushafMode(true)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${isMushafMode ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Mode Mushaf
                  </button>
                </div>
              </div>

              {/* Filter Rentang Ayat (Khusus Mode Surah) */}
              {(!selectedLearnItem || selectedLearnItem.type === 'surah') && (
                <div className="flex items-center justify-between bg-green-50/50 p-3 rounded-xl border border-green-100 mb-2">
                  <span className="text-xs font-bold text-green-700 uppercase">Tampilkan Ayat:</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      value={ayahStart} 
                      onChange={(e) => setAyahStart(e.target.value === '' ? '' : Number(e.target.value))}
                      onBlur={() => {
                        let val = Number(ayahStart);
                        if (val < 1 || isNaN(val)) val = 1;
                        if (val > Number(ayahEnd)) val = Number(ayahEnd);
                        setAyahStart(val);
                      }}
                      className="w-14 text-center text-sm font-bold text-green-800 bg-white border border-green-200 rounded-lg p-1 outline-none focus:border-green-500 shadow-sm"
                    />
                    <span className="text-xs text-green-600 font-bold">s/d</span>
                    <input 
                      type="number" 
                      value={ayahEnd} 
                      onChange={(e) => setAyahEnd(e.target.value === '' ? '' : Number(e.target.value))}
                      onBlur={() => {
                        let val = Number(ayahEnd);
                        if (val > verses || isNaN(val)) val = verses;
                        if (val < Number(ayahStart)) val = Number(ayahStart) || 1;
                        setAyahEnd(val);
                      }}
                      className="w-14 text-center text-sm font-bold text-green-800 bg-white border border-green-200 rounded-lg p-1 outline-none focus:border-green-500 shadow-sm"
                    />
                  </div>
                </div>
              )}

              {isMushafMode ? (
                <div className="py-4 px-2" dir="rtl">
                  <p className="text-[28px] leading-[2.5] font-serif text-gray-800 text-right" style={{ wordSpacing: '2px' }}>
                    {displayedText.map(item => (
                      <span 
                        key={item.id} 
                        onClick={() => handlePlayAyah(surahNumber, item.id)}
                        className={`cursor-pointer transition-colors p-1 rounded-lg ${playingAyah === item.id ? 'bg-green-100 text-green-800 shadow-sm' : 'hover:bg-gray-50'}`}
                      >
                        {item.arabic} <span className="text-green-600 font-sans text-xl mx-1 select-none">﴿{item.id}﴾</span>
                      </span>
                    ))}
                  </p>
                </div>
              ) : (
                <div className="space-y-8 py-2">
                  {displayedText.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => handlePlayAyah(surahNumber, item.id)}
                      className={`space-y-3 p-4 rounded-2xl cursor-pointer transition-all border ${playingAyah === item.id ? 'bg-green-50 border-green-200 shadow-sm' : 'bg-transparent border-transparent hover:bg-gray-50'}`}
                    >
                      <div className="flex items-start gap-4 justify-between">
                        <div className="flex flex-col gap-2 mt-2 shrink-0">
                          <button className={`p-2 rounded-full ${playingAyah === item.id ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-400 hover:text-green-600'}`}>
                             {playingAyah === item.id ? <Volume2 size={16} className="animate-pulse" /> : <Play size={16} />}
                          </button>
                          <button onClick={(e) => handleDownloadAyah(surahNumber, item.id, e)} className="p-2 rounded-full bg-blue-50 text-blue-500 hover:text-blue-700 hover:bg-blue-100 transition-colors shadow-sm" title="Download MP3">
                             <Download size={14} />
                          </button>
                        </div>
                        <p className="text-right text-3xl leading-loose font-serif text-gray-800" dir="rtl">
                          {item.arabic} <span className="text-green-600 font-sans text-xl">﴿{item.id}﴾</span>
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed font-medium italic bg-white p-3 rounded-xl border border-gray-100">{item.indo}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3">
              <AlertCircle className="text-blue-600 shrink-0" />
              <p className="text-xs text-blue-700 leading-relaxed">
                <b>Tips At Tahfidz:</b> Dengarkan audio Qari 3x sambil melihat terjemah sebelum memulai setoran buta (Blind Mode).
              </p>
            </div>

            <button 
              onClick={() => setActiveTab('setor')}
              className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-200 flex items-center justify-center gap-3 active:scale-95 transition-transform"
            >
              <Mic size={20} /> Mulai Setoran (Blind Mode)
            </button>
          </div>
        );

      case 'juz':
        return (
          <div className="p-4 pb-24 space-y-4">
             <h1 className="text-xl font-bold text-gray-800">Progres Mutqin</h1>
             
             <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex items-center gap-6">
                <div className="relative w-24 h-24 shrink-0">
                   <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                      <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-green-600" strokeDasharray="263.8" strokeDashoffset="52.7" />
                   </svg>
                   <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-black text-xl leading-none">80%</span>
                      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Selesai</span>
                   </div>
                </div>
                <div className="space-y-1">
                   <p className="font-black text-lg text-gray-800 leading-tight">Juz 30 (Amma)</p>
                   <p className="text-xs text-gray-500 font-medium">24 dari 30 Surah Lulus AI</p>
                   <div className="pt-2 flex gap-1">
                      {[1,2,3,4,5].map(i => <Star key={i} size={14} className={i <= 4 ? "text-yellow-400 fill-yellow-400" : "text-gray-100"} />)}
                   </div>
                </div>
             </div>

             <div className="flex justify-between items-center px-1 pt-2">
                <h2 className="font-bold text-gray-700">Daftar Juz Hafalan</h2>
                <button className="text-[10px] font-bold text-green-600 uppercase">Lihat Semua</button>
             </div>
             
             {[30, 29, 28, 27].map(juz => (
               <div key={juz} className="bg-white p-4 rounded-2xl border border-gray-100 flex justify-between items-center group active:bg-green-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${juz === 30 ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                       {juz}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Juz {juz}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{juz === 30 ? 'Siap Talaqqi' : 'Tahap Mandiri'}</p>
                    </div>
                  </div>
                  {juz === 30 ? (
                    <button className="bg-yellow-500 text-green-900 text-[10px] px-3 py-2 rounded-xl font-black uppercase tracking-wider shadow-sm">Ujian Ustadz</button>
                  ) : (
                    <ChevronRight className="text-gray-300" />
                  )}
               </div>
             ))}
          </div>
        );

      case 'quran':
        const juzList = Array.from({ length: 30 }, (_, i) => {
          const juzNum = i + 1;
          // Rumus standar halaman awal juz pada Al-Qur'an Pojok (Kemenag/Madinah)
          const page = juzNum === 1 ? 1 : (juzNum - 1) * 20 + 2;
          return {
            id: juzNum,
            title: `Juz ${juzNum}`,
            subtitle: juzNum === 30 ? 'Juz Amma' : '',
            page: page
          };
        });

        // Filter data berdasarkan input pencarian
        const filteredSurah = quranData.filter(s => s.surahName.toLowerCase().includes(searchQuery.toLowerCase()));
        const filteredJuz = juzList.filter(j => j.title.toLowerCase().includes(searchQuery.toLowerCase()) || (j.subtitle && j.subtitle.toLowerCase().includes(searchQuery.toLowerCase())));

        return (
          <div className="p-4 pb-24 space-y-4 flex flex-col h-full">
            <h1 className="text-xl font-bold text-gray-800">Al-Qur'an</h1>
            
            {/* Kotak Pencarian */}
            <div className="bg-white rounded-xl p-2 shadow-sm border border-gray-200 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500 flex items-center gap-2 transition-all">
              <div className="pl-2 text-gray-400"><Search size={18} /></div>
              <input 
                type="text" 
                placeholder={quranView === 'surah' ? "Cari nama surah..." : "Cari juz..."}
                className="w-full bg-transparent border-none outline-none text-sm py-1 text-gray-800 placeholder-gray-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="pr-2 text-gray-400 hover:text-red-500 transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Toggle Switch */}
            <div className="flex bg-gray-200 p-1 rounded-xl">
              <button 
                onClick={() => { setQuranView('surah'); setSearchQuery(''); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${quranView === 'surah' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}
              >
                Surah
              </button>
              <button 
                onClick={() => { setQuranView('juz'); setSearchQuery(''); }}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${quranView === 'juz' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}
              >
                Juz
              </button>
            </div>

            {/* List Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col flex-1 min-h-[400px]">
              {/* Header List */}
              <div className="flex justify-between items-center px-5 py-3 border-b border-gray-100 bg-gray-50">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{quranView === 'surah' ? 'Nama Surah' : 'Daftar Juz'}</span>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Hal</span>
              </div>
              
              <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {quranView === 'surah' ? (
                filteredSurah.length > 0 ? (
                  filteredSurah.map((surah) => (
                    <div 
                      key={surah.surahNumber} 
                      onClick={() => handleSelectSurah(surah)}
                      className="flex justify-between items-center p-3 rounded-xl hover:bg-green-50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 group-hover:bg-green-100 text-gray-500 group-hover:text-green-700 font-bold rounded-lg text-xs transition-colors">
                          {surah.surahNumber}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 group-hover:text-green-800 transition-colors">{surah.surahName}</p>
                          <p className="text-[10px] text-gray-400 font-medium">Juz {surah.juz} • {surah.verses} Ayat</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {/* Gunakan data page, jika tidak ada (untuk juz selain 29/30) hitung manual halamannya */}
                        <span className="text-sm font-black text-green-700">{surah.page || (surah.juz === 1 ? 1 : (surah.juz - 1) * 20 + 2)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-gray-400 text-sm font-medium">Surah tidak ditemukan</div>
                )
                ) : (
                filteredJuz.length > 0 ? (
                  filteredJuz.map((juz) => (
                    <div 
                      key={juz.id} 
                      onClick={() => handleSelectJuz(juz)}
                      className="flex justify-between items-center p-3 rounded-xl hover:bg-green-50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 group-hover:bg-green-100 text-gray-500 group-hover:text-green-700 font-bold rounded-lg text-xs transition-colors">
                          {juz.id}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 group-hover:text-green-800 transition-colors">{juz.title}</p>
                          {juz.subtitle && <p className="text-[10px] text-gray-400 font-medium">{juz.subtitle}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-green-700">{juz.page}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 text-gray-400 text-sm font-medium">Juz tidak ditemukan</div>
                )
                )}
              </div>
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="p-4 pb-24 text-center space-y-6">
             <div className="relative mx-auto w-32 h-32 pt-8">
                <div className="w-24 h-24 bg-green-200 rounded-[2rem] mx-auto overflow-hidden border-4 border-white shadow-lg">
                   <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Ahmad" alt="profile" />
                </div>
                <div className="absolute bottom-2 right-4 bg-green-600 text-white p-1.5 rounded-full border-4 border-white">
                   <Award size={16} />
                </div>
             </div>
             
             <div className="space-y-1">
                <h2 className="text-2xl font-black text-gray-800">Ahmad Syarif</h2>
                <p className="text-sm text-gray-500 font-medium">Pegawai Swasta • Hufadz Sejak 2024</p>
             </div>

             <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-2xl border border-gray-100">
                   <p className="text-xl font-black text-green-700">12</p>
                   <p className="text-[10px] font-bold text-gray-400 uppercase">Streak</p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-gray-100">
                   <p className="text-xl font-black text-green-700">4.8</p>
                   <p className="text-[10px] font-bold text-gray-400 uppercase">Avg Score</p>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-gray-100">
                   <p className="text-xl font-black text-green-700">2</p>
                   <p className="text-[10px] font-bold text-gray-400 uppercase">Juz Mutqin</p>
                </div>
             </div>
          </div>
        );

      case 'setor':
        return (
          <div className="flex flex-col h-full bg-white p-6 pb-24">
            {sessionState === 'idle' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
                <div className="relative">
                  <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                    <Mic size={40} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-800">Siap Menghafal?</h2>
                  <p className="text-sm text-gray-500 max-w-xs">AI akan menyimak bacaanmu tanpa menampilkan teks. Fokus pada makhraj dan kelancaran.</p>
                </div>

                <button 
                  onClick={handleStartSetoran}
                  className="w-full bg-green-800 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-green-100 active:scale-95 transition-all"
                >
                  Mulai Setoran Sekarang
                </button>
              </div>
            )}

            {sessionState === 'recording' && (
              <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 rounded-[2.5rem] text-white p-8 relative overflow-hidden">
                <div className="absolute top-12 flex flex-col items-center gap-2">
                   <div className="flex gap-1.5">
                      {[1,2,3].map(i => <div key={i} className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>)}
                   </div>
                   <p className="text-[10px] tracking-widest uppercase font-black text-gray-500">Layar Blind Mode Aktif</p>
                </div>
                
                <div className="flex items-center gap-1.5 h-32">
                  {[...Array(14)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1.5 bg-green-400 rounded-full animate-bounce"
                      style={{ height: `${30 + Math.random() * 70}%`, animationDuration: `${0.4 + Math.random()}s` }}
                    ></div>
                  ))}
                </div>
                
                <div className="text-center mt-12 space-y-1">
                  <p className="text-xl font-bold tracking-tight">AI Sedang Menyimak...</p>
                  <p className="text-xs text-gray-400">
                    Lantunkan {selectedLearnItem ? selectedLearnItem.data.surah : MOCK_QURAN.surah}: 
                    {selectedLearnItem?.type === 'juz' ? selectedLearnItem.data.ayat_range : `Ayat ${ayahStart}-${ayahEnd}`}
                  </p>
                  <p className="text-xs text-green-300 mt-2 truncate max-w-xs px-4 h-4">{transcript || "Menunggu suara..."}</p>
                </div>

                <div className="absolute bottom-12 w-full px-8">
                   <button 
                    onClick={handleStopSetoran}
                    className="w-full py-4 border border-white/20 rounded-2xl text-xs font-bold uppercase tracking-widest text-white bg-red-600/20 hover:bg-red-600/40"
                   >
                     Berhenti Setoran
                   </button>
                </div>
              </div>
            )}

            {sessionState === 'processing' && (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-gray-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <div className="text-center">
                  <p className="font-black text-green-800 uppercase tracking-widest text-xs">Processing</p>
                  <p className="text-sm text-gray-500">AI At Tahfidz sedang menganalisis hafalan...</p>
                </div>
              </div>
            )}

            {sessionState === 'result' && (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="bg-white w-full rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-50 text-center space-y-6">
                  <div className="mx-auto w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                    <Award size={48} />
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Predikat Hafalan</p>
                    <h2 className={`text-4xl font-black ${getPredicate(score).color}`}>{getPredicate(score).label}</h2>
                    <div className="flex justify-center items-end gap-1 pt-2">
                       <span className="text-5xl font-black text-gray-800 leading-none">{score}</span>
                       <span className="text-gray-300 font-bold mb-1">/ 100</span>
                    </div>
                  </div>

                  <div className={`p-5 rounded-2xl ${getPredicate(score).bg} border border-white/50 space-y-2`}>
                    <button 
                      onClick={() => handleSpeakNote(aiNote || getPredicate(score).note)}
                      className={`mx-auto flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all bg-white/50 px-4 py-2 rounded-full shadow-sm ${isSpeakingNote ? 'text-green-700' : 'text-gray-600'}`}
                    >
                       {isSpeakingNote ? <Volume2 size={14} className="animate-pulse" /> : <Volume2 size={14} />} 
                       {isSpeakingNote ? 'Ustadz Sedang Berbicara...' : `Dengarkan Saran ${selectedUstadz}`}
                    </button>
                    <p className="text-sm italic font-medium text-gray-700 leading-relaxed select-text cursor-text">
                      "{aiNote || getPredicate(score).note}"
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={handleCopyResult} 
                      className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${isCopied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {isCopied ? <Check size={18} /> : <Copy size={18} />}
                      {isCopied ? 'Tersalin ke Clipboard!' : 'Salin Hasil Evaluasi'}
                    </button>
                    <button onClick={() => setSessionState('idle')} className="w-full py-4 text-gray-400 font-bold text-sm">
                      Ulangi Setoran Ini
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return <div className="p-4">Pilih tab 'Setor' untuk memulai.</div>;
    }
  };

  return (
    <div className="max-w-md mx-auto h-[800px] bg-gray-50 shadow-2xl rounded-[3.5rem] border-[12px] border-gray-900 overflow-hidden relative font-sans flex flex-col text-gray-800 select-none">
      {/* iOS Style Status Bar */}
      <div className="bg-white h-12 flex justify-between px-10 items-end pb-2 text-[12px] font-bold">
        <span>9:41</span>
        <div className="flex gap-1.5 items-center">
          <div className="w-4 h-2 bg-gray-300 rounded-[2px] relative">
             <div className="absolute right-[-2px] top-0.5 w-1 h-1 bg-gray-300 rounded-full"></div>
             <div className="absolute inset-0 bg-green-500 w-[60%] m-[1px] rounded-[1px]"></div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50">
        {renderTabContent()}
      </div>

      {/* Syukur/Sedekah Modal */}
      {showSedekah && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end justify-center animate-in fade-in duration-300">
          <div className="bg-white w-full rounded-t-[3rem] p-8 pb-12 space-y-6 animate-in slide-in-from-bottom duration-500 shadow-[0_-20px_50px_rgba(0,0,0,0.2)]">
             <div className="flex justify-center">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full"></div>
             </div>
             <button onClick={() => setShowSedekah(false)} className="absolute top-6 right-8 text-gray-300 hover:text-gray-600"><X size={24} /></button>
             <div className="text-center space-y-3">
                <div className="mx-auto w-24 h-24 bg-yellow-50 rounded-[2.5rem] flex items-center justify-center text-yellow-500 mb-2 rotate-3"><Heart size={48} fill="currentColor" /></div>
                <h3 className="text-2xl font-black text-gray-800 tracking-tight">Wujudkan Rasa Syukur</h3>
                <p className="text-sm text-gray-500 leading-relaxed px-4">Alhamdulillah, hafalanmu <b>{selectedLearnItem ? selectedLearnItem.data.surah : MOCK_QURAN.surah}</b> sangat lancar hari ini. Sempurnakan dengan sedekah?</p>
             </div>
             <div className="grid grid-cols-1 gap-4 pt-2">
                <button className="w-full bg-green-700 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-green-100 flex items-center justify-center gap-3 hover:bg-green-800 transition-all"><DollarSign size={20} /> Sedekah Sekarang</button>
             </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <div className="h-24 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-around items-center px-6 pb-6 relative z-50">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center transition-all ${activeTab === 'home' ? 'text-green-700 scale-110' : 'text-gray-300 hover:text-gray-500'}`}>
          <Home size={22} fill={activeTab === 'home' ? "currentColor" : "none"} />
          <span className="text-[9px] font-black mt-1 uppercase tracking-tighter">Sosial</span>
        </button>
        <button onClick={() => setActiveTab('learn')} className={`flex flex-col items-center transition-all ${activeTab === 'learn' ? 'text-green-700 scale-110' : 'text-gray-300 hover:text-gray-500'}`}>
          <BookOpen size={22} fill={activeTab === 'learn' ? "currentColor" : "none"} />
          <span className="text-[9px] font-black mt-1 uppercase tracking-tighter">Belajar</span>
        </button>
        
        {/* Floating Center Mic Button */}
        <div className="relative -top-6">
          <div className="absolute inset-0 bg-green-700 rounded-full blur-xl opacity-20 scale-150"></div>
          <button onClick={() => setActiveTab('setor')} className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all duration-500 transform active:scale-90 ${activeTab === 'setor' ? 'bg-green-700 text-white rotate-[360deg]' : 'bg-white text-gray-400 rotate-0'}`}>
            <Mic size={30} strokeWidth={2.5} />
          </button>
        </div>

        <button onClick={() => setActiveTab('quran')} className={`flex flex-col items-center transition-all ${activeTab === 'quran' ? 'text-green-700 scale-110' : 'text-gray-300 hover:text-gray-500'}`}>
          <List size={22} fill={activeTab === 'quran' ? "currentColor" : "none"} />
          <span className="text-[9px] font-black mt-1 uppercase tracking-tighter">Daftar Surah</span>
        </button>
        <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center transition-all ${activeTab === 'profile' ? 'text-green-700 scale-110' : 'text-gray-300 hover:text-gray-500'}`}>
          <User size={22} fill={activeTab === 'profile' ? "currentColor" : "none"} />
          <span className="text-[9px] font-black mt-1 uppercase tracking-tighter">Profil</span>
        </button>
      </div>

      {/* iPhone Dynamic Island */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-32 h-8 bg-gray-900 rounded-3xl z-[100] flex items-center justify-center">
         <div className="w-12 h-1 bg-gray-800 rounded-full mr-12"></div>
         <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
      </div>
    </div>
  )
}

export default App
