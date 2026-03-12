/**
 * MoOnCrOwN - Live TV Provider
 * Sadece Canlı TV odaklı, kanal ismi eşleştirmeli sürüm.
 */

const LIVE_SOURCE = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

const getStreams = function(tmdbId, mediaType, seasonNum, episodeNum, channelName) {
    return new Promise(function(resolve) {
        // Sadece canlı yayın isteklerini işle, kanal adı yoksa boş dön
        if (mediaType !== 'live' || !channelName) return resolve([]);

        const normalize = (text) => {
            if (!text) return "";
            return text.toString().toLowerCase()
                .replace(/\(.*?\)/g, '') // Parantez içini sil
                .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
                .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
                .replace(/[^a-z0-9]/g, '') // Sadece harf ve sayı
                .trim();
        };

        const query = normalize(channelName);

        fetch(LIVE_SOURCE)
            .then(res => res.text())
            .then(content => {
                const lines = content.split('\n');
                let results = [];
                
                for (let i = 0; i < lines.length; i++) {
                    let line = lines[i];
                    if (line.includes("#EXTINF")) {
                        let normLine = normalize(line);

                        // KANAL EŞLEŞTİRME: Uygulamadan gelen kanal ismi M3U satırında geçiyor mu?
                        if (normLine.includes(query)) {
                            
                            // Etiketleri çek (Kalite ve Dil)
                            let quality = (line.match(/tvg-quality="([^"]*)"/i) || ["", ""])[1].trim();
                            let language = (line.match(/tvg-language="([^"]*)"/i) || ["", ""])[1].trim();
                            
                            let extra = "";
                            if (language) extra += ` [${language}]`;
                            if (quality) extra += ` [${quality}]`;

                            // Satırın altındaki linki bul
                            let streamUrl = "";
                            for (let j = 1; j <= 3; j++) {
                                if (lines[i + j] && lines[i + j].trim().startsWith("http")) {
                                    streamUrl = lines[i + j].trim();
                                    break;
                                }
                            }

                            if (streamUrl) {
                                results.push({
                                    name: `📡 CANLI${extra || " [HD]"}`,
                                    title: line.split(',').pop().trim(), // Kanalın tam adı
                                    url: streamUrl,
                                    http_headers: { "User-Agent": "VLC/3.0.18" }
                                });
                            }
                        }
                    }
                }
                resolve(results);
            })
            .catch(() => resolve([]));
    });
};

globalThis.getStreams = getStreams;
