/**
 * MoOnCrOwN - Live TV (V6 - Force Access)
 * Amaç: Kanal isminden bağımsız olarak dosyaya erişmek ve sonuç döndürmek.
 */

const LIVE_SOURCE = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

const getStreams = function(tmdbId, mediaType, seasonNum, episodeNum, channelName) {
    return new Promise(function(resolve) {
        // Logları "Error" seviyesinde basıyoruz ki kırmızı renkle Logcat'te parlasın.
        console.error("##########################################");
        console.error("!!! MOONCROWN SISTEMINE GIRIS YAPILDI !!!");
        console.error("Aranan Kelime: " + (channelName || tmdbId));
        console.error("##########################################");

        // Gelen aramayı basitleştirelim
        let searchKey = (channelName || tmdbId || "").toString().toLowerCase().trim();

        fetch(LIVE_SOURCE)
            .then(res => {
                console.error(">>> HTTP DURUMU: " + res.status);
                return res.text();
            })
            .then(content => {
                const lines = content.split('\n');
                let results = [];
                
                console.error(">>> DOSYA OKUNDU. SATIR SAYISI: " + lines.length);

                for (let i = 0; i < lines.length; i++) {
                    let line = lines[i];

                    if (line.includes("#EXTINF")) {
                        let lineLower = line.toLowerCase();
                        
                        // FILTREYI ESNETTIK: Aranan kelime (örn: trt) satırda geçiyorsa ekle
                        if (lineLower.includes(searchKey) || searchKey === "") {
                            
                            // Linki bul (Altındaki ilk http satırı)
                            let streamUrl = "";
                            for (let j = 1; j <= 5; j++) {
                                if (lines[i + j] && lines[i + j].trim().startsWith("http")) {
                                    streamUrl = lines[i + j].trim();
                                    break;
                                }
                            }

                            if (streamUrl) {
                                results.push({
                                    name: "📡 " + (line.split(',').pop().trim() || "KANAL"),
                                    title: "YAYINI AC",
                                    url: streamUrl,
                                    http_headers: { "User-Agent": "VLC/3.0.18" }
                                });
                            }
                        }
                    }
                }

                console.error(">>> TOPLAM ESLENEN KANAL: " + results.length);
                resolve(results);
            })
            .catch(err => {
                console.error("!!! KRITIK BAGLANTI HATASI: " + err.message);
                resolve([]);
            });
    });
};

globalThis.getStreams = getStreams;
