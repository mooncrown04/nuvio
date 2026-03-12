/**
 * MoOnCrOwN - Ultimate Provider (V9)
 * Dizi eşleşme algoritması M3U yapına göre optimize edildi.
 */

const SOURCES = {
    movie: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/film.m3u",
    tv: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/dizi.m3u"
};

const getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType === 'live') return resolve([]);

        let cleanId = tmdbId ? tmdbId.toString().replace(/^[a-z0-9]+:/i, "") : "";
        let isSeries = (mediaType === 'series' || (mediaType === 'tv' && seasonNum));
        let targetM3U = isSeries ? SOURCES.tv : SOURCES.movie;

        const normalize = (text) => {
            if (!text) return "";
            return text.toString().toLowerCase()
                .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
                .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
                .replace(/[^a-z0-9]/g, '') 
                .trim();
        };

        const runSearch = (trName, enName) => {
            const queryTR = normalize(trName);
            const queryEN = normalize(enName);
            
            // Bölüm kodları (01, 02 vb.)
            let s = seasonNum < 10 ? "0" + seasonNum : seasonNum;
            let e = episodeNum < 10 ? "0" + episodeNum : episodeNum;

            fetch(targetM3U)
                .then(res => res.text())
                .then(content => {
                    const lines = content.split('\n');
                    let results = [];
                    
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].includes("#EXTINF")) {
                            // Satırın tamamını al (hem tvg-name hem de virgülden sonrasını kontrol etmek için)
                            let fullLine = lines[i].toLowerCase();
                            let normLine = normalize(fullLine);

                            let isMatch = false;

                            if (isSeries) {
                                /**
                                 * DİZİ EŞLEŞME MANTIĞI:
                                 * Satırda dizi adı (TR veya EN) GEÇMELİ 
                                 * VE Sezon/Bölüm bilgisi (S01E01 veya 1.S...Bölüm 1) GEÇMELİ.
                                 */
                                let hasName = normLine.includes(queryTR) || normLine.includes(queryEN);
                                
                                // Bölüm varyasyonları: s01e01 veya 1sbolum1 gibi
                                let hasEpisode = normLine.includes("s" + s + "e" + e) || 
                                                 (normLine.includes(seasonNum + "s") && normLine.includes("bolum" + episodeNum)) ||
                                                 normLine.includes(seasonNum + "x" + episodeNum);

                                if (hasName && hasEpisode) isMatch = true;
                            } else {
                                // FİLM EŞLEŞME MANTIĞI: (Birebir aynı kalmalı, Venom 3 vs 2 karışmasın diye)
                                let match = lines[i].match(/tvg-name="([^"]+)"/i) || lines[i].match(/,(.*)$/);
                                let m3uName = match ? (match[1] || match[0]).replace(",", "").trim() : "";
                                let m3uClean = normalize(m3uName);
                                if (m3uClean === queryTR || m3uClean === queryEN) isMatch = true;
                            }

                            if (isMatch) {
                                let streamUrl = "";
                                for (let j = 1; j <= 3; j++) {
                                    if (lines[i + j] && lines[i + j].trim().startsWith("http")) {
                                        streamUrl = lines[i + j].trim();
                                        break;
                                    }
                                }

                                if (streamUrl) {
                                    results.push({
                                        name: isSeries ? `📺 BÖLÜM ${seasonNum}x${episodeNum}` : "🎬 FİLM DEPOSU",
                                        title: isSeries ? (lines[i].split(',')[1] || "Dizi Bölümü") : "Film",
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
        };

        const tmdbKey = "4ef0d7355d9ffb5151e987764708ce96";
        const tmdbType = isSeries ? 'tv' : 'movie';
        
        fetch(`https://api.themoviedb.org/3/${tmdbType}/${cleanId}?api_key=${tmdbKey}&language=tr-TR`)
            .then(r => r.json())
            .then(d => {
                runSearch(d.title || d.name || "", d.original_title || d.original_name || "");
            })
            .catch(() => resolve([]));
    });
};

globalThis.getStreams = getStreams;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
}
