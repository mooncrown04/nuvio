/**
 * MoOnCrOwN - Live TV Provider (V4 - AGRESSIVE DEBUG)
 * Her ihtimali loglayan ve tüm parametreleri tarayan sürüm.
 */

const LIVE_SOURCE = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

const getStreams = function(tmdbId, mediaType, seasonNum, episodeNum, channelName) {
    return new Promise(function(resolve) {
        // BU LOGU GÖRMELİYİZ!
        console.error("!!! PROVİDER TETİKLENDİ !!!"); 
        console.log("Gelen Veriler -> ID:", tmdbId, "Type:", mediaType, "Name:", channelName);

        // Arama yapılacak kelimeyi belirle (Hangisi dolu gelirse)
        let queryRaw = channelName || tmdbId || "";
        
        if (!queryRaw || queryRaw === "undefined") {
            console.error("❌ Arama kelimesi boş geldi, durduruldu.");
            return resolve([]);
        }

        const normalize = (t) => t ? t.toString().toLowerCase().replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u').replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c').trim() : "";
        const query = normalize(queryRaw);

        console.log("📡 M3U Çekiliyor...");

        fetch(LIVE_SOURCE)
            .then(res => {
                console.log("🌐 Sunucu Yanıtı:", res.status);
                return res.text();
            })
            .then(content => {
                const lines = content.split('\n');
                let results = [];
                console.log("📝 Liste Alındı. Satır:", lines.length, "Aranan:", query);

                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes("#EXTINF")) {
                        let currentLine = normalize(lines[i]);
                        
                        if (currentLine.includes(query)) {
                            console.log("🎯 Eşleşme Bulundu:", lines[i].substring(0, 40));
                            
                            let streamUrl = "";
                            for (let j = 1; j <= 3; j++) {
                                if (lines[i+j] && lines[i+j].trim().startsWith("http")) {
                                    streamUrl = lines[i+j].trim();
                                    break;
                                }
                            }

                            if (streamUrl) {
                                results.push({
                                    name: "📡 CANLI TV",
                                    title: lines[i].split(',').pop().trim(),
                                    url: streamUrl
                                });
                            }
                        }
                    }
                }
                console.log("✅ Toplam Sonuç:", results.length);
                resolve(results);
            })
            .catch(err => {
                console.error("🔴 FETCH HATASI:", err.message);
                resolve([]);
            });
    });
};

globalThis.getStreams = getStreams;
