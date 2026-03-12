/**
 * MoOnCrOwN - Film & Dizi Deposu (V8)
 * - TMDB Çift İsim (TR/EN) Desteği
 * - Nokta Atışı Arama Mantığı
 * - Dizi S/E Entegrasyonu
 */

const SOURCES = {
    movie: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/film.m3u",
    tv: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/dizi.m3u"
};

const getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        console.log(`[M3U_LOG] İstek Geldi: ${tmdbId} | Tip: ${mediaType}`);

        if (mediaType === 'live') return resolve([]);

        let cleanId = tmdbId ? tmdbId.toString().replace(/^[a-z0-9]+:/i, "") : "";
        let isSeries = (mediaType === 'series' || (mediaType === 'tv' && seasonNum));
        let targetM3U = isSeries ? SOURCES.tv : SOURCES.movie;

        // Yazı Temizleme (Boşluk ve noktalama işaretlerini yok sayar)
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
            
            // Dizi ise bölüm formatlarını hazırla
            let variations = [];
            if (isSeries && seasonNum && episodeNum) {
                let s = seasonNum < 10 ? "0" + seasonNum : seasonNum;
                let e = episodeNum < 10 ? "0" + episodeNum : episodeNum;
                
                // Örn: breakingbads01e01, breakingbad1x1
                variations.push(queryTR + "s" + s + "e" + e);
                variations.push(queryEN + "s" + s + "e" + e);
                variations.push(queryTR + seasonNum + "x" + episodeNum);
                variations.push(queryEN + seasonNum + "x" + episodeNum);
            } else {
                // Film ise sadece isimleri kullan
                variations.push(queryTR);
                variations.push(queryEN);
            }

            console.log(`[M3U_LOG] Aranıyor: ${variations.join(" | ")}`);

            fetch(targetM3U)
                .then(res => res.text())
                .then(content => {
                    const lines = content.split('\n');
                    let results = [];
                    
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].includes("#EXTINF")) {
                            let match = lines[i].match(/tvg-name="([^"]+)"/i) || lines[i].match(/,(.*)$/);
                            let m3uName = match ? (match[1] || match[0]).replace(",", "").trim() : "";
                            let m3uClean = normalize(m3uName);

                            // NOKTA ATIŞI KONTROLÜ
                            // M3U'daki temizlenmiş isim, varyasyonlardan birine TAM eşit mi?
                            if (variations.includes(m3uClean)) {
                                let streamUrl = "";
                                for (let j = 1; j <= 3; j++) {
                                    if (lines[i + j] && lines[i + j].trim().startsWith("http")) {
                                        streamUrl = lines[i + j].trim();
                                        break;
                                    }
                                }

                                if (streamUrl) {
                                    results.push({
                                        name: isSeries ? `📺 DİZİ: ${seasonNum}x${episodeNum}` : "🎬 FİLM DEPOSU",
                                        title: m3uName,
                                        url: streamUrl,
                                        http_headers: { "User-Agent": "VLC/3.0.18" }
                                    });
                                }
                            }
                        }
                    }
                    console.log(`[M3U_LOG] Bitti. Sonuç: ${results.length}`);
                    resolve(results);
                })
                .catch(err => {
                    console.error("[M3U_ERR] Liste çekme hatası:", err);
                    resolve([]);
                });
        };

        // TMDB Veri Çekme
        const tmdbKey = "4ef0d7355d9ffb5151e987764708ce96";
        const tmdbType = isSeries ? 'tv' : 'movie';
        
        fetch(`https://api.themoviedb.org/3/${tmdbType}/${cleanId}?api_key=${tmdbKey}&language=tr-TR`)
            .then(r => r.json())
            .then(d => {
                let trTitle = d.title || d.name || "";
                let enTitle = d.original_title || d.original_name || "";
                
                if (trTitle || enTitle) {
                    runSearch(trTitle, enTitle);
                } else {
                    console.warn("[M3U_LOG] TMDB'den isim bulunamadı.");
                    resolve([]);
                }
            })
            .catch(err => {
                console.error("[M3U_ERR] TMDB Bağlantı Hatası:", err);
                resolve([]);
            });
    });
};

// Export işlemleri
globalThis.getStreams = getStreams;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
}
