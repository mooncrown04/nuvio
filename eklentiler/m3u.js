/**
 * MoOnCrOwN - Ultimate Provider (V15)
 * - Stabil Dizi Eşleşmesi
 * - Hızlı Çoklu Link Yakalama
 * - Timeout ve Hata Yönetimi
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
                .replace(/\(.*?\)/g, '')
                .replace(/\[.*?\]/g, '')
                .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
                .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
                .replace(/[^a-z0-9]/g, '') 
                .trim();
        };

        const runSearch = (trName, enName) => {
            const queryTR = normalize(trName);
            const queryEN = normalize(enName);
            
            let sNum = parseInt(seasonNum);
            let eNum = parseInt(episodeNum);
            let sPad = sNum < 10 ? "0" + sNum : sNum;
            let ePad = eNum < 10 ? "0" + eNum : eNum;

            fetch(targetM3U)
                .then(res => res.text())
                .then(content => {
                    const lines = content.split('\n');
                    let results = [];
                    
                    for (let i = 0; i < lines.length; i++) {
                        let line = lines[i];
                        if (line.includes("#EXTINF")) {
                            let match = line.match(/tvg-name="([^"]+)"/i) || line.match(/,(.*)$/);
                            let m3uOriginalName = match ? (match[1] || match[0]).replace(",", "").trim() : "";
                            let m3uClean = normalize(m3uOriginalName);

                            let isMatch = false;

                            if (isSeries) {
                                // Dizi kontrolü: İsim + Bölüm formatı
                                let hasName = m3uClean.includes(queryTR) || m3uClean.includes(queryEN);
                                let hasEp = m3uClean.includes("s"+sPad+"e"+ePad) || 
                                            m3uClean.includes(sNum+"x"+eNum) ||
                                            (m3uClean.includes(sNum+"s") && m3uClean.includes("bolum"+eNum));

                                if (hasName && hasEp) isMatch = true;
                            } else {
                                // Film kontrolü: Tam eşleşme
                                if (m3uClean === queryTR || m3uClean === queryEN) isMatch = true;
                            }

                            if (isMatch) {
                                // Linki bul (EXTINF'ten sonraki ilk http satırı)
                                let foundUrl = "";
                                for (let j = 1; j <= 3; j++) {
                                    if (lines[i+j] && lines[i+j].trim().startsWith("http")) {
                                        foundUrl = lines[i+j].trim();
                                        break;
                                    }
                                }

                                if (foundUrl) {
                                    results.push({
                                        name: isSeries ? `🎬 Dizi: S${sPad} | E${ePad} (#${results.length + 1})` : `🎞️ Sinema: Link ${results.length + 1}`,
                                        title: m3uOriginalName, 
                                        url: foundUrl,
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
