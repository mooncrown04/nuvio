/**
 * MoOnCrOwN Gelişmiş Scraper - v20.0 (Debug Enhanced)
 * console.log yerine console.error kullanılarak log görünürlüğü artırıldı.
 */

var M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': '*/*',
    'Referer': 'https://github.com/',
    'Cache-Control': 'no-cache'
};

function getStreams(args) {
    return new Promise(function(resolve) {
        var targetId = args.id;
        // Başlangıç Logu
        console.error('[MoOnCrOwN-DEBUG] getStreams Tetiklendi. ID:', targetId);

        fetch(M3U_URL, { headers: STREAM_HEADERS })
            .then(function(res) {
                if (!res.ok) {
                    console.error('[MoOnCrOwN-DEBUG] M3U Yükleme Hatası! Durum:', res.status);
                    throw new Error('HTTP ' + res.status);
                }
                console.error('[MoOnCrOwN-DEBUG] M3U Dosyası Başarıyla Alındı.');
                return res.text();
            })
            .then(function(m3uContent) {
                var lines = m3uContent.split('\n');
                var streams = [];
                
                var normalize = function(text) {
                    if (!text) return "";
                    return text.toString().toLowerCase()
                        .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
                        .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
                        .replace(/[^a-z0-9]/g, '').trim();
                };

                var cleanTarget = normalize(targetId.replace(/nv_|tmdb_/g, ""));
                console.error('[MoOnCrOwN-DEBUG] Normalize Edilmiş Hedef:', cleanTarget);

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i].trim();
                    
                    if (line.indexOf("#EXTINF") !== -1) {
                        var tvgMatch = line.match(/tvg-id="([^"]+)"/i);
                        var tvgId = tvgMatch ? normalize(tvgMatch[1]) : "";
                        
                        var namePart = line.substring(line.lastIndexOf(',') + 1).trim();
                        var cleanName = normalize(namePart);

                        // Eşleşme Kontrolü
                        if (cleanTarget === cleanName || cleanTarget === tvgId || cleanName.indexOf(cleanTarget) !== -1) {
                            console.error('[MoOnCrOwN-DEBUG] Eşleşme Yakalandı! Kanal:', namePart);
                            
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
                                    console.error('[MoOnCrOwN-DEBUG] URL Eklendi:', urlLine.substring(0, 30) + '...');
                                    break; 
                                }
                                if (urlLine.indexOf("#EXTINF") === 0) break;
                            }
                        }
                    }
                }

                if (streams.length === 0) {
                    console.error('[MoOnCrOwN-DEBUG] Döngü Bitti: Hiçbir eşleşme bulunamadı.');
                } else {
                    console.error('[MoOnCrOwN-DEBUG] İşlem Başarılı. Bulunan Yayın Sayısı:', streams.length);
                }

                resolve({ streams: streams });
            })
            .catch(function(err) {
                // Kritik Hata Logu
                console.error('[MoOnCrOwN-DEBUG] FETCH VEYA PARSE HATASI:', err.stack || err.message);
                resolve({ streams: [] });
            });
    });
}

var getMeta = function(args) {
    console.error('[MoOnCrOwN-DEBUG] getMeta Tetiklendi. ID:', args.id);
    return Promise.resolve({
        meta: {
            id: args.id,
            type: "tv",
            videos: [{ id: args.id, title: "Canlı Yayını Başlat" }]
        }
    });
};

// Çoklu Export ve Global Tanımlama
var exportsObj = { getStreams: getStreams, getMeta: getMeta };
if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObj;
} else {
    var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof global !== 'undefined') ? global : window;
    g.getStreams = getStreams;
    g.getMeta = getMeta;
}
