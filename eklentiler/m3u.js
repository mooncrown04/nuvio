/**
 * MoOnCrOwN Gelişmiş Scraper - v19.0 (Fire Stick & Nuvio Optimized)
 * Canlı TV için sertifika ve eşleşme sorunları giderildi.
 */

var M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

// Profesyonel şablonlardaki güvenli Header yapısı
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Referer': 'https://github.com/', // Sertifika güveni için kritik
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
};

function getStreams(args) {
    return new Promise(function(resolve) {
        var targetId = args.id;
        console.log('[MoOnCrOwN] Canlı TV Başlatıldı:', targetId);

        // fetch işlemini profesyonel şablonlardaki gibi yapılandırıyoruz
        fetch(M3U_URL, { headers: STREAM_HEADERS })
            .then(function(res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text();
            })
            .then(function(m3uContent) {
                var lines = m3uContent.split('\n');
                var streams = [];
                
                // Normalizasyon (V18'deki güvenli metot)
                var normalize = function(text) {
                    if (!text) return "";
                    return text.toString().toLowerCase()
                        .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
                        .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
                        .replace(/[^a-z0-9]/g, '').trim();
                };

                var cleanTarget = normalize(targetId.replace(/nv_|tmdb_/g, ""));

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i].trim();
                    
                    if (line.indexOf("#EXTINF") !== -1) {
                        // tvg-id çekme
                        var tvgMatch = line.match(/tvg-id="([^"]+)"/i);
                        var tvgId = tvgMatch ? normalize(tvgMatch[1]) : "";
                        
                        // Kanal adı çekme
                        var namePart = line.substring(line.lastIndexOf(',') + 1).trim();
                        var cleanName = normalize(namePart);

                        // Eşleşme Kontrolü
                        if (cleanTarget === cleanName || cleanTarget === tvgId || cleanName.indexOf(cleanTarget) !== -1) {
                            // Alt satırlardaki URL'yi bul (Boş satırları atlar)
                            for (var j = i + 1; j < lines.length; j++) {
                                var urlLine = lines[j].trim();
                                if (urlLine && urlLine.indexOf("#") !== 0) {
                                    streams.push({
                                        name: '⌜ MoOnCrOwN ⌟',
                                        title: namePart + ' | LIVE',
                                        url: urlLine,
                                        quality: 'Auto',
                                        headers: { 'User-Agent': 'VLC/3.0.18', 'Referer': 'https://github.com/' },
                                        behaviorHints: { isLive: true }
                                    });
                                    console.log('[MoOnCrOwN] Eşleşme Bulundu:', namePart);
                                    break; 
                                }
                                if (urlLine.indexOf("#EXTINF") === 0) break;
                            }
                        }
                    }
                }
                resolve({ streams: streams });
            })
            .catch(function(err) {
                console.error('[MoOnCrOwN] Kritik Hata:', err.message);
                resolve({ streams: [] }); // Uygulamanın çökmesini engellemek için boş dön
            });
    });
}

// Meta yapısı - Katalogdan basıldığında düzgün çalışması için
var getMeta = function(args) {
    return Promise.resolve({
        meta: {
            id: args.id,
            type: "tv",
            videos: [{ id: args.id, title: "Canlı Yayını Başlat" }]
        }
    });
};

// ÇOKLU EXPORT SİSTEMİ (Cihaz uyumluluğu için en kritik kısım)
var exportsObj = { getStreams: getStreams, getMeta: getMeta };

if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObj;
} else {
    // Fire Stick ve eski WebView sürümleri için tüm global alanlara kayıt
    if (typeof global !== 'undefined') {
        global.getStreams = getStreams;
        global.getMeta = getMeta;
    }
    if (typeof globalThis !== 'undefined') {
        globalThis.getStreams = getStreams;
        globalThis.getMeta = getMeta;
    }
    if (typeof window !== 'undefined') {
        window.getStreams = getStreams;
        window.getMeta = getMeta;
    }
}
