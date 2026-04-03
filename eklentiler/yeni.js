// ============================================================
//  M3U Provider — Console Error Debug & Keskin Filtre (v5.7)
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
        var entries = parseM3u(text);
        _m3uCache = entries;
        _m3uFetchedAt = Date.now();
        return entries;
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
    var imdbM = url.match(/(tt\d+)/);
    var yearTagM = meta.match(/year="(\d{4})"/);
    var titleRaw = meta.replace(/#EXTINF[^,]*,/, '').trim();
    var year = yearTagM ? yearTagM[1] : (titleRaw.match(/\d{4}/) ? titleRaw.match(/\d{4}/)[0] : '');
    var title = titleRaw.replace(/\d{4}/g, '').replace(/\(.*\)/g, '').split('-')[0].trim();
    
    return {
        title: title,
        year: year,
        url: url,
        imdbId: imdbM ? imdbM[1] : null,
        author: (meta.match(/group-author="([^"]+)"/) || [])[1] || 'M3U'
    };
}

function normalize(s) {
    return (s || '').toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getMatchScore(entry, tmdb) {
    // 1. KONTROL: IMDb ID (Kesin Eşleşme)
    if (entry.imdbId && tmdb.imdbId && entry.imdbId === tmdb.imdbId) {
        return 1000;
    }

    var et = normalize(entry.title);
    var qt = normalize(tmdb.titleTr);
    var qe = normalize(tmdb.titleEn);

    // 2. KONTROL: İsim Benzerliği
    if (et === qt || et === qe || qt.indexOf(et) !== -1 || et.indexOf(qt) !== -1) {
        var score = 50;
        if (entry.year && tmdb.year && entry.year === tmdb.year) score += 50;
        return score;
    }
    return 0;
}

function fetchTmdbInfo(tmdbId, mediaType) {
    var type = (mediaType === 'tv') ? 'tv' : 'movie';
    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR&append_to_response=external_ids')
    .then(function(r) { return r.json(); })
    .then(function(d) {
        return {
            titleTr: d.title || d.name || '',
            titleEn: d.original_title || d.original_name || '',
            year: (d.release_date || d.first_air_date || '').slice(0, 4),
            imdbId: d.external_ids ? d.external_ids.imdb_id : null
        };
    });
}

function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return Promise.resolve([]); 

    return fetchTmdbInfo(tmdbId, mediaType)
    .then(function(tmdb) {
        // --- CONSOLE ERROR: ARANAN FİLM ---
        console.error("DEBUG: Aranan Film -> " + tmdb.titleTr + " (" + tmdb.year + ") ID: " + tmdb.imdbId);

        return fetchM3u().then(function(entries) {
            var matches = [];
            entries.forEach(function(e) {
                var score = getMatchScore(e, tmdb);
                if (score >= 40) {
                    matches.push({ entry: e, score: score });
                    // --- CONSOLE ERROR: EŞLEŞEN LİNK ---
                    console.error("DEBUG: Eşleşme Bulundu! -> " + e.title + " | Skor: " + score + " | Link: " + e.url.substring(0,30) + "...");
                }
            });

            if (matches.length === 0) {
                console.error("DEBUG: Maalesef hiçbir eşleşme bulunamadı.");
            }

            matches.sort(function(a, b) { return b.score - a.score; });
            
            var results = matches.slice(0, 10).map(function(m) {
                var isVidmody = m.entry.url.includes('vidmody.com');
                return {
                    url: m.entry.url,
                    name: m.entry.title + ' (' + (m.entry.year || tmdb.year) + ')',
                    title: m.entry.author + " [Skor: " + m.score + "]",
                    quality: '1080p',
                    headers: isVidmody ? { 'Referer': 'https://vidmody.com/' } : {}
                };
            });

            return results;
        });
    })
    .catch(function(err) { 
        console.error("DEBUG: Genel Hata -> " + err.message);
        return []; 
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
