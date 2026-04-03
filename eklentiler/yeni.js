// ============================================================
//  M3U Provider — IMDb ID Öncelikli & Çoklu Kaynak (v5.2)
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
    // 1. Linkten IMDb ID Çekme (tt000000)
    var imdbM = url.match(/\b(tt\d+)\b/);
    
    // 2. year="..." tagına bak
    var yearTagM = meta.match(/year="(\d{4})"/);
    var year = yearTagM ? yearTagM[1] : '';

    // 3. Virgülden sonraki Saf İsmi Al
    var titleRaw = meta.replace(/#EXTINF[^,]*,/, '').trim();
    
    // Eğer etiket yoksa parantezden yılı dene
    if (!year) {
        var yearM = titleRaw.match(/\((\d{4})\)/);
        year = yearM ? yearM[1] : '';
    }
    
    // İsmi temizle (Yıl ve ekleri at)
    var title = titleRaw.replace(/\(\d{4}\)/g, '').split('-')[0].trim();
    
    // Logo ve Group bilgileri
    var logoM = meta.match(/tvg-logo="([^"]+)"/);
    var groupM = meta.match(/group-title="([^"]+)"/);
    var authorM = meta.match(/group-author="([^"]+)"/);

    return {
        title: title,
        year: year,
        url: url,
        imdbId: imdbM ? imdbM[1] : null,
        group: (groupM ? groupM[1] : 'Film'),
        author: (authorM ? authorM[1] : 'M3U')
    };
}

// ── 2. Normalize ve Skorlama ───────────────────────────────
function normalize(s) {
    return (s || '').toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getMatchScore(entry, tmdb) {
    // KRİTİK: İlk Kontrol IMDb ID (Kesin eşleşme)
    if (entry.imdbId && tmdb.imdbId && entry.imdbId === tmdb.imdbId) return 1000;

    var et = normalize(entry.title);
    var qt = normalize(tmdb.titleTr);
    var qe = normalize(tmdb.titleEn);

    // İsim kelime kontrolü
    var checkWords = function(target, query) {
        if (!query) return 0;
        var words = query.split(' ').filter(function(w) { return w.length > 2; });
        if (words.length === 0) return 0;
        var foundAll = true;
        words.forEach(function(w) { if (!target.includes(w)) foundAll = false; });
        return foundAll ? 50 : 0;
    };

    var titleScore = Math.max(checkWords(et, qt), checkWords(et, qe));
    if (titleScore === 0) return 0; 

    // Yıl kontrolü (Tag veya parantezden gelen yıl)
    if (entry.year && tmdb.year) {
        if (entry.year !== tmdb.year) return 0; 
        titleScore += 50;
    }

    return titleScore;
}

// ── 3. TMDB & GetStreams ─────────────────────────────────────
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
        return fetchM3u().then(function(entries) {
            var matches = [];
            entries.forEach(function(e) {
                var score = getMatchScore(e, tmdb);
                // Skoru yüksek olan tüm kaynakları kabul et
                if (score >= 40) matches.push({ entry: e, score: score });
            });

            // Skorlara göre sırala (IMDb olanlar en üstte)
            matches.sort(function(a, b) { return b.score - a.score; });
            
            // İlk 5 eşleşmeyi (linki) göster
            var streams = matches.slice(0, 5).map(function(m) {
                var isVidmody = m.entry.url.includes('vidmody.com');
                
                return {
                    url: m.entry.url,
                    name: m.entry.title + ' (' + (m.entry.year || tmdb.year) + ')',
                    title: m.entry.author + ' - ' + m.entry.group, // Hangi kaynaktan geldiği burada yazar
                    quality: '1080p',
                    headers: isVidmody ? { 'Referer': 'https://vidmody.com/' } : {}
                };
            });

            return streams;
        });
    })
    .catch(function() { return []; });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
