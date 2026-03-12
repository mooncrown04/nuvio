/**
 * MoOnCrOwN - Ultimate M3U Link Provider
 * Bu eklenti katalog sunmaz, sadece tıkladığın içeriğin (Film, Dizi, Canlı)
 * linkini senin M3U depolarından (GitHub) bulup getirir.
 */

// 1. M3U LİNK DEPOLARIN
const SOURCES = {
    movie: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/film.m3u",
    tv: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/dizi.m3u",
    live: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u"
};

// 2. YAZI NORMALLEŞTİRME (Arama doğruluğu için)
function normalize(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
        .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

// 3. ANA ARAMA VE LİNK GETİRME MOTORU
var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        // ID Öneklerini Temizle (tt:, gode:, nfx: vb. her şeyi siler)
        let cleanId = tmdbId ? tmdbId.toString().replace(/^[a-z0-9]+:/i, "") : "";
        
        /**
         * TİP BELİRLEME MANTIĞI:
         * 1. mediaType 'series' ise veya 'tv' olup sezon bilgisi varsa -> DİZİ
         * 2. mediaType 'live' ise veya 'tv' olup sezon bilgisi YOKSA -> CANLI TV
         * 3. Diğer her şey -> FİLM
         */
        let isSeries = (mediaType === 'series' || (mediaType === 'tv' && seasonNum));
        let isLive = (mediaType === 'live' || (mediaType === 'tv' && !seasonNum));
        
        // Doğru M3U dosyasını seç
        let targetM3U = "";
        if (isLive) targetM3U = SOURCES.live;
        else if (isSeries) targetM3U = SOURCES.tv;
        else targetM3U = SOURCES.movie;

        const runSearch = (query) => {
            const cleanQuery = normalize(query);
            
            fetch(targetM3U)
                .then(res => res.text())
                .then(content => {
                    const lines = content.split('\n');
                    let results = [];
                    
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].includes("#EXTINF")) {
                            let match = lines[i].match(/tvg-name="([^"]+)"/i) || lines[i].match(/,(.*)$/);
                            let m3uName = match ? (match[1] || match[0]).replace(",", "").trim() : "";

                            // M3U içindeki isim ile aranan isim eşleşiyor mu?
                            if (normalize(m3uName).includes(cleanQuery)) {
                                let streamUrl = "";
                                // Sonraki 3 satırda URL'yi bul
                                for (let j = 1; j <= 3; j++) {
                                    if (lines[i + j] && lines[i + j].trim().startsWith("http")) {
                                        streamUrl = lines[i + j].trim();
                                        break;
                                    }
                                }

                                if (streamUrl) {
                                    results.push({
                                        name: isLive ? "🔴 CANLI TV" : (isSeries ? "📺 DİZİ DEPOSU" : "🎬 FİLM DEPOSU"),
                                        title: m3uName,
                                        url: streamUrl,
                                        // Player'ın videoyu açmasını sağlayan headerlar
                                        http_headers: {
                                            "User-Agent": "VLC/3.0.18",
                                            "Referer": "https://goldvod.site/",
                                            "Accept": "*/*"
                                        }
                                    });
                                }
                            }
                        }
                    }
                    resolve(results);
                })
                .catch(() => resolve([]));
        };

        // 4. ARAMAYI BAŞLAT
        if (isLive) {
            // Canlı kanallarda genelde ID kanal adıdır, alt çizgileri temizleyip ara
            runSearch(cleanId.replace(/_/g, " "));
        } else {
            // Film ve Dizilerde TMDB API üzerinden Türkçe ismi alıp öyle M3U'da ara
            const tmdbKey = "4ef0d7355d9ffb5151e987764708ce96";
            const tmdbType = isSeries ? 'tv' : 'movie';
            
            fetch(`https://api.themoviedb.org/3/${tmdbType}/${cleanId}?api_key=${tmdbKey}&language=tr-TR`)
                .then(r => r.json())
                .then(d => {
                    let searchName = d.title || d.name || cleanId;
                    runSearch(searchName);
                })
                .catch(() => runSearch(cleanId));
        }
    });
};

// Modül dışa aktarımı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
