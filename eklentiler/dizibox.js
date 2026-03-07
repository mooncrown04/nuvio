var VER = '1.3.0'; 
// Saat farkı olsa bile dosyanın yüklendiğini görmek için düz log
console.log('>>> [Dizibox V' + VER + '] KOD YÜKLENDİ - TEST BAŞLIYOR <<<');

var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

function findFirst(html, pattern) {
    var regex = new RegExp(pattern, 'i');
    var match = regex.exec(html);
    return match ? match : null;
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log('[Dizibox V' + VER + '] Sorgu Tetiklendi. TMDB ID: ' + tmdbId);

    if (mediaType !== 'tv') return [];

    try {
        // SSL/Saat hatasını aşmak için TMDB isteğini try-catch içine alıyoruz
        console.log('[Dizibox V' + VER + '] 1. TMDB Bilgisi Çekiliyor...');
        const tmdbRes = await fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=' + TMDB_KEY + '&language=tr-TR');
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.name || tmdbData.original_name;
        
        console.log('[Dizibox V' + VER + '] 2. Dizi Adı Bulundu: ' + query);

        // PC Emülatörü için HTTP kullanımı (Sertifika hatasını bypass eder)
        var BASE_URL = 'http://www.dizibox.pw'; 
        const searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
        
        console.log('[Dizibox V' + VER + '] 3. Arama Yapılıyor: ' + searchUrl);
        
        const sRes = await fetch(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const html = await sRes.text();

        // Regex ile link ayıklama
        const linkMatch = findFirst(html, 'href="(http[^"]+dizibox[^"]+)"[^>]*rel="bookmark"') || 
                          findFirst(html, '<h2[^>]*>\\s*<a href="([^"]+)"');

        if (!linkMatch) {
            console.log('[Dizibox V' + VER + '] !!! HATA: Arama sonuçlarında link bulunamadı.');
            return [];
        }

        // HTTPS'i HTTP'ye çevirerek emülatörün "Certificate Trust" hatasını atlıyoruz
        const targetUrl = linkMatch[1].replace('https:', 'http:').replace(/\/$/, '') + 
                          '-sezon-' + seasonNum + '-bolum-' + episodeNum + '-izle/';
        
        console.log('[Dizibox V' + VER + '] 4. Bölüm Sayfasına Gidiliyor: ' + targetUrl);

        return [{
            name: "⌜ Dizibox V" + VER + " ⌟",
            url: targetUrl,
            quality: "1080p",
            headers: { 'Referer': BASE_URL }
        }];

    } catch (err) {
        console.log('[Dizibox V' + VER + '] !!! KRİTİK HATA: ' + err.message);
        // Eğer hata TMDB'den kaynaklıysa, loglardan göreceğiz.
        return [];
    }
}

// Global Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
