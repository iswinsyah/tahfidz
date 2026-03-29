function doPost(e) {
  try {
    const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
       throw new Error("API Key Gemini tidak ditemukan di Properties!");
    }

    const requestData = JSON.parse(e.postData.contents);
    const targetText = requestData.targetText;
    const audioData = requestData.audio; // File Voice Note (Base64)
    
    const ustadzName = requestData.ustadz || "Hamzah"; 
    const panggilan = ustadzName === "Hamzah" ? "antum" : "anti";
    const namaPenguji = ustadzName === "Hamzah" ? "Ustadz Hamzah (Laki-laki)" : "Ustadzah Humairah (Perempuan)";

    const prompt = `Anda adalah ${namaPenguji}, seorang penguji hafalan Al-Qur'an (Tahfidz) yang sangat teliti.
    Tugas Anda mendengarkan rekaman suara murid secara langsung dan membandingkannya dengan teks bacaan asli Al-Qur'an.

    ATURAN SANGAT PENTING (WAJIB DITAATI 100%):
    1. DILARANG KERAS MENULIS HURUF ARAB/HIJAIYAH: Seluruh teks evaluasi, ayat, dan koreksi WAJIB ditulis menggunakan huruf Latin (Transliterasi). Mesin suara (TTS) akan error jika membaca huruf Arab dan berisiko salah penulisan.
    2. KATA GANTI MURID: Gunakan kata "${panggilan}" murni sebagai kata ganti orang kedua (artinya "kamu" atau "anda"). Jangan jadikan kata "${panggilan}" seolah-olah itu adalah nama orang.
    3. KATA GANTI ANDA: Gunakan kata "saya" untuk menyebut diri Anda sendiri. DILARANG KERAS menyebut diri Anda "Ustadz" atau "Ustadzah" dalam kalimat karena terkesan tidak sopan/sombong.
    4. AYAT BERULANG BUKAN KESALAHAN: Hati-hati dengan kalimat yang memang diulang dalam Al-Qur'an (Contoh: "Ar-Rahmanir-Rahiim" di Al-Fatihah, atau "Fabiayyi alaa'i rabbikumaa tukadzdzibaan" di Ar-Rahman). Jika murid membacanya sesuai susunan surah, itu BUKAN mengulang karena lupa/gagap. Bedakan dengan jelas antara murid yang gagap dan susunan ayat yang memang berulang.
    5. MOTIVASI SINGKAT: Berikan maksimal 1 kalimat motivasi yang sangat singkat di awal paragraf untuk menghemat token/kuota.
    6. PENILAIAN AUDIO MULTIMODAL: Dengarkan audio dengan jeli. Nilai ketepatan hafalan, kelancaran, dan makhraj secara objektif.

    Teks Asli (Target): "${targetText}"

    Lakukan evaluasi dengan langkah berikut:
    1. Dengarkan rekaman audio murid dari awal sampai akhir. Tuliskan transkrip apa yang Anda dengar.
    2. Bandingkan transkrip tersebut dengan Teks Asli dengan teliti sesuai aturan ke-4.
    3. Identifikasi kata yang salah makhraj, salah baris, atau terlewat. Jika hafalan sempurna, beri pujian.
    4. Jelaskan spesifik kesalahannya menggunakan bahasa Indonesia yang sopan dan humanis.
    5. Berikan skor dari 0 sampai 100.

    Berikan hasil evaluasi dalam format JSON murni tanpa markdown (tanpa awalan \`\`\`json) dengan struktur berikut:
    {
      "ai_heard": "[Tuliskan kata demi kata apa yang Anda dengar dari audio. Jika hanya suara hening/noise, tulis 'Saya tidak mendengar suara bacaan']",
      "score": [angka 0 sampai 100],
      "note": "[1 Kalimat motivasi super singkat]. [Penjelasan koreksi menggunakan huruf latin, memanggil murid '${panggilan}', dan menyebut diri 'saya']."
    }`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    // PENTING: File Audio harus diletakkan SEBELUM teks instruksi agar AI mendengarkannya terlebih dahulu
    let parts = [];

    // Sisipkan file audio langsung ke AI Google
    if (audioData && audioData.base64) {
       parts.push({
         "inlineData": {
           "mimeType": audioData.mimeType || "audio/webm",
           "data": audioData.base64
         }
       });
    }
    
    parts.push({ "text": prompt });

    const payload = {
      "contents": [{ "parts": parts }],
      "generationConfig": {
        "temperature": 0.2,
        "responseMimeType": "application/json",
        "responseSchema": {
          "type": "OBJECT",
          "properties": {
            "ai_heard": { "type": "STRING", "description": "Tuliskan persis apa yang Anda dengar dari audio. Jika hening/kosong tulis 'Kosong'." },
            "score": { "type": "INTEGER" },
            "note": { "type": "STRING" }
          },
          "required": ["ai_heard", "score", "note"]
        }
      }
    };

    const options = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };

    const response = UrlFetchApp.fetch(geminiUrl, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode !== 200) {
       throw new Error("Ditolak oleh Gemini: " + responseText);
    }

    const responseJson = JSON.parse(responseText);
    let geminiText = responseJson.candidates[0].content.parts[0].text;

    return ContentService.createTextOutput(geminiText)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    const errorRes = {
      "score": 0,
      "note": "Maaf, saya sedang mengalami kendala teknis. Detail: " + error.message
    };
    return ContentService.createTextOutput(JSON.stringify(errorRes))
      .setMimeType(ContentService.MimeType.JSON);
  }
}