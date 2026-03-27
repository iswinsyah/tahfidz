// Membersihkan teks Arab dari harakat agar perbandingan lebih toleran
const normalizeArabic = (text) => {
  if (!text) return '';
  return text
    .replace(/[\u0617-\u061A\u064B-\u0652]/g, '') // Hapus harakat
    .replace(/[^\u0600-\u06FF\s]/g, '')           // Hapus tanda baca selain Arab
    .trim();
};

export const calculateTajwidScore = (sttTranscript, quranText) => {
  const normalizedStt = normalizeArabic(sttTranscript);
  const normalizedQuran = normalizeArabic(quranText);

  if (!normalizedStt || !normalizedQuran) return 0;

  // Algoritma Levenshtein Distance
  const a = normalizedStt;
  const b = normalizedQuran;
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // Deletion
        matrix[i][j - 1] + 1,      // Insertion
        matrix[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  const distance = matrix[a.length][b.length];
  const maxLength = Math.max(a.length, b.length);

  if (maxLength === 0) return 0;

  // Konversi jarak menjadi skor 0 - 100
  const similarityScore = ((maxLength - distance) / maxLength) * 100;
  return Math.max(0, Math.round(similarityScore));
};