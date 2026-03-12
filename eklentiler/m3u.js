/**
 * MoOnCrOwN - Ultimate Provider (V16)
 * - Sayıyla başlayan dizi isimleri için düzeltme yapıldı.
 * - M3U satır sonu (virgül sonrası) önceliği eklendi.
 * - Çoklu link desteği optimize edildi.
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
                .replace(/\(.*?\)/g, '')  // Parantezleri sil
                .replace(/\[.*?\]/g, '')  // Köşeli parantezleri sil
                .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
                .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
                .replace(/[^a-z0-9]/g, '') // Sadece harf ve sayı kalsın
                .trim();
        };

        const runSearch = (trName, enName) => {
            const queryTR = normalize(trName);
            const queryEN = normalize(enName);
            
            let sNum = parseInt(seasonNum);
            let eNum = parseInt(episodeNum);
            let sPad = sNum < 10 ? "0" + sNum : sNum;
            let ePad = eNum < 10 ? "0" + eNum : eNum;

            // Dizi için arama etiketleri (s01e01, 1x01 vb.)
            const episodeTags = ["s" + sPad + "e" + ePad, sNum + "x" + ePad, sNum + "x" + eNum];

            fetch(targetM3U)
                .then(res => res.text())
                .then(content => {
                    const lines = content.split('\n');
                    let results = [];
                    
                    for (let i = 0; i < lines.length; i++) {
                        let line = lines[i];
                        if (line.includes("#EXTINF")) {
                            // Satırın temizlenmiş hali
                            let normLine = normalize(line);
                            let isMatch = false;

                            if (isSeries) {
                                // 1. Adım: Satırda dizi adı geçiyor mu?
                                let nameMatch = normLine.includes(queryTR) || normLine.includes(queryEN);
                                // 2. Adım: Satırda bölüm bilgisi geçiyor mu?
                                let epMatch = episodeTags.some(tag => normLine.includes(tag)) || 
                                              (normLine.includes(sNum + "s") && normLine.includes("bolum" + eNum));

                                if (nameMatch && epMatch) isMatch = true;
                            } else {
                                // Filmlerde tam eşleşme devam
                                let match = line.match(/tvg-name="([^"]+)"/i) || line.match(/,(.*)$/);
                                let m3uName = match ? (match[1] || match[0]).replace(",", "").trim() : "";
                                if (normalize(m3uName) === queryTR || normalize(m3uName) === queryEN) isMatch = true;
                            }

                            if (isMatch) {
                                let foundUrl = "";
                                for (let j = 1; j <= 3; j++) {
                                    if (lines[i+j] && lines[i+j].trim().startsWith("http")) {
                                        foundUrl = lines[i+j].trim();
                                        break;
                                    }
                                }

                                if (foundUrl) {
                                    results.push({
                                        name: isSeries ? `🎬 Dizi: S${sPad} | E${ePad} (${results.length + 1})` : `🎞️ Sinema: Link ${results.length + 1}`,
                                        title: line.split(',').pop().trim() || "Kaynak", 
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
