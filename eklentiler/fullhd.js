/**
 * FullHDFilmizlesene - Nuvio/QuickJS Uyumlu Versiyon
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.fullhdfilmizlesene.live';
var TMDB_API_KEY = '4ef0d7355d9ffb5151e987764708ce96';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'tr-TR,tr;q=0.9'
};

// ROT13 Algoritması (Eklentinin kullandığı şifreleme)
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

// Nuvio/QuickJS uyumlu Base64 Çözücü
function atob(s) {
    if (!s) return '';
    try {
        var str = String(s).replace(/\s/g, '');
        // Padding tamamlama (4'ün katı yapma)
        while (str.length % 4 !== 0) {
            str += '=';
        }
        
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var output = '';
        var bc = 0, bs, buffer, idx = 0;
        
        while (buffer = str.charAt(idx++)) {
            buffer = chars.indexOf(buffer);
            if (buffer === -1) continue;
            bs = bc % 4 ? bs * 64 + buffer : buffer;
            if (bc++ % 4) {
                output += String.fromCharCode(255 & bs >> (-2 * bc & 6));
            }
        }
        return output;
    } catch (e) {
        console.error('[FHD] Base64 Hatası:', e.message);
        return '';
    }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error('[FHD] İşlem Başladı - TMDB ID:', tmdbId);
    
    try {
        // 1. TMDB üzerinden isim bul
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId + 
            '?language=tr-TR&api_key=' + TMDB_API_KEY;
        
        var tmdbRes = await fetch(tmdbUrl);
        var tmdbData = await tmdbRes.json();
        var query = tmdbData.title || tmdbData.name;
        
        if (!query) return [];
        console.error('[FHD] Aranan Film:', query);
        
        // 2. Sitede Arama Yap
        var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
        var searchRes = await fetch(searchUrl, { headers: HEADERS });
        var html = await searchRes.text();
        
        var $ = cheerio.load(html);
        var firstLink = $('li.film a').first().attr('href');
        if (!firstLink) return [];
        
        var filmUrl = firstLink.startsWith('http') ? firstLink : BASE_URL + firstLink;
        
        // 3. Film Sayfasını Çek ve scx Verisini Ayıkla
        var filmRes = await fetch(filmUrl, { headers: HEADERS });
        var filmHtml = await filmRes.text();
        
        var scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) {
            // Alternatif pattern dene
            scxMatch = filmHtml.match(/var\s+scx\s*=\s*(\{[\s\S]*?\});/);
        }
        
        if (!scxMatch) return [];

        // 4. scx JSON verisini temizle ve parse et
        var scxData;
        try {
            var rawJson = scxMatch[1]
                .replace(/(\w+):/g, '"$1":') // Keyleri tırnak içine al
                .replace(/'/g, '"')          // Tek tırnakları çift tırnak yap
                .replace(/,\s*}/g, '}')      // Sondaki fazla virgülleri temizle
                .replace(/,\s*\]/g, ']');
            scxData = JSON.parse(rawJson);
        } catch (e) {
            console.error('[FHD] JSON Parse Hatası');
            return [];
        }

        // 5. Kaynakları Çöz (Streamleri Topla)
        var streams = [];
        var sources = ['atom', 'advid', 'advidprox', 'proton', 'fast', 'fastly', 'tr', 'en'];
        
        sources.forEach(function(key) {
            if (scxData[key] && scxData[key].sx && scxData[key].sx.t) {
                var t = scxData[key].sx.t;
                var encList = Array.isArray(t) ? t : [t];
                
                encList.forEach(function(enc) {
                    if (typeof enc !== 'string') return;
                    
                    var decodedRot13 = rtt(enc);
                    var finalUrl = atob(decodedRot13);
                    
                    if (finalUrl && finalUrl.startsWith('http')) {
                        streams.push({
                            name: '⌜ FHD ⌟ ' + key.toUpperCase(),
                            url: finalUrl,
                            quality: '1080p',
                            headers: {
                                'User-Agent': 'Mozilla/5.0',
                                'Referer': filmUrl, // Referer olarak film sayfasını veriyoruz
                                'Origin': BASE_URL
                            }
                        });
                    }
                });
            }
        });

        console.error('[FHD] Bulunan Toplam Kaynak:', streams.length);
        return streams;
        
    } catch (err) {
        console.error('[FHD] Hata:', err.message);
        return [];
    }
}

// Nuvio/Cloudstream Export Ayarları
module.exports = {
    getStreams: getStreams,
    default: { getStreams: getStreams }
};

if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
