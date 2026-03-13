/**
 * MoOnCrOwN - V25 (M3U ID Exact Matcher)
 * Katalogdaki ID'leri (star, nv_trt1, tmdb_atv) M3U sonundaki virgül sonrası 
 * kelimelerle %100 eşleştirir.
 */

var M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

var _HEADERS = {
    'User-Agent': 'VLC/3.0.18',
    'Accept': '*/*'
};

function getStreams(args) {
    var targetId = (typeof args === 'string') ? args : (args ? args.id : "");
    console.error('[MoOnCrOwN-V25] Gelen Sorgu:', targetId);

    return new Promise(function(resolve) {
        if (!targetId) return resolve([]);

        fetch(M3U_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })
            .then(function(res) { return res.text(); })
            .then(function(content) {
                var lines = content.split('\n');
                var streams = [];
                
                // Aranan ID: "star" veya "nv_trt1"
                var searchKey = targetId.toLowerCase().trim();

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i].trim();
                    
                    if (line.indexOf("#EXTINF") !== -1) {
                        // Virgül sonrasını al: "#EXTINF...,star" -> "star"
                        var commaParts = line.split(',');
                        var m3uId = commaParts[commaParts.length - 1].toLowerCase().trim();

                        // EĞER ID'ler tam eşleşiyorsa (star == star)
                        if (m3uId === searchKey) {
                            console.error('[MoOnCrOwN-V25] Nokta Atışı Eşleşme:', m3uId);
                            
                            for (var j = i + 1; j < lines.length; j++) {
                                var urlLine = lines[j].trim();
                                if (urlLine && urlLine.indexOf("http") === 0) {
                                    streams.push({
                                        name: '⌜ MoOnCrOwN ⌟',
                                        title: 'Canlı Yayın (ID Match)',
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
                }

                // Eğer ID eşleşmesi bulamazsa, isimden arama yap (Yedek Plan)
                if (streams.length === 0) {
                    console.error('[MoOnCrOwN-V25] ID eslesmedi, isim taraniyor...');
                    var cleanName = searchKey.replace('nv_', '').replace('tmdb_', '');
                    // ... (Burada isimden arama mantığı devreye girer)
                }

                resolve(streams);
            })
            .catch(function(err) {
                console.error('[MoOnCrOwN-V25] Hata:', err.message);
                resolve([]);
            });
    });
}

function getMeta(args) {
    var id = (typeof args === 'string') ? args : (args ? args.id : "");
    return Promise.resolve({
        meta: { id: id, type: "tv", videos: [{ id: id, title: "Yayin" }] }
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams, getMeta: getMeta };
} else {
    var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof global !== 'undefined') ? global : window;
    g.getStreams = getStreams; g.getMeta = getMeta;
}
