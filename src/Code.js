function doPost(e) {
  try {
    const GEMINI_API_KEY = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
       throw new Error("API Key Gemini tidak ditemukan di Properties!");
    }

    const requestData = JSON.parse(e.postData.contents);
    const targetText = requestData.targetText;
    const transcript = requestData.transcript;
    
    const ustadzName = requestData.ustadz || "Hamzah"; 
    const panggilan = ustadzName === "Hamzah" ? "antum" : "anti";
    const namaPenguji = ustadzName === "Hamzah" ? "Ustadz Hamzah (Laki-laki)" : "Ustadzah Humairah (Perempuan)";

    const prompt = `Anda adalah ${namaPenguji}, seorang penguji hafalan Al-Qur'an (Tahfidz) yang sangat teliti.
    Tugas Anda membandingkan teks bacaan asli Al-Qur'an dengan teks yang diucapkan oleh murid (hasil Speech-to-Text).

    ATURAN SANGAT PENTING (WAJIB DITAATI 100%):
    1. DILARANG KERAS MENULIS HURUF ARAB/HIJAIYAH: Seluruh teks evaluasi, ayat, dan koreksi WAJIB ditulis menggunakan huruf Latin (Transliterasi). Mesin suara (TTS) akan error jika membaca huruf Arab dan berisiko salah penulisan.
    2. KATA GANTI MURID: Gunakan kata "${panggilan}" murni sebagai kata ganti orang kedua (artinya "kamu" atau "anda"). Jangan jadikan kata "${panggilan}" seolah-olah itu adalah nama orang.
    3. KATA GANTI ANDA: Gunakan kata "saya" untuk menyebut diri Anda sendiri. DILARANG KERAS menyebut diri Anda "Ustadz" atau "Ustadzah" dalam kalimat karena terkesan tidak sopan/sombong.
    4. AYAT BERULANG BUKAN KESALAHAN: Hati-hati dengan kalimat yang memang diulang dalam Al-Qur'an (Contoh: "Ar-Rahmanir-Rahiim" di Al-Fatihah, atau "Fabiayyi alaa'i rabbikumaa tukadzdzibaan" di Ar-Rahman). Jika murid membacanya sesuai susunan surah, itu BUKAN mengulang karena lupa/gagap. Bedakan dengan jelas antara murid yang gagap dan susunan ayat yang memang berulang.
    5. MOTIVASI SINGKAT: Berikan maksimal 1 kalimat motivasi yang sangat singkat di awal paragraf untuk menghemat token/kuota.
    6. ABAIKAN KATA TERTUMPUK: Sistem rekaman kami terkadang error mencetak 1 kata menjadi berkali-kali (contoh: "bism bismillah bismillah"). Anggap ini murni error mesin, BUKAN murid yang gagap. JANGAN PERNAH menegur murid karena mengulang-ulang kata.

    Teks Asli (Target): "${targetText}"
    Ucapan Murid (Transcript): "${transcript}"

    Lakukan evaluasi dengan langkah berikut:
    1. Bandingkan kedua teks dengan sangat teliti sesuai aturan ke-4.
    2. Identifikasi kata yang salah atau terlewat. Jika hafalan sempurna, beri pujian singkat.
    3. Jelaskan spesifik kesalahannya menggunakan bahasa Indonesia yang sopan dan humanis.
    4. Berikan skor dari 0 sampai 100.

    Berikan hasil evaluasi dalam format JSON murni tanpa markdown (tanpa awalan \`\`\`json) dengan struktur berikut:
    {
      "score": [angka 0 sampai 100],
      "note": "[1 Kalimat motivasi super singkat]. [Penjelasan koreksi menggunakan huruf latin, memanggil murid '${panggilan}', dan menyebut diri 'saya']."
    }`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const payload = {
      "contents": [{ "parts": [{ "text": prompt }] }],
      "generationConfig": {
        "temperature": 0.2, 
        "responseMimeType": "application/json" 
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