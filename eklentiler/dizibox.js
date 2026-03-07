var VER = '1.0.6-PC_TEST'; 
var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

function findFirst(html, pattern) {
    var regex = new RegExp(pattern, 'i');
    var match = regex.exec(html);
    return match ? match : null;
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log('[Dizibox V' + VER + '] --- TEST BAŞLADI ---');
    
    if (mediaType !== 'tv') {
        console.log('[Dizibox V' + VER + '] Tip dizi değil, iptal.');
        return [];
    }

    try {
        // ADIM 1: TMDB Bağlantısı
        console.log('[Dizibox V' + VER + '] 1. TMDB isteği gönderiliyor...');
        const tmdbRes = await fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=' + TMDB_KEY + '&language=tr-TR');
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.name || tmdbData.original_name;
        console.log('[Dizibox V' + VER + '] 1. Başarılı. Dizi:', query);

        // ADIM 2: Arama Bağlantısı
        var BASE_URL = 'https://www.dizibox.pw'; 
        console.log('[Dizibox V' + VER + '] 2. Arama yapılıyor:', BASE_URL);
        
        const searchRes = await fetch(BASE_URL + '/?s=' + encodeURIComponent(query));
        if (!searchRes.ok) throw new Error('Site cevap vermedi: ' + searchRes.status);
        
        const html = await searchRes.text();
        console.log('[Dizibox V' + VER + '] 2. HTML boyutu:', html.length);

        // ADIM 3: Link Ayıklama
        const linkMatch = findFirst(html, 'href="(https?:\\/\\/[^"]+dizibox[^"]+)"[^>]*rel="bookmark"');
        if (!linkMatch) {
            console.log('[Dizibox V' + VER + '] !!! HATA: Arama sayfasında dizi linki bulunamadı.');
            return [];
        }
        
        const epUrl = linkMatch[1].replace(/\/$/, '') + '-sezon-' + seasonNum + '-bolum-' + episodeNum + '-izle/';
        console.log('[Dizibox V' + VER + '] 3. Bölüm URL oluştu:', epUrl);

        // ADIM 4: Iframe Taraması
        const epRes = await fetch(epUrl);
        const epHtml = await epRes.text();
        
        const streams = [];
        const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
        var match;

        while ((match = iframeRegex.exec(epHtml)) !== null) {
            let src = match[1];
            if (src.includes('vidmoly') || src.includes('player') || src.includes('moly')) {
                streams.push({
                    name: '⌜ Dizibox ⌟ | V' + VER,
                    url: src.startsWith('//') ? 'https:' + src : src,
                    quality: '1080p',
                    headers: { 'Referer': BASE_URL + '/' }
                });
            }
        }

        console.log('[Dizibox V' + VER + '] İşlem bitti. Bulunan:', streams.length);
        return streams;

    } catch (err) {
        console.log('[Dizibox V' + VER + '] !!! KRİTİK HATA:', err.message);
        return [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
