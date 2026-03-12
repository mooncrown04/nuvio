/**
 * MoOnCrOwN - M3U Link Provider & Storage
 * Bu eklenti katalog sunmaz, sadece tıkladığın içeriğin linkini M3U içinden bulur.
 */

// 1. M3U LİNK DEPOLARIN (Kendi linklerin)
const SOURCES = {
    movie: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/film.m3u",
    tv: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/dizi.m3u",
    live: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u"
};

// 2. YAZI TEMİZLEME (Eşleşme oranını artırmak için)
function normalize(text) {
    if (!text) return "";
    return text.toString().toLowerCase()
        .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
        .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

// 3. ANA ARAMA MOTORU
var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        // ID Öneklerini Temizle (gode:, tmdb:, iptv: vb. hepsini siler)
        let cleanId = tmdbId ? tmdbId.toString().replace(/^[a-z0-9]+:/i, "") : "";
        
        // TİP BELİRLEME: Gelen istek 'live' mı, 'tv' (canlı veya dizi) mi yoksa 'movie' mi?
        // Eğer mediaType 'tv' ise ve sezon numarası yoksa bu bir CANLI yayındır.
        let isLive = (mediaType === 'live' || (mediaType === 'tv' && !seasonNum));
        
        // Hangi M3U dosyasına bakacağımızı seçiyoruz
        let targetM3U = isLive ? SOURCES.live : (mediaType === 'series' || seasonNum ? SOURCES.tv : SOURCES.movie);

        const runSearch = (query) => {
            const cleanQuery = normalize(query);
            
            fetch(targetM3U)
                .then(res => res.text())
                .then(content => {
                    const lines = content.split('\n');
                    let results = [];
                    
                    for (let i = 0; i < lines.length; i++) {
                        // M3U içindeki başlık satırını bul
                        if (lines[i].includes("#EXTINF")) {
                            let match = lines[i].match(/tvg-name="([^"]+)"/i) || lines[i].match(/,(.*)$/);
                            let m3uName = match ? (match[1] || match[0]).replace(",", "").trim() : "";

                            // İsimler eşleşiyorsa linki al
                            if (normalize(m3uName).includes(cleanQuery)) {
                                let streamUrl = "";
                                // Sonraki 3 satırda URL ara
                                for (let j = 1; j <= 3; j++) {
                                    if (lines[i + j] && lines[i + j].trim().startsWith("http")) {
                                        streamUrl = lines[i + j].trim();
                                        break;
                                    }
                                }

                                if (streamUrl) {
                                    results.push({
                                        name: isLive ? "📺 CANLI TV" : "🎬 M3U DEPO",
                                        title: m3uName,
                                        url: streamUrl,
                                        // Player'ın engellenmemesi için gereken Headerlar
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

        // 4. ARAMA TETİKLEME MANTIĞI
        if (isLive) {
            // Canlı yayında ID genelde isimdir (Örn: gode:TRT_1)
            runSearch(cleanId.replace(/_/g, " "));
        } else {
            // Film/Dizi ise TMDB üzerinden ismi alıp M3U deposunda ara
            const tmdbKey = "4ef0d7355d9ffb5151e987764708ce96";
            const tmdbType = (mediaType === 'series' || seasonNum) ? 'tv' : 'movie';
            
            fetch(`https://api.themoviedb.org/3/${tmdbType}/${cleanId}?api_key=${tmdbKey}&language=tr-TR`)
                .then(r => r.json())
                .then(d => runSearch(d.title || d.name || cleanId))
                .catch(() => runSearch(cleanId));
        }
    });
};

// Modül dışa aktarımı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
