/**
 * FullHDFilmizlesene - DEBUG VERSIYONU
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.fullhdfilmizlesene.live';
var TMDB_API_KEY = '4ef0d7355d9ffb5151e987764708ce96';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'tr-TR,tr;q=0.9'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

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

function atob(s) {
    if (!s) return '';
    try {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(s, 'base64').toString('utf-8');
        }
        return '';
    } catch (e) {
        console.error('[FHD] Base64 hata:', e.message, 'input:', s.substring(0, 50));
        return '';
    }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error('[FHD] ========== DEBUG MODU ==========');
    console.error('[FHD] tmdbId:', tmdbId, 'type:', mediaType);
    
    try {
        // TMDB
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + 
            '?language=tr-TR&api_key=' + TMDB_API_KEY;
        
        var tmdbRes = await fetch(tmdbUrl);
        var tmdbData = await tmdbRes.json();
        var query = tmdbData.title || tmdbData.name;
        
        if (!query) {
            console.error('[FHD] TMDB isim bulunamadi!');
            return [];
        }
        console.error('[FHD] Aranan:', query);
        
        // Arama
        var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
        var searchRes = await fetch(searchUrl, { headers: HEADERS });
        var html = await searchRes.text();
        
        var $ = cheerio.load(html);
        var firstLink = $('li.film a').first().attr('href');
        
        if (!firstLink) {
            console.error('[FHD] Film linki bulunamadi!');
            return [];
        }
        
        var filmUrl = firstLink.startsWith('http') ? firstLink : BASE_URL + firstLink;
        console.error('[FHD] Film URL:', filmUrl);
        
        // Film sayfası
        var filmRes = await fetch(filmUrl, { headers: HEADERS });
        var filmHtml = await filmRes.text();
        
        console.error('[FHD] HTML uzunlugu:', filmHtml.length);
        
        // scx bul - TÜM PATTERN'LERİ DENE
        var scxMatch = null;
        var patterns = [
            /scx\s*=\s*(\{[\s\S]*?\});/,
            /var\s+scx\s*=\s*(\{[\s\S]*?\});/,
            /window\.scx\s*=\s*(\{[\s\S]*?\});/,
            /scx\s*=\s*(\{[\s\S]*?\})$/,
            /scx\s*=\s*JSON\.parse\('(\{[\s\S]*?\})'\)/
        ];
        
        for (var i = 0; i < patterns.length; i++) {
            scxMatch = filmHtml.match(patterns[i]);
            if (scxMatch) {
                console.error('[FHD] Pattern', i, 'eslesti');
                break;
            }
        }
        
        if (!scxMatch) {
            console.error('[FHD] scx bulunamadi! HTML iceriginde scx geciyor mu:', filmHtml.includes('scx'));
            // HTML'den script etiketlerini bul
            var scripts = filmHtml.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
            console.error('[FHD] Script sayisi:', scripts ? scripts.length : 0);
            return [];
        }
        
        console.error('[FHD] scx ham icerik (ilk 500 karakter):', scxMatch[1].substring(0, 500));
        
        // JSON parse dene
        var scxData;
        try {
            var scxJson = scxMatch[1]
                .replace(/'/g, '"')
                .replace(/(\w+):/g, '"$1":')
                .replace(/,\s*}/g, '}')
                .replace(/,\s*\]/g, ']');
            
            console.error('[FHD] JSON oncesi (ilk 300):', scxJson.substring(0, 300));
            scxData = JSON.parse(scxJson);
            console.error('[FHD] JSON parse BASARILI');
            console.error('[FHD] scx anahtarlar:', Object.keys(scxData));
        } catch (e) {
            console.error('[FHD] JSON parse HATASI:', e.message);
            console.error('[FHD] Hatali icerik:', scxMatch[1].substring(0, 200));
            return [];
        }
        
        // Stream çıkar
        var streams = [];
        var sources = ['atom', 'advid', 'advidprox', 'proton', 'fast', 'fastly', 'tr', 'en'];
        
        sources.forEach(function(key) {
            console.error('[FHD] Kontrol ediliyor:', key);
            
            if (!scxData[key]) {
                console.error('[FHD]  ', key, 'YOK');
                return;
            }
            
            console.error('[FHD]  ', key, 'VAR, tip:', typeof scxData[key]);
            
            if (!scxData[key].sx) {
                console.error('[FHD]    ', key, '.sx YOK');
                return;
            }
            
            console.error('[FHD]    ', key, '.sx VAR');
            
            if (!scxData[key].sx.t) {
                console.error('[FHD]      ', key, '.sx.t YOK');
                return;
            }
            
            var t = scxData[key].sx.t;
            console.error('[FHD]      ', key, '.sx.t VAR, tip:', typeof t, 'Array mi:', Array.isArray(t));
            
            if (Array.isArray(t)) {
                console.error('[FHD]        Array uzunluk:', t.length);
                t.forEach(function(enc, idx) {
                    console.error('[FHD]          [' + idx + '] tip:', typeof enc, 'uzunluk:', enc ? enc.length : 0);
                    var decoded = rtt(enc);
                    console.error('[FHD]          ROT13 sonrasi (ilk 50):', decoded ? decoded.substring(0, 50) : 'bos');
                    var url = atob(decoded);
                    console.error('[FHD]          Base64 sonrasi:', url ? 'BASARILI' : 'BASARISIZ');
                    
                    if (url && url.startsWith('http')) {
                        streams.push({
                            name: '⌜ FullHD ⌟ | ' + key.toUpperCase(),
                            url: url,
                            quality: '1080p',
                            headers: STREAM_HEADERS
                        });
                        console.error('[FHD]          STREAM EKLENDI');
                    }
                });
            } else if (typeof t === 'object') {
                console.error('[FHD]        Object anahtarlar:', Object.keys(t));
            }
        });
        
        console.error('[FHD] ========== SONUC ==========');
        console.error('[FHD] Toplam stream:', streams.length);
        return streams;
        
    } catch (err) {
        console.error('[FHD] KRITIK HATA:', err.message);
        console.error('[FHD] Stack:', err.stack);
        return [];
    }
}

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

console.error('[FHD] DEBUG versiyonu yuklendi');
