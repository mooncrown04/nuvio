// ============================================================
//  M3U Provider — birlesik.m3u (v2.0 - Keskin Eşleştirme)
// ============================================================

var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3u/refs/heads/main/birlesik.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var _m3uCache     = null;
var _m3uFetchedAt = 0;
var CACHE_TTL     = 3600 * 1000; 

// ── M3U İndir ───────────────────────────────────────────────
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
    
    // Temizleme işlemleri
    var title = titleRaw.replace(/\[\d{2}\.\d{2}\.\d{4}[^\]]*\]/g, '').replace(/\(\d{4}\)/g, '').trim();
    title = title.replace(/\s*[-–]{2,}[\s\S]*/, '').trim();
    
    var logoM = meta.match(/tvg-logo="([^"]+)"/);
    var logo = logoM ? logoM[1] : '';
    var tmdbPosterPath = null;
    if (logo.includes('image.tmdb.org')) {
        var pathM = logo.match(/\/t\/p\/w\d+\/(.+)$/);
        if (pathM) tmdbPosterPath = pathM[1];
    }

    var imdbM = url.match(/\b(tt\d+)\b/);
    return {
        title: title,
        year: year,
        url: url,
        logo: logo,
        tmdbPosterPath: tmdbPosterPath,
        imdbId: imdbM ? imdbM[1] : null,
        group: (meta.match(/group-title="([^"]+)"/) || [])[1] || ''
    };
}

// ── TMDB Bilgisi (IMDb ID Dahil) ──────────────────────────────
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

// ── Normalize ve Skorlama ─────────────────────────────────────
function normalize(s) {
    return (s || '').toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function titleScore(entryTitle, qTr, qEn) {
    var et = normalize(entryTitle);
    var qt = normalize(qTr);
    var qe = normalize(qEn);
    if (et === qt || et === qe) return 20;

    var check = function(target, query) {
        if (!query) return 0;
        var words = query.split(' ').filter(w => w.length > 2);
        var matches = words.filter(w => target.includes(w)).length;
        return (matches >= words.length / 2) ? matches * 3 : 0;
    };
    return Math.max(check(et, qt), check(et, qe));
}

// ── Eşleştirme Motoru ────────────────────────────────────────
function findMatches(entries, tmdb) {
    var results = [];
    entries.forEach(function(e) {
        var score = 0;

        // 1. IMDb ID Eşleşmesi (Altın Kural)
        if (e.imdbId && tmdb.imdbId && e.imdbId === tmdb.imdbId) score += 100;

        // 2. Poster Path Eşleşmesi
        if (e.tmdbPosterPath && tmdb.posterPath && e.tmdbPosterPath === tmdb.posterPath) score += 80;

        // 3. Başlık Skoru
        score += titleScore(e.title, tmdb.titleTr, tmdb.titleEn);

        // 4. Yıl Kontrolü ve Ceza Sistemi
        if (e.year && tmdb.year) {
            if (e.year === tmdb.year) score += 10;
            else score -= 20; // Yıl farklıysa skoru ağır düşür
        }

        if (score >= 10) results.push({ entry: e, score: score });
    });

    return results.sort((a, b) => b.score - a.score);
}

// ── Stream Üretimi ───────────────────────────────────────────
function entryToStream(entry) {
    var isVidmody = entry.url.includes('vidmody.com');
    if (isVidmody) {
        // Vidmody için daha önce yazdığımız fetchVidmodyStreams fonksiyonu buraya entegre edilebilir
        // Basitlik için şimdilik direkt link dönüyoruz:
        return Promise.resolve([{
            url: entry.url,
            name: 'Vidmody HD',
            quality: '1080p',
            headers: { 'Referer': 'https://vidmody.com/' }
        }]);
    }
    return Promise.resolve([{
        url: entry.url,
        name: entry.group || 'M3U Kaynak',
        quality: 'Auto'
    }]);
}

// ── Ana Fonksiyon ────────────────────────────────────────────
function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return Promise.resolve([]); // Sadece film desteği

    return fetchTmdbInfo(tmdbId, mediaType)
    .then(function(tmdb) {
        return fetchM3u().then(function(entries) {
            var matches = findMatches(entries, tmdb);
            if (matches.length === 0) return [];

            // En yüksek skorlu ilk 3 eşleşmeyi al
            var promises = matches.slice(0, 3).map(m => entryToStream(m.entry));
            return Promise.all(promises).then(function(res) {
                return [].concat.apply([], res);
            });
        });
    })
    .catch(() => []);
}

if (typeof module !== 'undefined') module.exports = { getStreams };
