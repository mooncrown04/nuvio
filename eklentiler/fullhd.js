/**
 * FullHDFilmizlesene - NUVIOTR Uyumlu (CloudStream Mimarisine Göre)
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.fullhdfilmizlesene.live';
var TMDB_API_KEY = '4ef0d7355d9ffb5151e987764708ce96';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,*/*;q=0.5',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// Cache sistemi
var cache = {};
var CACHE_DURATION = 5 * 60 * 1000;

// ROT13 şifre çözme (CloudStream ile aynı)
function rtt(s) {
    if (!s) return '';
    var result = '';
    for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c >= 97 && c <= 122) {
            result += String.fromCharCode(((c - 97 + 13) % 26) + 97);
        } else if (c >= 65 && c <= 90) {
            result += String.fromCharCode(((c - 65 + 13) % 26) + 65);
        } else {
            result += s.charAt(i);
        }
    }
    return result;
}

// Base64 decode (CloudStream ile aynı)
function atob(s) {
    if (!s) return '';
    try {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(s, 'base64').toString('utf-8');
        }
        return '';
    } catch (e) {
        return '';
    }
}

// Retry mekanizmalı fetch
async function fetchWithRetry(url, options, maxRetries) {
    maxRetries = maxRetries || 3;
    for (var i = 0; i < maxRetries; i++) {
        try {
            var res = await fetch(url, options);
            if (res.ok) return res;
            throw new Error('HTTP ' + res.status);
        } catch (err) {
            if (i === maxRetries - 1) throw err;
            await new Promise(function(r) { setTimeout(r, 1000 * (i + 1)); });
        }
    }
}

// Video linklerini scx'ten çıkar (CloudStream mantığıyla)
function extractVideoLinks(scxData) {
    var streams = [];
    
    // CloudStream'deki gibi tüm kaynakları kontrol et
    var sources = [
        { key: 'atom', name: 'Atom' },
        { key: 'advid', name: 'AdVid' },
        { key: 'advidprox', name: 'AdVidProx' },
        { key: 'proton', name: 'Proton' },
        { key: 'fast', name: 'Fast' },
        { key: 'fastly', name: 'Fastly' },
        { key: 'tr', name: 'TR' },
        { key: 'en', name: 'EN' }
    ];
    
    sources.forEach(function(source) {
        var data = scxData[source.key];
        if (data && data.sx && data.sx.t) {
            var t = data.sx.t;
            
            // Array formatı
            if (Array.isArray(t)) {
                t.forEach(function(enc, idx) {
                    var url = atob(rtt(enc)).trim();
                    if (url && url.startsWith('http')) {
                        streams.push({
                            name: '⌜ FullHD ⌟ | ' + source.name,
                            url: url,
                            quality: '1080p',
                            headers: STREAM_HEADERS,
                            source: source.key,
                            idx: idx
                        });
                    }
                });
            }
            // Object formatı (key-value)
            else if (typeof t === 'object') {
                Object.keys(t).forEach(function(key) {
                    var val = t[key];
                    if (typeof val === 'string') {
                        var url = atob(rtt(val)).trim();
                        if (url && url.startsWith('http')) {
                            streams.push({
                                name: '⌜ FullHD ⌟ | ' + source.name + ' | ' + key,
                                url: url,
                                quality: '1080p',
                                headers: STREAM_HEADERS,
                                source: source.key
                            });
                        }
                    }
                });
            }
        }
    });
    
    return streams;
}

// Ana fonksiyon
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error('[FHD] ========== YENI ISTEK ==========');
    console.error('[FHD] tmdbId:', tmdbId, 'type:', mediaType);
    var startTime = Date.now();
    
    try {
        // Cache kontrolü
        var cacheKey = tmdbId + '-' + mediaType;
        if (cache[cacheKey] && (Date.now() - cache[cacheKey].time) < CACHE_DURATION) {
            console.error('[FHD] Cache hit!');
            return cache[cacheKey].data;
        }
        
        // TMDB'den film bilgisini al
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + 
            '?language=tr-TR&api_key=' + TMDB_API_KEY;
        
        console.error('[FHD] TMDB URL:', tmdbUrl);
        var tmdbRes = await fetchWithRetry(tmdbUrl, {}, 3);
        var tmdbData = await tmdbRes.json();
        var query = tmdbData.title || tmdbData.name;
        
        if (!query) {
            console.error('[FHD] TMDB isim bulunamadi!');
            return [];
        }
        console.error('[FHD] TMDB isim:', query);
        
        // Sitede ara
        var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
        console.error('[FHD] Arama URL:', searchUrl);
        
        var searchRes = await fetchWithRetry(searchUrl, { headers: HEADERS }, 3);
        var html = await searchRes.text();
        
        var $ = cheerio.load(html);
        var firstLink = $('li.film a').first().attr('href');
        
        // Alternatif selector'lar (CloudStream'den)
        if (!firstLink) firstLink = $('.film-list a').first().attr('href');
        if (!firstLink) firstLink = $('a[href*="/film/"]').first().attr('href');
        if (!firstLink) firstLink = $('a[href*="/serifilm/"]').first().attr('href');
        
        if (!firstLink) {
            console.error('[FHD] Film linki bulunamadi!');
            return [];
        }
        
        var filmUrl = firstLink.startsWith('http') ? firstLink : BASE_URL + firstLink;
        console.error('[FHD] Film URL:', filmUrl);
        
        // Film sayfasını al
        var filmRes = await fetchWithRetry(filmUrl, { headers: HEADERS }, 3);
        var filmHtml = await filmRes.text();
        
        // scx değişkenini bul (CloudStream regex'i)
        var scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) {
            console.error('[FHD] scx bulunamadi!');
            return [];
        }
        
        // JSON parse
        var scxData;
        try {
            var scxJson = scxMatch[1]
                .replace(/'/g, '"')
                .replace(/(\w+):/g, '"$1":')
                .replace(/,\s*}/g, '}')  // Trailing comma temizle
                .replace(/,\s*\]/g, ']'); // Trailing comma temizle
            
            scxData = JSON.parse(scxJson);
        } catch (e) {
            console.error('[FHD] JSON parse hatasi:', e.message);
            console.error('[FHD] scx icerigi:', scxMatch[1].substring(0, 200));
            return [];
        }
        
        // Video linklerini çıkar
        var streams = extractVideoLinks(scxData);
        console.error('[FHD] Bulunan stream sayisi:', streams.length);
        
        // Cache'e kaydet
        cache[cacheKey] = {
            data: streams,
            time: Date.now()
        };
        
        var endTime = Date.now();
        console.error('[FHD] Sure:', (endTime - startTime) + 'ms');
        console.error('[FHD] ========== TAMAMLANDI ==========');
        
        return streams;
        
    } catch (err) {
        console.error('[FHD] KRITIK HATA:', err.message);
        return [];
    }
}

// EXPORT
module.exports = {
    getStreams: getStreams,
    default: { getStreams: getStreams }
};

if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
    globalThis.fullhdProvider = { getStreams: getStreams };
}

if (typeof global !== 'undefined') {
    global.getStreams = getStreams;
    global.fullhdProvider = { getStreams: getStreams };
}

console.error('[FHD] FullHDFilmizlesene yuklendi - v2.0');
