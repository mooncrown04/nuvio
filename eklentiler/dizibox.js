var VER = '1.2.5-EMU_FIX';

// DİKKAT: Bu log dosya yüklendiği an görünmeli!
console.log('--- [Dizibox V' + VER + '] DOSYA AKTİF EDİLDİ ---');

var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

function findFirst(html, pattern) {
    var regex = new RegExp(pattern, 'i');
    var match = regex.exec(html);
    return match ? match : null;
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    // Fonksiyonun içine girdiğimizi teyit edelim
    console.log('[Dizibox V' + VER + '] getStreams ÇALIŞTI -> ID: ' + tmdbId);

    if (mediaType !== 'tv') return [];

    try {
        // 1. TMDB İsteği (Sertifika hatası ihtimaline karşı try-catch içinde)
        console.log('[Dizibox V' + VER + '] TMDB Sorgulanıyor...');
        const tmdbRes = await fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=' + TMDB_KEY + '&language=tr-TR');
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.name || tmdbData.original_name;
        
        console.log('[Dizibox V' + VER + '] Dizi Adı: ' + query);

        // 2. Dizibox Arama (HTTP Kullanıyoruz - Saat hatasından etkilenmemek için)
        var BASE_URL = 'http://www.dizibox.pw'; 
        const searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
        
        console.log('[Dizibox V' + VER + '] Arama Sayfası: ' + searchUrl);
        const sRes = await fetch(searchUrl);
        const html = await sRes.text();

        // 3. Link Ayıklama
        const linkMatch = findFirst(html, 'href="(https?:\\/\\/[^"]+dizibox[^"]+)"[^>]*rel="bookmark"');
        
        if (!linkMatch) {
            console.log('[Dizibox V' + VER + '] HATA: Arama sonucunda link yakalanamadı.');
            return [];
        }

        const epUrl = linkMatch[1].replace('https:', 'http:') + '-sezon-' + seasonNum + '-bolum-' + episodeNum + '-izle/';
        console.log('[Dizibox V' + VER + '] Son Durak: ' + epUrl);

        return [{
            name: "⌜ Dizibox V" + VER + " ⌟",
            url: epUrl,
            quality: "1080p",
            headers: { 'Referer': BASE_URL }
        }];

    } catch (e) {
        console.log('[Dizibox V' + VER + '] KRİTİK HATA: ' + e.message);
        return [];
    }
}

// Nuvio/Mooncrown için tam uyumlu export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
