// ============================================================
//  M3U Provider — Kesin İsim Yakalama & Debug (v5.8)
// ============================================================

var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var _m3uCache     = null;
var _m3uFetchedAt = 0;
var CACHE_TTL     = 3600 * 1000; 

function fetchM3u() {
    var now = Date.now();
    if (_m3uCache && (now - _m3uFetchedAt) < CACHE_TTL) return Promise.resolve(_m3uCache);
    return fetch(M3U_URL).then(function(r) { return r.text(); }).then(function(text) {
        _m3uCache = parseM3u(text);
        _m3uFetchedAt = Date.now();
        return _m3uCache;
    });
}

function parseM3u(text) {
    var lines = text.split('\n');
    var entries = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line.indexOf('#EXTINF') === 0) {
            var url = (lines[i+1] && lines[i+1].indexOf('#') !== 0) ? lines[i+1].trim() : '';
            if (url) {
                var entry = parseExtInf(line, url);
                if (entry) entries.push(entry);
            }
        }
    }
    return entries;
}

function parseExtInf(meta, url) {
    // 1. IMDb ID Yakala (Kesin)
    var imdbM = url.match(/(tt\d+)/);
    
    // 2. İsim Yakalama: Virgülden sonraki TÜM metni al (En güvenli yöntem)
    var commaIndex = meta.lastIndexOf(',');
    var titleRaw = (commaIndex !== -1) ? meta.substring(commaIndex + 1).trim() : "Bilinmiyor";
    
    // 3. Yıl Yakalama (Hem etiket hem isimden)
    var yearTagM = meta.match(/year="(\d{4})"/);
    var year = yearTagM ? yearTagM[1] : (titleRaw.match(/\d{4}/) ? titleRaw.match(/\d{4}/)[0] : '');
    
    // 4. Temiz İsim (Yılı ve parantezleri sil)
    var title = titleRaw.replace(/\d{4}/g, '').replace(/\(.*\)/g, '').split('-')[0].trim();
    
    // 5. Author Yakala
    var authorM = meta.match(/group-author="([^"]+)"/);
    var author = authorM ? authorM[1] : 'M3U';

    return {
        title: title,
        year: year,
        url: url,
        imdbId: imdbM ? imdbM[1] : null,
        author: author,
        rawTitle: titleRaw // Debug için
    };
}

function normalize(s) {
    return (s || '').toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getMatchScore(entry, tmdb) {
    // KURAL 1: IMDb ID varsa direkt bitir
    if (entry.imdbId && tmdb.imdbId && entry.imdbId === tmdb.imdbId) return 1000;

    var et = normalize(entry.title);
    var qt = normalize(tmdb.titleTr);
    var qe = normalize(tmdb.titleEn);

    // Boş isim kontrolü (Senin logdaki sorunun çözümü)
    if (et.length < 2) return 0;

    // KURAL 2: İsim benzerliği
    if (et === qt || et === qe || qt.indexOf(et) !== -1 || et.indexOf(qt) !== -1) {
        var score = 50;
        if (entry.year && tmdb.year && entry.year === tmdb.year) score += 50;
        return score;
    }
    return 0;
}

function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return Promise.resolve([]); 

    var type = (mediaType === 'tv') ? 'tv' : 'movie';
    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR&append_to_response=external_ids')
    .then(function(r) { return r.json(); })
    .then(function(tmdbData) {
        var tmdb = {
            titleTr: tmdbData.title || tmdbData.name || '',
            titleEn: tmdbData.original_title || tmdbData.original_name || '',
            year: (tmdbData.release_date || tmdbData.first_air_date || '').slice(0, 4),
            imdbId: tmdbData.external_ids ? tmdbData.external_ids.imdb_id : null
        };

        console.error("DEBUG: ARANAN -> " + tmdb.titleTr + " (" + tmdb.year + ")");

        return fetchM3u().then(function(entries) {
            var matches = [];
            entries.forEach(function(e) {
                var score = getMatchScore(e, tmdb);
                if (score >= 40) {
                    matches.push({ entry: e, score: score });
                    console.error("DEBUG: BULDUM -> " + e.title + " | Skor: " + score);
                }
            });

            matches.sort(function(a, b) { return b.score - a.score; });
            
            return matches.slice(0, 10).map(function(m) {
                var isVidmody = m.entry.url.includes('vidmody.com');
                return {
                    url: m.entry.url,
                    name: m.entry.title + ' (' + (m.entry.year || tmdb.year) + ')',
                    title: m.entry.author + " [Skor: " + m.score + "]",
                    quality: '1080p',
                    headers: isVidmody ? { 'Referer': 'https://vidmody.com/' } : {}
                };
            });
        });
    })
    .catch(function(err) { 
        console.error("DEBUG: Hata oluştu -> " + err.message);
        return []; 
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
