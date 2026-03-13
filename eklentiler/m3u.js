/**
 * MoOnCrOwN Gelişmiş Scraper - v3.0 (Nuvio Uyumlu)
 * Paylaşılan profesyonel şablonlar temel alınarak Fire Stick için optimize edildi.
 */

var M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

// Dizipal ve SineWix örneklerindeki gibi güçlü Header yapısı
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache'
};

function getStreams(args) {
    return new Promise(function(resolve, reject) {
        var targetId = args.id;
        console.log('[MoOnCrOwN] İşlem Başladı. Hedef ID:', targetId);

        // fetch işlemini şablonlardaki gibi Promise zinciriyle yapıyoruz
        fetch(M3U_URL, { headers: STREAM_HEADERS })
            .then(function(res) {
                if (!res.ok) throw new Error('M3U dosyasına ulaşılamadı: ' + res.status);
                return res.text();
            })
            .then(function(m3uContent) {
                var lines = m3uContent.split('\n');
                var streams = [];
                
                // ID Normalizasyonu (Sablon-turkce.js mantığıyla)
                var cleanTarget = targetId.toLowerCase().replace(/nv_|tmdb_|[^a-z0-9]/g, "");

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i].trim();
                    
                    if (line.startsWith("#EXTINF")) {
                        // tvg-id ve Kanal Adı Ayıklama
                        var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
                        var tvgId = tvgIdMatch ? tvgIdMatch[1].toLowerCase().replace(/[^a-z0-9]/g, "") : "";
                        
                        var namePart = line.substring(line.lastIndexOf(',') + 1).trim();
                        var cleanName = namePart.toLowerCase().replace(/[^a-z0-9]/g, "");

                        // Eşleşme Kontrolü
                        if (cleanTarget === cleanName || cleanTarget === tvgId || cleanName.includes(cleanTarget)) {
                            // Alt satırdaki URL'yi bul
                            for (var j = i + 1; j < lines.length; j++) {
                                var urlLine = lines[j].trim();
                                if (urlLine && !urlLine.startsWith("#")) {
                                    streams.push({
                                        name: '⌜ MoOnCrOwN ⌟',
                                        title: namePart + ' | HD',
                                        url: urlLine,
                                        quality: 'Auto',
                                        headers: STREAM_HEADERS,
                                        behaviorHints: { isLive: true }
                                    });
                                    console.log('[MoOnCrOwN] Eşleşme Başarılı:', namePart);
                                    break; 
                                }
                                if (urlLine.startsWith("#EXTINF")) break;
                            }
                        }
                    }
                }
                resolve({ streams: streams });
            })
            .catch(function(err) {
                console.error('[MoOnCrOwN] Hata:', err.message);
                // Şablondaki altın kural: Hata olsa bile uygulamayı kilitme, boş dön.
                resolve({ streams: [] });
            });
    });
}

// Global tanımlamalar (sinewix.js ve diziyou.js'deki gibi)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}

// Nuvio'nun ihtiyaç duyduğu Meta yapısını da ekleyelim
global.getMeta = function(args) {
    return Promise.resolve({
        meta: {
            id: args.id,
            type: "tv",
            videos: [{ id: args.id, title: "Canlı Yayını Başlat" }]
        }
    });
};
