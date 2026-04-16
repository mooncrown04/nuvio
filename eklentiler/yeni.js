var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "8.1.0-MULTI-SERVER";

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        // 1. TMDB Verisini Çek (Film/Dizi detaylarını ve IMDb ID'yi al)
        const typePath = (mediaType === 'movie') ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${typePath}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`;
        
        const tmdbRes = await fetch(tmdbUrl);
        const d = await tmdbRes.json();
        
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null;
        const title = d.title || d.name || "İçerik";
        
        // IMDb ID yoksa veya hatalıysa boş dön
        if (!imdbId || !imdbId.startsWith('tt')) return [];

        let streams = [];
        
        // 2. URL Uzantısını Belirle (Film için boş, dizi için /s1/e01 formatı)
        let suffix = "";
        let displayTitle = title;

        if (mediaType === 'movie') {
            const releaseYear = (d.release_date || '').slice(0, 4);
            displayTitle += releaseYear ? ` (${releaseYear})` : "";
        } else {
            let sStr = "s" + season;
            let eStr = "e" + (episode < 10 ? "0" + episode : episode);
            suffix = `/${sStr}/${eStr}`;
            displayTitle += ` - ${sStr.toUpperCase()}${eStr.toUpperCase()}`;
        }

        // 3. Kontrol Edilecek Sunucu Listesi
        // Not: Mixdrop için sitenin kullandığı güncel yolu (mx, md vb.) buraya yazmalısın.
        const servers = [
            { id: "vidmody", label: "Vidmody", path: "vs" },
            { id: "mixdrop", label: "Mixdrop",  path: "mx" } 
        ];

        // 4. Sunucuları Döngüye Al ve Kontrol Et
        for (const server of servers) {
            const targetUrl = `https://vidmody.com/${server.path}/${imdbId}${suffix}`;

            try {
                // HEAD isteği ile linkin aktif olup olmadığına bak (Hızlı kontrol)
                const checkRes = await fetch(targetUrl, { 
                    method: 'HEAD',
                    headers: { 'Referer': 'https://vidmody.com/' }
                });
                
                if (checkRes.status === 200) {
                    // Eğer link çalışıyorsa listeye ekle
                    streams.push({
                        url: targetUrl,
                        name: server.label, // Burada "Vidmody" veya "Mixdrop" yazar
                        title: displayTitle,
                        quality: "Auto",
                        headers: {
                            'Referer': 'https://vidmody.com/',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    });
                }
            } catch (err) {
                // Bir sunucuda hata olursa diğerine geçmek için devam et
                console.log(`${server.label} kontrol edilemedi: ${err.message}`);
                continue;
            }
        }

        // Bulunan tüm aktif linkleri döndür
        return streams;

    } catch (e) {
        console.error(`[V${VERSION}] GENEL HATA: ${e.message}`);
        return [];
    }
}

// Module export (CS3/Nuvio uyumu için)
if (typeof module !== 'undefined') module.exports = { getStreams };
