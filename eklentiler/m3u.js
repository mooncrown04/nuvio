/**
 * MoOnCrOwN - V26 (M3U Smart Matcher)
 * tvg-id, tvg-name veya virgül sonrası isme göre eşleştirme yapar.
 */

var M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

var _HEADERS = {
    'User-Agent': 'VLC/3.0.18',
    'Accept': '*/*'
};

function getStreams(args) {
    var targetId = (typeof args === 'string') ? args : (args ? args.id : "");
    console.error('[MoOnCrOwN-V26] Gelen Sorgu:', targetId);

    return new Promise(function(resolve) {
        if (!targetId) return resolve([]);

        fetch(M3U_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })
            .then(function(res) { return res.text(); })
            .then(function(content) {
                var lines = content.split('\n');
                var streams = [];
                
                // Aranan anahtar kelimeyi temizle
                var searchKey = targetId.toLowerCase().trim();

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i].trim();
                    
                    if (line.indexOf("#EXTINF") !== -1) {
                        // 1. tvg-id değerini çek
                        var tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
                        var tvgId = tvgIdMatch ? tvgIdMatch[1].toLowerCase().trim() : "";

                        // 2. tvg-name değerini çek
                        var tvgNameMatch = line.match(/tvg-name="([^"]+)"/i);
                        var tvgName = tvgNameMatch ? tvgNameMatch[1].toLowerCase().trim() : "";

                        // 3. Virgül sonrasını (takma ad) çek
                        var commaParts = line.split(',');
                        var aliasName = commaParts[commaParts.length - 1].toLowerCase().trim();

                        // EŞLEŞME KONTROLÜ: Herhangi biri tutuyorsa tamamdır
                        if (tvgId === searchKey || tvgName === searchKey || aliasName === searchKey) {
                            console.error('[MoOnCrOwN-V26] Eşleşme Bulundu:', (tvgId || tvgName || aliasName));
                            
                            for (var j = i + 1; j < lines.length; j++) {
                                var urlLine = lines[j].trim();
                                if (urlLine && urlLine.indexOf("http") === 0) {
                                    streams.push({
                                        name: '⌜ MoOnCrOwN ⌟',
                                        title: 'Canlı Yayın (Smart Match)',
                                        url: urlLine,
                                        headers: _HEADERS,
                                        behaviorHints: { isLive: true }
                                    });
                                    break;
                                }
                                if (urlLine.indexOf("#EXTINF") === 0) break;
                            }
                        }
                    }
                    if (streams.length > 0) break; // İlk eşleşmeyi bulunca dur
                }

                resolve({ streams: streams });
            })
            .catch(function(err) {
                console.error('[MoOnCrOwN-V26] Hata:', err.message);
                resolve({ streams: [] });
            });
    });
}

function getMeta(args) {
    var id = (typeof args === 'string') ? args : (args ? args.id : "");
    return Promise.resolve({
        meta: { 
            id: id, 
            type: "tv", 
            name: "Yayın", 
            videos: [{ id: id, title: "Canlı İzle" }] 
        }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams, getMeta: getMeta };
} else {
    var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof global !== 'undefined') ? global : window;
    g.getStreams = getStreams; g.getMeta = getMeta;
}
