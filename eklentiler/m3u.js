/**
 * MoOnCrOwN - Film & Dizi Deposu (V4)
 * Nokta atışı arama ve Sezon/Bölüm eşleştirme.
 */

const SOURCES = {
    movie: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/film.m3u",
    tv: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/dizi.m3u"
};

function normalize(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
        .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
        .replace(/[^a-z0-9]/g, '') // Boşlukları bile silerek daha sıkı eşleşme sağlar
        .trim();
}

var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        if (mediaType === 'live') return resolve([]);
        
        let cleanId = tmdbId ? tmdbId.toString().replace(/^[a-z0-9]+:/i, "") : "";
        let isSeries = (mediaType === 'series' || (mediaType === 'tv' && seasonNum));
        let targetM3U = isSeries ? SOURCES.tv : SOURCES.movie;

        const runSearch = (baseTitle) => {
            // Eğer diziyse, başlığın yanına S01E01 gibi formatlar ekleyerek ara
            let searchQueries = [];
            let normBase = normalize(baseTitle);

            if (isSeries && seasonNum && episodeNum) {
                // M3U dosyasında olabilecek farklı dizi formatları:
                let s = seasonNum < 10 ? "0" + seasonNum : seasonNum;
                let e = episodeNum < 10 ? "0" + episodeNum : episodeNum;
                
                // Örn: Breaking Bad S01E01, Breaking Bad 1x1, Breaking Bad 1 Sezon 1 Bolum
                searchQueries.push(normBase + normalize("S" + s + "E" + e));
                searchQueries.push(normBase + seasonNum + "x" + episodeNum);
                searchQueries.push(normBase + seasonNum + "sezon" + episodeNum + "bolum");
            } else {
                // Film ise sadece ana ismi kullan (Venom 3)
                searchQueries.push(normBase);
            }

            fetch(targetM3U).then(res => res.text()).then(content => {
                const lines = content.split('\n');
                let results = [];
                
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes("#EXTINF")) {
                        let match = lines[i].match(/tvg-name="([^"]+)"/i) || lines[i].match(/,(.*)$/);
                        let m3uName = match ? (match[1] || match[0]).replace(",", "").trim() : "";
                        let normM3U = normalize(m3uName);

                        // ARAMA MANTIĞI:
                        // searchQueries içindeki herhangi bir varyasyon M3U adıyla BİREBİR örtüşmeli.
                        // Bu sayede "Venom" araması "Venom 2"yi getirmez.
                        let isExactMatch = searchQueries.some(q => normM3U === q);

                        if (isExactMatch) {
                            let streamUrl = "";
                            for (let j = 1; j <= 3; j++) {
                                if (lines[i + j] && lines[i + j].trim().startsWith("http")) {
                                    streamUrl = lines[i + j].trim();
                                    break;
                                }
                            }

                            if (streamUrl) {
                                results.push({
                                    name: isSeries ? `📺 BÖLÜM: ${seasonNum}x${episodeNum}` : "🎬 FİLM DEPOSU",
                                    title: m3uName,
                                    url: streamUrl,
                                    http_headers: {
                                        "User-Agent": "VLC/3.0.18",
                                        "Referer": "https://goldvod.site/"
                                    }
                                });
                            }
                        }
                    }
                }
                resolve(results);
            }).catch(() => resolve([]));
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
            .catch(() => resolve([]));
    });
};
