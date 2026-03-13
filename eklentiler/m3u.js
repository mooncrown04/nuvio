/**
 * MoOnCrOwN - V21 (Advanced Debug & Certificate Fix)
 * Logcat üzerinde kırmızı (Error) seviyesinde takip sağlar.
 */

var M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

// Fire Stick sertifika doğrulaması (trust) hatasını aşmak için en kapsamlı header seti
var DEBUG_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/plain, */*',
    'Referer': 'https://github.com/mooncrown04/nuvio',
    'Origin': 'https://github.com',
    'Cache-Control': 'no-cache'
};

function getStreams(args) {
    return new Promise(function(resolve) {
        var targetId = args.id || "";
        console.error('[MoOnCrOwN-V21] SORGULANIYOR -> ID:', targetId);

        // 1. AŞAMA: M3U Çekme Denemesi
        fetch(M3U_URL, { headers: DEBUG_HEADERS })
            .then(function(res) {
                console.error('[MoOnCrOwN-V21] HTTP YANITI ALINDI -> Kod:', res.status);
                if (!res.ok) throw new Error('M3U Baglanti Hatasi: ' + res.status);
                return res.text();
            })
            .then(function(content) {
                console.error('[MoOnCrOwN-V21] M3U ICERIGI OKUNDU. Uzunluk:', content.length);
                
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
                console.error('[MoOnCrOwN-V21] TEMIZLENMIS HEDEF:', cleanTarget);

                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i].trim();
                    if (line.indexOf("#EXTINF") !== -1) {
                        var tvgMatch = line.match(/tvg-id="([^"]+)"/i);
                        var tvgId = tvgMatch ? normalize(tvgMatch[1]) : "";
                        var namePart = line.substring(line.lastIndexOf(',') + 1).trim();
                        var cleanName = normalize(namePart);

                        if (cleanTarget === cleanName || cleanTarget === tvgId || cleanName.indexOf(cleanTarget) !== -1) {
                            console.error('[MoOnCrOwN-V21] KANAL BULUNDU ->', namePart);
                            
                            for (var j = i + 1; j < lines.length; j++) {
                                var urlLine = lines[j].trim();
                                if (urlLine && urlLine.indexOf("http") === 0) {
                                    streams.push({
                                        name: '⌜ MoOnCrOwN ⌟',
                                        title: namePart,
                                        url: urlLine,
                                        headers: { 'User-Agent': 'VLC/3.0.18', 'Referer': 'https://github.com/' },
                                        behaviorHints: { isLive: true }
                                    });
                                    console.error('[MoOnCrOwN-V21] URL EKLENDI -> OK');
                                    break; 
                                }
                                if (urlLine.indexOf("#EXTINF") === 0) break;
                            }
                        }
                    }
                }

                if (streams.length === 0) {
                    console.error('[MoOnCrOwN-V21] ESLESME YOK. Liste tarandi.');
                }
                resolve({ streams: streams });
            })
            .catch(function(err) {
                // Sertifika hatası veya ağ hatası burada patlar
                console.error('[MoOnCrOwN-V21] KRITIK HATA (AĞ/SSL):', err.message);
                resolve({ streams: [] });
            });
    });
}

// getMeta için de hata logu ekleyelim
var getMeta = function(args) {
    console.error('[MoOnCrOwN-V21] getMeta ISTENDI -> ID:', args.id);
    return Promise.resolve({
        meta: {
            id: args.id,
            type: "tv",
            videos: [{ id: args.id, title: "Yayini Ac" }]
        }
    });
};

// Export mekanizması
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams, getMeta: getMeta };
} else {
    var g = (typeof globalThis !== 'undefined') ? globalThis : (typeof global !== 'undefined') ? global : window;
    g.getStreams = getStreams;
    g.getMeta = getMeta;
}
