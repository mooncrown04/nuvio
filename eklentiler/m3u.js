/**
 * MoOnCrOwN - Goldvod M3U Engine (Full Version)
 * Manifest JSON ve M3U dosyaları arasında köprü kurar.
 */

// 1. LİSTE KAYNAKLARI (Burayı kendi linklerinle güncelle)
const SOURCES = {
    movie: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/film.m3u",
    tv: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/dizi.m3u",
    live: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u"
};

// 2. YAZI NORMALLEŞTİRME (Eşleşme oranını artırır)
function normalize(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
        .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

// 3. ANA FONKSİYON
var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        // Manifestten gelen "gode:movie:123" gibi ID'leri temizle
        let cleanId = tmdbId ? tmdbId.toString().replace(/^gode:(movie:|series:|tv:)?/, "") : "";
        
        // Manifest tipine göre (movie, series, tv) hangi listeye bakacağımızı seç
        let isLive = (mediaType === 'tv' || cleanId.startsWith("iptv_"));
        let targetM3U = isLive ? SOURCES.live : (mediaType === 'series' ? SOURCES.tv : SOURCES.movie);

        // Arama ve Link Yakalama Fonksiyonu
        const runSearch = (query) => {
            const cleanQuery = normalize(query);
            
            fetch(targetM3U)
                .then(res => res.text())
                .then(content => {
                    const lines = content.split('\n');
                    let results = [];
                    
                    for (let i = 0; i < lines.length; i++) {
                        if (lines[i].includes("#EXTINF")) {
                            // Kanal/Film adını yakala
                            let match = lines[i].match(/tvg-name="([^"]+)"/i) || lines[i].match(/,(.*)$/);
                            let m3uName = match ? (match[1] || match[0]).replace(",", "").trim() : "";

                            if (normalize(m3uName).includes(cleanQuery)) {
                                // Linki bul (Alt satırlarda http ile başlayan ilk satırı al)
                                let streamUrl = "";
                                for (let j = 1; j <= 3; j++) {
                                    if (lines[i + j] && lines[i + j].trim().startsWith("http")) {
                                        streamUrl = lines[i + j].trim();
                                        break;
                                    }
                                }

                                if (streamUrl) {
                                    results.push({
                                        name: isLive ? "🔴 CANLI" : "🎬 MOONCROWN",
                                        title: m3uName,
                                        url: streamUrl,
                                        // Oynatma sorunlarını çözen kritik Headerlar
                                        http_headers: {
                                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VLC/3.0.18",
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

        // İŞLEMİ BAŞLAT
        if (isLive) {
            // Canlı TV ise ID'deki alt çizgileri temizle ve doğrudan M3U'da ara
            runSearch(cleanId.replace("iptv_", "").replace(/_/g, " "));
        } else {
            // Film/Dizi ise TMDB'den Türkçe isim alıp öyle M3U'da ara
            const tmdbKey = "4ef0d7355d9ffb5151e987764708ce96";
            const tmdbType = (mediaType === 'series' || seasonNum) ? 'tv' : 'movie';
            
            fetch(`https://api.themoviedb.org/3/${tmdbType}/${cleanId}?api_key=${tmdbKey}&language=tr-TR`)
                .then(r => r.json())
                .then(d => runSearch(d.title || d.name || cleanId))
                .catch(() => runSearch(cleanId));
        }
    });
};

// Modül dışa aktarımı (Nuvio için)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
