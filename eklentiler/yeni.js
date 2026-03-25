/**
 * 666FilmIzle Scraper - v7.5 (Dangal 404 Detaylandırma)
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://666filmizle.site";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";

async function getStreams(tmdbId, mediaType) {
    try {
        const type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const movieData = await tmdbRes.json();
        const title = movieData.title || movieData.name;

        console.log(`[666-ANALIZ] Film Araniyor: ${title}`);

        const searchHtml = await (await fetch(`${BASE_URL}/arama/?q=${encodeURIComponent(title)}`)).text();
        const $search = cheerio.load(searchHtml);
        let filmUrl = "";
        
        $search(".film-card").each((i, el) => {
            const link = $search(el).find("a.film-card__link").attr("href");
            if (link) { filmUrl = link.startsWith('http') ? link : BASE_URL + link; return false; }
        });

        if (!filmUrl) {
            console.error("[666-ANALIZ] Sitede film bulunamadı.");
            return [];
        }

        const pageHtml = await (await fetch(filmUrl)).text();
        
        // --- KRİTİK ANALİZ BÖLGESİ ---
        const frameMatch = pageHtml.match(/data-frame="([^"]+)"/);
        const streams = [];

        if (frameMatch) {
            const rawFrame = frameMatch[1];
            console.log(`[666-ANALIZ] Siteden Gelen Ham Link: ${rawFrame}`);

            // ID Çıkarma
            const videoId = rawFrame.split(/[#/]/).filter(p => p.length > 5).pop()?.split('?')[0];
            
            if (videoId) {
                const testUrl = `https://p.rapidplay.website/videos/${videoId}/master.m3u8`;
                console.log(`[666-ANALIZ] Denenecek Final Link: ${testUrl}`);

                // SUNUCU YANITI KONTROLÜ (404 mü değil mi?)
                const checkRes = await fetch(testUrl, { method: 'HEAD' });
                console.log(`[666-ANALIZ] Sunucu Durum Kodu: ${checkRes.status}`); 

                if (checkRes.status === 404) {
                    console.error("[666-ANALIZ] DİKKAT: Link sunucuda yok (404)! Dangal ID'si hatalı veya sunucu yolu farklı.");
                }

                streams.push({
                    name: "Rapidplay (S1)",
                    url: testUrl,
                    quality: "Auto",
                    isM3U8: true,
                    headers: { 'Referer': 'https://rapidplay.website/' },
                    provider: "666film"
                });
            }
        }

        // Vidmoly'yi her zaman ekleyelim çünkü Dangal'da tek kurtuluş olabilir
        const vidmolyMatch = pageHtml.match(/https:\/\/vidmoly\.to\/embed-([^.]+)\.html/);
        if (vidmolyMatch) {
            console.log(`[666-ANALIZ] Vidmoly Alternatifi Bulundu: ${vidmolyMatch[0]}`);
            streams.push({
                name: "Vidmoly (Yedek)",
                url: vidmolyMatch[0],
                quality: "HD",
                provider: "666film"
            });
        }

        return streams;
    } catch (e) {
        console.error(`[666-ANALIZ] HATA: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
