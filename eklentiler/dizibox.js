var VER = '1.0.5'; // KOD VERSİYONU
var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

// Dizipal tarzı hafif Regex fonksiyonu
function findFirst(html, pattern) {
    var regex = new RegExp(pattern, 'i');
    var match = regex.exec(html);
    return match ? match : null;
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // Log başlangıcında versiyonu basıyoruz
        console.log('[Dizibox V' + VER + '] İşlem Başladı. ID:', tmdbId, 'S:', seasonNum, 'E:', episodeNum);

        if (mediaType !== 'tv') return resolve([]);

        // Güncel adres (Bloklanırsa buradan değiştirilebilir)
        var BASE_URL = 'https://www.dizibox.pw'; 

        // 1. TMDB'den isim al
        fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=' + TMDB_KEY + '&language=tr-TR')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.original_name;
                console.log('[Dizibox V' + VER + '] Aranan Dizi:', query);

                // 2. Arama Yap
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Regex ile dizi ana sayfasını bul
                var linkMatch = findFirst(html, 'href="(https?:\\/\\/[^"]+dizibox[^"]+)"[^>]*rel="bookmark"') || 
                                findFirst(html, '<h2[^>]*>\\s*<a href="([^"]+)"');

                if (!linkMatch) throw new Error('Arama sonucunda dizi bulunamadı');

                var mainUrl = linkMatch[1].replace(/\/$/, '');
                var epUrl = mainUrl + '-sezon-' + seasonNum + '-bolum-' + episodeNum + '-izle/';
                
                console.log('[Dizibox V' + VER + '] Bölüm Sayfası:', epUrl);
                return fetch(epUrl);
            })
            .then(function(res) { return res.text(); })
            .then(function(epHtml) {
                var streams = [];

                // --- OG ETİKETİ KONTROLÜ ---
                // Bazı temalarda video doğrudan og:video içinde olabilir
                var ogVideo = findFirst(epHtml, 'property="og:video" content="([^"]+)"');
                if (ogVideo) {
                    console.log('[Dizibox V' + VER + '] OG:Video Yakalandı');
                    streams.push({
                        name: '⌜ Dizibox ⌟ | OG Player',
                        url: ogVideo[1],
                        quality: '720p',
                        headers: { 'Referer': BASE_URL }
                    });
                }

                // --- IFRAME TARAMASI ---
                var iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
                var match;
                while ((match = iframeRegex.exec(epHtml)) !== null) {
                    var src = match[1];
                    if (src.includes('vidmoly') || src.includes('player') || src.includes('moly') || src.includes('king')) {
                        var finalUrl = src.startsWith('//') ? 'https:' + src : src;
                        streams.push({
                            name: '⌜ Dizibox ⌟ | ' + (src.includes('vidmoly') ? 'Vidmoly' : 'Kaynak'),
                            url: finalUrl,
                            quality: '1080p',
                            headers: { 'Referer': BASE_URL + '/' }
                        });
                    }
                }

                console.log('[Dizibox V' + VER + '] Toplam Kaynak:', streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[Dizibox V' + VER + '] Hata:', err.message);
                resolve([]);
            });
    });
}

// Nuvio / Mooncrown Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
