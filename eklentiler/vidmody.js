// Global değişkenleri tanımlayalım (bazı ortamlar bunları en üstte bekler)
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "6.4.0-FINAL-DEBUG";

async function getStreams(tmdbId, mediaType) {
    // Uygulama bu fonksiyona girdiğinde ilk bu logu görmelisin
    console.log(`[DEBUG] getStreams tetiklendi. ID: ${tmdbId}, Tip: ${mediaType}`);

    if (mediaType === 'tv') {
        console.log("[DEBUG] Media tipi TV, desteklenmiyor.");
        return [];
    }

    try {
        const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`;
        console.log(`[DEBUG] TMDB isteği atılıyor: ${url}`);

        const tmdbRes = await fetch(url);
        if (!tmdbRes.ok) {
            console.error(`[ERROR] TMDB Yanıt Vermedi: ${tmdbRes.status}`);
            return [];
        }

        const d = await tmdbRes.json();
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null;
        const movieTitle = d.title || "Film";

        if (!imdbId) {
            console.error("[ERROR] IMDb ID bulunamadı!");
            return [];
        }

        console.log(`[DEBUG] IMDb ID bulundu: ${imdbId}`);

        const results = [
            {
                url: `https://vidsrc.to/embed/movie/${imdbId}`,
                name: "VidSrc",
                title: `[VidSrc] ${movieTitle}`,
                quality: "1080p",
                score: 100
            },
            {
                url: `https://multiembed.mov/?video_id=${imdbId}`,
                name: "MultiEmbed",
                title: `[Multi] ${movieTitle}`,
                quality: "1080p",
                score: 90
            }
        ];

        console.log(`[DEBUG] Başarılı! ${results.length} kaynak gönderiliyor.`);
        return results;

    } catch (e) {
        // Hata logu burada: e.stack tüm hata yolunu gösterir
        console.error(`[CRITICAL] getStreams içinde hata oluştu: ${e.message}`);
        console.error(e.stack);
        return [];
    }
}

// --- KRİTİK KISIM: Fonksiyonu her türlü dışa aktar ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams }; 
} 

// Bazı Android ortamları globalThis veya doğrudan fonksiyon adını bekler
globalThis.getStreams = getStreams;
