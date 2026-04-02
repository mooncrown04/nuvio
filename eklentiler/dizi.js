// ============================================================
//  M3U Dizi Provider — Sezon & Bölüm Keskin Eşleştirme (v5.1)
// ============================================================

var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_diziler.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var _m3uCache     = null;
var _m3uFetchedAt = 0;
var CACHE_TTL     = 1800 * 1000; // 30 dakika (Diziler sık güncellendiği için süreyi kısalttım)

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
    
    // Python scriptinin ürettiği S01E01 formatını yakalayalım
    var epMatch = titleRaw.match(/S(\d{1,2})E(\d{1,3})/i);
    var season = epMatch ? parseInt(epMatch[1]) : null;
    var episode = epMatch ? parseInt(epMatch[2]) : null;

    // Başlığı S01E01 kısmından temizle
    var cleanTitle = titleRaw.replace(/S\d{1,2}E\d{1,3}/i, '').replace(/\(\d{4}\)/g, '').trim();
    
    var group = (meta.match(/group-title="([^"]+)"/) || [])[1] || '';
    
    return {
        title: cleanTitle,
        fullTitle: titleRaw,
        season: season,
        episode: episode,
        url: url,
        group: group
    };
}

// ── 2. Normalize ve Dizi Eşleştirme ──────────────────────────
function normalize(s) {
    return (s || '').toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getSeriesMatchScore(entry, tmdb, reqSeason, reqEpisode) {
    // 1. Bölüm ve Sezon kontrolü (Zorunlu)
    if (entry.season !== reqSeason || entry.episode !== reqEpisode) return 0;

    // 2. İsim benzerliği kontrolü
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
        return foundAll ? 100 : 0;
    };

    return Math.max(checkWords(et, qt), checkWords(et, qe));
}

// ── 3. TMDB Dizi Bilgisi ─────────────────────────────────────
function fetchTmdbSeriesInfo(tmdbId) {
    return fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
    .then(function(r) { return r.json(); })
    .then(function(d) {
        return {
            titleTr: d.name || '',
            titleEn: d.original_name || '',
            year: (d.first_air_date || '').slice(0, 4)
        };
    });
}

// ── 4. Ana Fonksiyon (Dizi/Bölüm Odaklı) ──────────────────────
// ÖNEMLİ: Stremio/Player tarafından season ve episode bilgisi gönderilmelidir.
function getStreams(tmdbId, mediaType, season, episode) {
    if (mediaType !== 'tv') return Promise.resolve([]); 

    return fetchTmdbSeriesInfo(tmdbId)
    .then(function(tmdb) {
        return fetchM3u().then(function(entries) {
            var matches = [];
            
            entries.forEach(function(e) {
                var score = getSeriesMatchScore(e, tmdb, parseInt(season), parseInt(episode));
                if (score >= 100) { // Sadece isim ve bölüm tam uyanlar
                    matches.push({ entry: e, score: score });
                }
            });

            matches.sort(function(a, b) { return b.score - a.score; });
            
            var results = matches.map(function(m) {
                var isVidmody = m.entry.url.includes('vidmody.com');
                
                // EKRANDA GÖRÜNECEK İSİM
                // Örnek: "The Boys S01E03"
                var finalName = m.entry.fullTitle;

                return {
                    url: m.entry.url,
                    name: finalName,
                    title: (m.entry.group || 'Dizi Arşivi') + ' - 1080p',
                    quality: '1080p',
                    headers: isVidmody ? { 'Referer': 'https://vidmody.com/' } : {}
                };
            });

            return results;
        });
    })
    .catch(function() { return []; });
}

// Export
if (typeof module !== 'undefined') module.exports = { getStreams };
