// ============================================================
//  M3U Provider — Keskin Eşleştirme & Film İsmi Gösterimi (v5.0)
// ============================================================

var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var _m3uCache     = null;
var _m3uFetchedAt = 0;
var CACHE_TTL     = 3600 * 1000; 

// ── 1. M3U İndirme ve Parse ──────────────────────────────────
function fetchM3u() {
    var now = Date.now();
    if (_m3uCache && (now - _m3uFetchedAt) < CACHE_TTL) return Promise.resolve(_m3uCache);

    return fetch(M3U_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    .then(function(r) { return r.text(); })
    .then(function(text) {
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
    var titleRaw = meta.replace(/#EXTINF[^,]*,/, '').trim();
    var yearM = titleRaw.match(/\((\d{4})\)/);
    var year = yearM ? yearM[1] : '';
    
    var title = titleRaw.replace(/\[\d{2}\.\d{2}\.\d{4}[^\]]*\]/g, '').replace(/\(\d{4}\)/g, '').trim();
    title = title.replace(/\s*[-–]{2,}[\s\S]*/, '').trim();
    
    var logoM = meta.match(/tvg-logo="([^"]+)"/);
    var logo = logoM ? logoM[1] : '';
    var tmdbPosterPath = null;
    if (logo.includes('image.tmdb.org')) {
        var pathM = logo.match(/\/t\/p\/w\d+\/([^\s?]+)/);
        if (pathM) tmdbPosterPath = pathM[1].replace(/^\//, '');
    }

    var imdbM = url.match(/\b(tt\d+)\b/);
    return {
        title: title,
        year: year,
        url: url,
        tmdbPosterPath: tmdbPosterPath,
        imdbId: imdbM ? imdbM[1] : null,
        group: (meta.match(/group-title="([^"]+)"/) || [])[1] || ''
    };
}

// ── 2. Normalize ve Keskin Skorlama ──────────────────────────
function normalize(s) {
    return (s || '').toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getMatchScore(entry, tmdb) {
    if (entry.imdbId && tmdb.imdbId && entry.imdbId === tmdb.imdbId) return 1000;

    var et = normalize(entry.title);
    var qt = normalize(tmdb.titleTr);
    var qe = normalize(tmdb.titleEn);

    var checkWords = function(target, query) {
        if (!query) return 0;
        var words = query.split(' ').filter(function(w) { return w.length > 2; });
        if (words.length === 0) return 0;
        
        var foundAll = true;
        words.forEach(function(w) {
            if (!target.includes(w)) foundAll = false; 
        });
        return foundAll ? 20 : 0;
    };

    var titleScore = Math.max(checkWords(et, qt), checkWords(et, qe));
    if (titleScore === 0) return 0; 

    if (entry.year && tmdb.year) {
        if (entry.year !== tmdb.year) return 0; 
        titleScore += 30;
    }

    if (entry.tmdbPosterPath && tmdb.posterPath && entry.tmdbPosterPath === tmdb.posterPath) {
        titleScore += 80;
    }

    return titleScore;
}

// ── 3. TMDB Verisi ───────────────────────────────────────────
function fetchTmdbInfo(tmdbId, mediaType) {
    var type = (mediaType === 'tv') ? 'tv' : 'movie';
    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR&append_to_response=external_ids')
    .then(function(r) { return r.json(); })
    .then(function(d) {
        return {
            titleTr: d.title || d.name || '',
            titleEn: d.original_title || d.original_name || '',
            year: (d.release_date || d.first_air_date || '').slice(0, 4),
            posterPath: (d.poster_path || '').replace(/^\//, ''),
            imdbId: d.external_ids ? d.external_ids.imdb_id : null
        };
    });
}

// ── 4. Ana Fonksiyon (Dinamik İsimlendirme Sabitlendi) ───────
function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return Promise.resolve([]); 

    return fetchTmdbInfo(tmdbId, mediaType)
    .then(function(tmdb) {
        return fetchM3u().then(function(entries) {
            var matches = [];
            entries.forEach(function(e) {
                var score = getMatchScore(e, tmdb);
                if (score >= 20) matches.push({ entry: e, score: score });
            });

            matches.sort(function(a, b) { return b.score - a.score; });
            
            // İlk 3 en iyi eşleşmeyi göster
            var promises = matches.slice(0, 3).map(function(m) {
                var isVidmody = m.entry.url.includes('vidmody.com');
                var yearLabel = m.entry.year || tmdb.year;
                
                // Burası kritik: Liste ekranında görünen isim "name" alanıdır.
                // Bulunan film ismini buraya yazıyoruz.
                var finalName = m.entry.title + ' (' + yearLabel + ')';

                return Promise.resolve([{
                    url: m.entry.url,
                    name: finalName, // EKRANDA GÖRÜNECEK ANA İSİM
                    title: isVidmody ? 'Vidmody HD - 1080p' : (m.entry.group || 'M3U'), // Alt bilgi/Detay
                    quality: '1080p',
                    headers: isVidmody ? { 'Referer': 'https://vidmody.com/' } : {}
                }]);
            });

            return Promise.all(promises).then(function(res) {
                return [].concat.apply([], res);
            });
        });
    })
    .catch(function() { return []; });
}

// Export
if (typeof module !== 'undefined') module.exports = { getStreams };
