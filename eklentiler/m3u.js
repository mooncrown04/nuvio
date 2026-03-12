/**
 * MoOnCrOwN - Film & Dizi Deposu (V6)
 * Referer silindi, fonksiyon export sorunu düzeltildi.
 */

const SOURCES = {
    movie: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/film.m3u",
    tv: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/dizi.m3u"
};

const getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        // Hata ayıklama için başlangıç logu
        console.log(`[M3U_LOG] Baslatildi: ${tmdbId} | Tip: ${mediaType}`);

        if (mediaType === 'live') {
            return resolve([]);
        }

        let cleanId = tmdbId ? tmdbId.toString().replace(/^[a-z0-9]+:/i, "") : "";
        let isSeries = (mediaType === 'series' || (mediaType === 'tv' && seasonNum));
        let targetM3U = isSeries ? SOURCES.tv : SOURCES.movie;

        // Yazı temizleme fonksiyonu
        const normalize = (text) => {
            if (!text) return "";
            return text.toString().toLowerCase()
                .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
                .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
                .replace(/[^a-z0-9]/g, '') // Harf ve sayı dışındaki her şeyi (boşluk dahil) siler
                .trim();
        };

        const runSearch = (baseTitle) => {
            const queryClean = normalize(baseTitle);
            console.log(`[M3U_LOG] Aranan Kelime: ${queryClean}`);

            fetch(targetM3U)
                .then(res => res.text())
                .then(content => {
                    const lines = content.split('\n');
                    let results = [];
                    
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].includes("#EXTINF")) {
                            let match = lines[i].match(/tvg-name="([^"]+)"/i) || lines[i].match(/,(.*)$/);
                            let m3uName = match ? (match[1] || match[0]).replace(",", "").trim() : "";
                            
                            // M3U ismini de aynı şekilde temizle
                            let m3uClean = normalize(m3uName);

                            // TAM EŞLEŞME KONTROLÜ
                            // Örn: "venom3" === "venom3" -> TRUE | "venom2" === "venom3" -> FALSE
                            if (m3uClean === queryClean) {
                                let streamUrl = "";
                                for (let j = 1; j <= 3; j++) {
                                    if (lines[i + j] && lines[i + j].trim().startsWith("http")) {
                                        streamUrl = lines[i + j].trim();
                                        break;
                                    }
                                }

                                if (streamUrl) {
                                    results.push({
                                        name: isSeries ? "📺 DİZİ" : "🎬 FİLM",
                                        title: m3uName,
                                        url: streamUrl,
                                        http_headers: {
                                            "User-Agent": "VLC/3.0.18"
                                        }
                                    });
                                }
                            }
                        }
                    }
                    console.log(`[M3U_LOG] Sonuc: ${results.length} adet bulundu.`);
                    resolve(results);
                })
                .catch(err => {
                    console.error("[M3U_ERR] Fetch Hatasi:", err);
                    resolve([]);
                });
        };

        const tmdbKey = "4ef0d7355d9ffb5151e987764708ce96";
        const tmdbType = isSeries ? 'tv' : 'movie';
        
        fetch(`https://api.themoviedb.org/3/${tmdbType}/${cleanId}?api_key=${tmdbKey}&language=tr-TR`)
            .then(r => r.json())
            .then(d => {
                let name = d.title || d.name || "";
                if (name) runSearch(name);
                else resolve([]);
            })
            .catch(err => {
                console.error("[M3U_ERR] TMDB Baglanti Hatasi:", err);
                resolve([]);
            });
    });
};

// Android TV / Nuvio için fonksiyonu dışa aç (Export)
globalThis.getStreams = getStreams;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
}
