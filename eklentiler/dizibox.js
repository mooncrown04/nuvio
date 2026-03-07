var VER = '1.2.1-PC_EMU';

// Sistem yüklenir yüklenmez bir işaret bırakalım
console.log('[Dizibox V' + VER + '] DOSYA SİSTEME YÜKLENDİ');

var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log('[Dizibox V' + VER + '] getStreams tetiklendi! ID: ' + tmdbId);
    
    try {
        if (mediaType !== 'tv') return [];

        // Adım 1: TMDB Testi
        const tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=' + TMDB_KEY + '&language=tr-TR';
        console.log('[Dizibox V' + VER + '] TMDB isteği gidiyor...');
        
        const res = await fetch(tmdbUrl);
        const data = await res.json();
        const query = data.name || data.original_name;
        
        console.log('[Dizibox V' + VER + '] Dizi adı yakalandı: ' + query);

        // Adım 2: Arama Testi (PC'de bazen .pw açılmazsa .live dene)
        const searchUrl = 'https://www.dizibox.pw/?s=' + encodeURIComponent(query);
        console.log('[Dizibox V' + VER + '] Siteye bağlanılıyor: ' + searchUrl);
        
        const sRes = await fetch(searchUrl);
        const html = await sRes.text();
        
        // Link yakalama (En basit Regex)
        const linkMatch = html.match(/href="(https?:\/\/www\.dizibox\.pw\/[^"]+)"[^>]*rel="bookmark"/i);
        
        if (!linkMatch) {
            console.log('[Dizibox V' + VER + '] HATA: Arama sonuç sayfasında link bulunamadı.');
            return [];
        }

        const epUrl = linkMatch[1].replace(/\/$/, '') + '-sezon-' + seasonNum + '-bolum-' + episodeNum + '-izle/';
        console.log('[Dizibox V' + VER + '] Hedef Bölüm: ' + epUrl);

        return [{
            name: '⌜ Dizibox V' + VER + ' ⌟',
            url: epUrl, // Test amaçlı sayfa URL'sini dönüyoruz
            quality: '1080p'
        }];

    } catch (e) {
        console.log('[Dizibox V' + VER + '] KRİTİK HATA: ' + e.message);
        return [];
    }
}

// Global Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
