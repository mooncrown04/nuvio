/**
 * MoOnCrOwN - Ultimate Provider (V14)
 * - Aynı içerik için çoklu link desteği
 * - Modern "Dizi" etiketi ve ikonları
 * - Parantez temizleme sistemi
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
                .replace(/\(.*?\)/g, '')  // (notlar) silinir
                .replace(/\[.*?\]/g, '')  // [notlar] silinir
                .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
                .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
                .replace(/[^a-z0-9]/g, '') 
                .trim();
        };

        const runSearch = (trName, enName) => {
            const queryTR = normalize(trName);
            const queryEN = normalize(enName);
            
            let s = seasonNum < 10 ? "0" + seasonNum : seasonNum;
            let e = episodeNum < 10 ? "0" + episodeNum : episodeNum;

            fetch(targetM3U).then(res => res.text()).then(content => {
                const lines = content.split('\n');
                let results = [];
                
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes("#EXTINF")) {
                        let match = lines[i].match(/tvg-name="([^"]+)"/i) || lines[i].match(/,(.*)$/);
                        let m3uOriginalName = match ? (match[1] || match[0]).replace(",", "").trim() : "";
                        let m3uClean = normalize(m3uOriginalName);

                        let isMatch = false;

                        if (isSeries) {
                            // Dizi: İsim + Bölüm uyumu
                            let hasName = m3uClean.includes(queryTR) || m3uClean.includes(queryEN);
                            let hasEpisode = m3uClean.includes("s" + s + "e" + e) || 
                                             (m3uClean.includes(seasonNum + "s") && m3uClean.includes("bolum" + episodeNum)) ||
                                             m3uClean.includes(seasonNum + "x" + episodeNum);
                            if (hasName && hasEpisode) isMatch = true;
                        } else {
                            // Film: Tam isim uyumu
                            if (m3uClean === queryTR || m3uClean === queryEN) isMatch = true;
                        }

                        if (isMatch) {
                            let streamUrl = "";
                            // #EXTINF satırından sonraki linki bul (bir sonraki satıra bak)
                            if (lines[i + 1] && lines[i + 1].trim().startsWith("http")) {
                                streamUrl = lines[i + 1].trim();
                            } else if (lines[i + 2] && lines[i + 2].trim().startsWith("http")) {
                                streamUrl = lines[i + 2].trim();
                            }

                            if (streamUrl) {
                                // ÇOKLU LİNK DESTEĞİ: Her eşleşeni yeni bir obje olarak ekle
                                results.push({
                                    name: isSeries ? `🎬 Dizi: S${s} | E${e} (${results.length + 1})` : `🎞️ Sinema: Link ${results.length + 1}`,
                                    title: m3uOriginalName, 
                                    url: streamUrl,
                                    http_headers: { "User-Agent": "VLC/3.0.18" }
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
                runSearch(d.title || d.name || "", d.original_title || d.original_name || "");
            })
            .catch(() => resolve([]));
    });
};

globalThis.getStreams = getStreams;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
}
