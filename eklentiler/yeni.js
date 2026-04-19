var API_BASE = 'https://ydfvfdizipanel.ru/public/api';
var API_KEY = '9iQNC5HQwPlaFuJDkhncJ5XTJ8feGXOJatAA';

var API_HEADERS = {
    'hash256': '711bff4afeb47f07ab08a0b07e85d3835e739295e8a6361db77eebd93d96306b',
    'signature': '',
    'User-Agent': 'EasyPlex (Android 14; SM-A546B; Samsung Galaxy A54 5G; tr)',
    'Accept': 'application/json'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Encoding': 'identity',
    'Referer': 'https://ydfvfdizipanel.ru/'
};

function resolveMediaFireLink(link) {
    console.error('[SineWix DEBUG] MediaFire çözülüyor:', link);
    return fetch(link)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var match = html.match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/);
            if (match) console.error('[SineWix DEBUG] MediaFire URL Başarılı');
            return match ? match[1] : link;
        })
        .catch(function(e) { 
            console.error('[SineWix DEBUG] MediaFire Çözme Hatası:', e.message);
            return link; 
        });
}

function buildStreams(videoLinks, title, year) {
    console.error('[SineWix DEBUG] Stream objeleri oluşturuluyor. Sayı:', videoLinks.length);
    return Promise.all(
        videoLinks.map(function(link) {
            var isMF = link.includes('mediafire.com');
            var p = isMF ? resolveMediaFireLink(link) : Promise.resolve(link);
            
            return p.then(function(finalUrl) {
                return {
                    name: title,
                    title: '⌜ SINEWIX ⌟ | ' + (isMF ? 'MF-Server' : 'Server') + ' | 🇹🇷 Dublaj',
                    url: finalUrl,
                    quality: 'Auto',
                    headers: STREAM_HEADERS
                };
            });
        })
    );
}

function fetchDetailAndStreams(sinewixId, sinewixItemType, mediaType, seasonNum, episodeNum) {
    var genre = (mediaType === 'movie') ? 'media' : 'series';
    var endpoint = (mediaType === 'movie') ? 'detail' : 'show';
    var apiUrl = API_BASE + '/' + genre + '/' + endpoint + '/' + sinewixId + '/' + API_KEY;

    console.error('[SineWix DEBUG] Detay API İsteği:', apiUrl);

    return fetch(apiUrl, { headers: API_HEADERS })
        .then(function(res) { 
            if (!res.ok) throw new Error('API Detay Hatası: ' + res.status);
            return res.json(); 
        })
        .then(function(item) {
            var title = item.name || item.title || 'SineWix';
            var year = (item.first_air_date || item.release_date || '').substring(0, 4);
            var videoLinks = [];

            if (mediaType === 'movie') {
                videoLinks = (item.videos || []).map(function(v) { return v.link; }).filter(Boolean);
            } else {
                var targetSeason = (item.seasons || []).find(function(s) { 
                    return parseInt(s.season_number) === parseInt(seasonNum); 
                });
                if (targetSeason) {
                    var targetEp = (targetSeason.episodes || []).find(function(e) {
                        return parseInt(e.episode_number) === parseInt(episodeNum);
                    });
                    if (targetEp) videoLinks = (targetEp.videos || []).map(function(v) { return v.link; }).filter(Boolean);
                }
            }
            return buildStreams(videoLinks, title, year);
        });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error('[SineWix DEBUG] Başlatıldı. TMDB ID:', tmdbId);
    
    var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
    var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

    return fetch(tmdbUrl)
        .then(function(res) { 
            if (!res.ok) throw new Error('TMDB API Erişilemez!');
            return res.json(); 
        })
        .then(function(data) {
            var title = data.title || data.name || '';
            console.error('[SineWix DEBUG] TMDB Başlık Alındı:', title);
            
            if (!title) return [];

            var searchUrl = API_BASE + '/search/' + encodeURIComponent(title) + '/' + API_KEY;
            console.error('[SineWix DEBUG] Arama Başlıyor:', searchUrl);

            return fetch(searchUrl, { headers: API_HEADERS })
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    var results = data.search || [];
                    console.error('[SineWix DEBUG] API Toplam Sonuç:', results.length);

                    var filtered = results.filter(function(item) {
                        var t = (item.type || '').toLowerCase();
                        return mediaType === 'movie' ? t.includes('movie') : (t.includes('serie') || t.includes('anime'));
                    });

                    if (filtered.length === 0) {
                        console.error('[SineWix DEBUG] Kriterlere uygun sonuç bulunamadı.');
                        return [];
                    }

                    console.error('[SineWix DEBUG] En iyi eşleşme ID:', filtered[0].id);
                    return fetchDetailAndStreams(filtered[0].id, filtered[0].type, mediaType, seasonNum, episodeNum);
                });
        })
        .catch(function(err) {
            console.error('[SineWix KRİTİK HATA]:', err.message);
            return [];
        });
}

module.exports = { getStreams };
