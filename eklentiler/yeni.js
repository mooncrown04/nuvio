/**
 * 666FilmIzle Scraper - v6.0 (Dangal & Gorge Fix)
 * Rapidplay 404 hatalarına karşı alternatif kaynak öncelikli sürüm.
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = "https://666filmizle.site";
var TMDB_API_KEY = "500330721680edb6d5f7f12ba7cd9023";

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

async function getStreams(tmdbId, mediaType) {
    try {
        const type = (mediaType === 'tv' || mediaType === 'series') ? 'tv' : 'movie';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const movieData = await tmdbRes.json();
        const title = movieData.title || movieData.name;

        if (!title) return [];

        const searchHtml = await (await fetch(`${BASE_URL}/arama/?q=${encodeURIComponent(title)}`, { headers: HEADERS })).text();
        const $search = cheerio.load(searchHtml);
        let filmUrl = "";
        
        $search(".film-card").each((i, el) => {
            const link = $search(el).find("a.film-card__link").attr("href");
            if (link) { filmUrl = link.startsWith('http') ? link : BASE_URL + link; return false; }
        });

        if (!filmUrl) return [];

        const pageHtml = await (await fetch(filmUrl, { headers: HEADERS })).text();
        const streams = [];

        // 1. ALTERNATİF: VİDMOLY (Dangal gibi filmlerde Rapidplay'den daha stabildir)
        const vidmolyMatch = pageHtml.match(/https:\/\/vidmoly\.to\/embed-([^.]+)\.html/);
        if (vidmolyMatch) {
            streams.push({
                name: "666Film - Vidmoly (Stabil)",
                url: vidmolyMatch[0],
                quality: "HD",
                provider: "666film"
            });
        }

        // 2. RAPIDPLAY ANALİZİ
        const frameMatch = pageHtml.match(/data-frame="([^"]+)"/);
        if (frameMatch) {
            const rawFrameUrl = frameMatch[1];
            // ID Yakalama (The Gorge için çalışan mantık)
            const videoId = rawFrameUrl.split(/[#/]/).filter(p => p.length > 5).pop()?.split('?')[0];

            if (videoId) {
                // Sadece çalışan tek ana linki ekliyoruz (Kafa karışıklığı olmasın)
                streams.push({
                    name: "666Film - Rapidplay (Sunucu 1)",
                    url: `https://p.rapidplay.website/videos/${videoId}/master.m3u8`,
                    quality: "Auto",
                    isM3U8: true,
                    headers: { 'Referer': 'https://rapidplay.website/', 'Origin': 'https://rapidplay.website' },
                    provider: "666film"
                });
            }
        }

        // 3. DAİLYMOTİON / DİĞERLERİ
        if (pageHtml.includes('dailymotion.com')) {
            const dailyMatch = pageHtml.match(/https:\/\/www\.dailymotion\.com\/embed\/video\/([^"]+)/);
            if (dailyMatch) {
                streams.push({
                    name: "666Film - Dailymotion",
                    url: dailyMatch[0],
                    quality: "720p",
                    provider: "666film"
                });
            }
        }

        return streams;
    } catch (e) {
        return [];
    }
}

module.exports = { getStreams };
