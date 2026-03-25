/**
 * 666FilmIzle Scraper - v8.0 (Anti-404 & Auto-Fallback)
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

        const searchHtml = await (await fetch(`${BASE_URL}/arama/?q=${encodeURIComponent(title)}`)).text();
        const $search = cheerio.load(searchHtml);
        let filmUrl = "";
        
        $search(".film-card").each((i, el) => {
            const link = $search(el).find("a.film-card__link").attr("href");
            if (link) { filmUrl = link.startsWith('http') ? link : BASE_URL + link; return false; }
        });

        if (!filmUrl) return [];

        const pageHtml = await (await fetch(filmUrl)).text();
        const streams = [];

        // 1. ADIM: VİDMOLY KONTROLÜ (Dangal için en garanti yol)
        const vidmolyMatch = pageHtml.match(/https:\/\/vidmoly\.to\/embed-([^.]+)\.html/);
        if (vidmolyMatch) {
            streams.push({
                name: "Vidmoly (Hızlı Başlat)",
                url: vidmolyMatch[0],
                quality: "HD",
                provider: "666film"
            });
        }

        // 2. ADIM: RAPIDPLAY KONTROLÜ
        const frameMatch = pageHtml.match(/data-frame="([^"]+)"/);
        if (frameMatch) {
            const videoId = frameMatch[1].split(/[#/]/).filter(p => p.length > 5).pop()?.split('?')[0];
            if (videoId) {
                const rapidUrl = `https://p.rapidplay.website/videos/${videoId}/master.m3u8`;
                
                // Sadece Dangal değil, tüm filmler için 404 kontrolü yapalım
                try {
                    const check = await fetch(rapidUrl, { method: 'HEAD' });
                    if (check.status !== 404) {
                        streams.push({
                            name: "Rapidplay (Sunucu)",
                            url: rapidUrl,
                            quality: "Auto",
                            isM3U8: true,
                            headers: { 'Referer': 'https://rapidplay.website/' },
                            provider: "666film"
                        });
                    }
                } catch (e) {
                    // Fetch başarısız olsa bile listeye ekle (belki cihazdan erişilir)
                    streams.push({ name: "Rapidplay (Alternatif)", url: rapidUrl, isM3U8: true, provider: "666film" });
                }
            }
        }

        return streams;
    } catch (e) {
        return [];
    }
}

module.exports = { getStreams };
