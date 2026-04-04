var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "6.6.0-PURE-ERROR-LOG";

async function getStreams(tmdbId, mediaType) {
    // Log yerine direkt ERROR basarak görünürlüğü artırıyoruz
    console.error(`[DEBUG-V${VERSION}] getStreams TETİKLENDİ | ID: ${tmdbId} | Tip: ${mediaType}`);

    if (mediaType === 'tv') {
        console.error(`[DEBUG-V${VERSION}] İPTAL: TV şovları desteklenmiyor.`);
        return [];
    }

    try {
        const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`;
        console.error(`[DEBUG-V${VERSION}] TMDB İSTEĞİ: ${tmdbUrl}`);

        const tmdbRes = await fetch(tmdbUrl);
        
        if (!tmdbRes.ok) {
            console.error(`[ERROR-V${VERSION}] TMDB HATASI! Statu: ${tmdbRes.status}`);
            return [];
        }

        const d = await tmdbRes.json();
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null;
        const movieTitle = d.title || "Film";
        const releaseYear = (d.release_date || '').slice(0, 4);

        if (!imdbId) {
            console.error(`[ERROR-V${VERSION}] IMDb ID BULUNAMADI! (TMDB ID: ${tmdbId})`);
            return [];
        }

        console.error(`[DEBUG-V${VERSION}] IMDb ID BULUNDU: ${imdbId} - Başlık: ${movieTitle}`);

        const results = [];

        // --- SOURCE 1: VidSrc ---
        results.push({
            url: `https://vidsrc.to/embed/movie/${imdbId}`,
            name: "VidSrc",
            title: `[VidSrc] ${movieTitle} (${releaseYear})`,
            quality: "1080p",
            score: 100
        });

        // --- SOURCE 2: MultiEmbed ---
        results.push({
            url: `https://multiembed.mov/?video_id=${imdbId}`,
            name: "MultiEmbed",
            title: `[Multi] ${movieTitle} (${releaseYear})`,
            quality: "1080p",
            score: 95
        });

        console.error(`[DEBUG-V${VERSION}] BAŞARILI: ${results.length} kaynak listeye eklendi.`);
        return results;

    } catch (e) {
        // Kritik hataları stack trace ile birlikte basıyoruz
        console.error(`[CRITICAL-ERROR-V${VERSION}] HATA MESAJI: ${e.message}`);
        console.error(`[CRITICAL-ERROR-V${VERSION}] HATA YOLU: ${e.stack}`);
        return [];
    }
}

// Uygulamanın fonksiyonu bulamaması riskine karşı her iki yöntemi de kullanıyoruz
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
}
globalThis.getStreams = getStreams;
