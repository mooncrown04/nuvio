/**
 * MoOnCrOwN - V24 (Static JSON & ID Matcher)
 * Paylaştığın manifest yapısındaki 'star' ve 'nv_trt1' ID'leri ile tam uyumlu.
 */

var M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

// Fire Stick ve Android Player uyumlu en sade header yapısı
var _HEADERS = {
    'User-Agent': 'VLC/3.0.18',
    'Accept': '*/*'
};

function getStreams(args) {
    // 1. ID'yi al (Nuvio veya Stremio formatına göre)
    var targetId = "";
    if (typeof args === 'string') targetId = args;
    else if (args && args.id) targetId = args.id;
    
    console.error('[MoOnCrOwN-V24] Tetiklendi. Aranan ID:', targetId);

    return new Promise(function(resolve) {
        if (!targetId) {
            console.error('[MoOnCrOwN-V24] HATA: Gelen ID gecersiz.');
            return resolve([]);
        }

        // 2. M3U dosyasını çek
        fetch(M3U_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })
            .then(function(res) { return res.text(); })
            .then(function(content) {
                var lines = content.split('\n');
                var streams = [];
                
                // Senin JSON yapındaki 'nv_trt1' -> 'trt1' veya 'star' -> 'star' dönüşümü
                var cleanTarget = targetId.replace('nv_', '').replace('tmdb_', '').toLowerCase().trim();

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i].trim();
                    
                    // M3U içinde kanal bilgisini bul
                    if (line.indexOf("#EXTINF") !== -1) {
                        var nameInM3u = line.substring(line.lastIndexOf(',') + 1).toLowerCase();

                        // EĞER ID, M3U'daki kanal isminin içinde geçiyorsa (Örn: star -> star tv hd)
                        if (nameInM3u.indexOf(cleanTarget) !== -1 || cleanTarget.indexOf(nameInM3u) !== -1) {
                            
                            // Bir sonraki satırda URL'yi ara
                            for (var j = i + 1; j < lines.length; j++) {
                                var urlLine = lines[j].trim();
                                if (urlLine && urlLine.indexOf("http") === 0) {
                                    console.error('[MoOnCrOwN-V24] Eslesme Bulundu:', nameInM3u);
                                    
                                    streams.push({
                                        name: '⌜ MoOnCrOwN ⌟',
                                        title: 'Canlı Yayın (Auto-Match)',
                                        url: urlLine,
                                        headers: _HEADERS,
                                        behaviorHints: { 
                                            isLive: true,
                                            bingeGroup: targetId // Senin bingeGroup yapına uyum için
                                        }
                                    });
                                    break;
                                }
                                if (urlLine.indexOf("#EXTINF") === 0) break;
                            }
                        }
                    }
                }

                if (streams.length === 0) {
                    console.error('[MoOnCrOwN-V24] M3U listesinde bu ID ile kanal bulunamadi:', cleanTarget);
                }

                resolve(streams);
            })
            .catch(function(err) {
                console.error('[MoOnCrOwN-V24] Fetch Hatasi:', err.message);
                resolve([]);
            });
    });
}

// Stremio uyumluluğu için meta fonksiyonu
function getMeta(args) {
    var id = (typeof args === 'string') ? args : (args ? args.id : "");
    return Promise.resolve({
        meta: {
            id: id,
            type: "tv",
            videos: [{ id: id, title: "Canlı Yayın" }]
        }
    });
}

// --- EXPORT ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams, getMeta: getMeta };
}
if (typeof window !== 'undefined') {
    window.getStreams = getStreams; window.getMeta = getMeta;
} else if (typeof global !== 'undefined') {
    global.getStreams = getStreams; global.getMeta = getMeta;
}
