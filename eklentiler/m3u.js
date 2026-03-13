/**
 * MoOnCrOwN - V22 (Hardware Compatibility Fix)
 * Oynatıcı hatalarını (OMX/Audio) gidermek için optimize edildi.
 */

var M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

// Fire Stick'in donanım hızlandırıcısını bozmayan en sade headerlar
var SIMPLE_HEADERS = {
    'User-Agent': 'VLC/3.0.18', // En uyumlu UA
    'Accept': '*/*'
};

function getStreams(args) {
    return new Promise(function(resolve) {
        var targetId = args.id || "";
        console.error('[MoOnCrOwN-V22] Sorgu Basladi:', targetId);

        fetch(M3U_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })
            .then(function(res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text();
            })
            .then(function(content) {
                var lines = content.split('\n');
                var streams = [];
                
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
                        var namePart = line.substring(line.lastIndexOf(',') + 1).trim();
                        var cleanName = normalize(namePart);

                        if (cleanName.indexOf(cleanTarget) !== -1 || cleanTarget.indexOf(cleanName) !== -1) {
                            console.error('[MoOnCrOwN-V22] Kanal Esleşti:', namePart);
                            
                            for (var j = i + 1; j < lines.length; j++) {
                                var urlLine = lines[j].trim();
                                if (urlLine && urlLine.indexOf("http") === 0) {
                                    // FIRE STICK DONANIM HATASI ALMAMAK ICIN:
                                    streams.push({
                                        name: '⌜ MoOnCrOwN ⌟',
                                        title: namePart + ' (Auto)',
                                        url: urlLine,
                                        // Karmaşık headerlar OMX hatasına (BadParameter) yol açar, o yüzden sade tutuyoruz
                                        headers: SIMPLE_HEADERS, 
                                        behaviorHints: { 
                                            isLive: true,
                                            proxyHeaders: { "read": SIMPLE_HEADERS } 
                                        }
                                    });
                                    console.error('[MoOnCrOwN-V22] Stream Hazir.');
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
                console.error('[MoOnCrOwN-V22] Akis Hatasi:', err.message);
                resolve({ streams: [] });
            });
    });
}

var getMeta = function(args) {
    return Promise.resolve({
        meta: {
            id: args.id,
            type: "tv",
            videos: [{ id: args.id, title: "Canli Yayini Baslat" }]
        }
    });
};

// Export yapısı
var exportsObj = { getStreams: getStreams, getMeta: getMeta };
if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObj;
} else {
    var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof global !== 'undefined') ? global : window;
    g.getStreams = getStreams;
    g.getMeta = getMeta;
}
