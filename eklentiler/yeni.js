/**
 * SineWix_v29_Auth_Bypass
 * "Unauthorized" hatasını aşmak için sadeleştirilmiş yetkilendirme.
 */

var API_BASE = 'https://ydfvfdizipanel.ru/public/api';
var API_KEY = '9iQNC5HQwPlaFuJDkhncJ5XTJ8feGXOJatAA';

var API_HEADERS = {
    // Hash256 bazen kilitleyebilir, bu yüzden opsiyonel bırakıyoruz
    'User-Agent': 'EasyPlex (Android 14; SM-A546B; Samsung Galaxy A54 5G; tr)',
    'Accept': 'application/json',
    'X-Requested-With': 'com.easyplex.official'
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        const tmdbType = (mediaType === 'movie') ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const data = await tmdbRes.json();
        const title = (data.title || data.name || "").trim();

        if (!title) return [];

        // ÖNEMLİ: Bazı panellerde /search/key/isim veya /search/isim/key sırası değişebilir.
        // Bizim mevcut: /search/isim/key
        const searchUrl = `${API_BASE}/search/${encodeURIComponent(title)}/${API_KEY}`;
        
        console.error("[SineWix ANALIZ] Auth Denemesi Yapılıyor...");

        const sRes = await fetch(searchUrl, { headers: API_HEADERS });
        const rawText = await sRes.text();
        console.error("[SineWix ANALIZ] Yanıt: " + rawText);

        if (rawText.includes("Unauthorized")) {
             console.error("[SineWix ANALIZ] Key hala geçersiz. Yeni bir API KEY veya Hash lazım.");
             return [];
        }

        const sData = JSON.parse(rawText);
        // ... (Veri işleme kısmı aynı kalacak)
        
        return []; // Test amaçlı boş dönüyoruz, önce şu "Unauthorized" yazısını logda silelim.

    } catch (e) {
        return [];
    }
}

module.exports = { getStreams };
