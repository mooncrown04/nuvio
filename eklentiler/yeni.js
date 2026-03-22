/**
 * Nuvio Local Scraper - FilmciBaba (V17 - Fixed)
 */

var cheerio = require("cheerio-without-node-native");

const config = {
    name: "FilmciBaba",
    baseUrl: "https://izle.plus",
    apiUrl: "https://api.themoviedb.org/3",
    apiKey: "500330721680edb6d5f7f12ba7cd9023",
    id: "999b5a3c-bb95-571e-bd12-f5778eaecbfe"
};

async function getStreams(input) {
    try {
        console.error("[FilmciBaba] Sorgu Başladı...");
        
        let rawId = (typeof input === 'object' ? (input.imdbId || input.tmdbId) : input).toString();
        let imdbId = rawId.startsWith("tt") ? rawId : "tt" + rawId;
        
        console.error("[FilmciBaba] İşlenen IMDb ID: " + imdbId);

        let movie = null;

        // 1. ADIM: IMDb ID ile TMDB'den ara
        const findUrl = `${config.apiUrl}/find/${imdbId}?api_key=${config.apiKey}&external_source=imdb_id&language=tr-TR`;
        const tmdbRes = await fetch(findUrl);
        const tmdbData = await tmdbRes.json();
        
        movie = (tmdbData.movie_results && tmdbData.movie_results[0]) || 
                (tmdbData.tv_results && tmdbData.tv_results[0]);

        // 2. ADIM: Bulunamazsa doğrudan TMDB ID olarak dene (Fallback)
        if (!movie) {
            console.error("[FilmciBaba] IMDb ile bulunamadı, TMDB ID olarak deneniyor: " + rawId);
            const fallbackRes = await fetch(`${config.apiUrl}/movie/${rawId}?api_key=${config.apiKey}&language=tr-TR`);
            const fallbackData = await fallbackRes.json();
            if (fallbackData && (fallbackData.title || fallbackData.name)) {
                movie = fallbackData;
            }
        }

        if (!movie) throw new Error("İçerik TMDB'de bulunamadı.");

        // 3. ADIM: Slug oluştur ve Sayfayı Çek
        const movieTitle = movie.title || movie.name;
        const slug = movieTitle.toLowerCase()
            .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
            .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .replace(/ /g, '-').replace(/[^\w-]+/g, '');

        const targetUrl = `${config.baseUrl}/${slug}/`;
        console.error("[FilmciBaba] Hedef Sayfa: " + targetUrl);

        const response = await fetch(targetUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
        });
        const html = await response.text();
        
        const matches = html.match(/https:\/\/hotstream\.club\/(?:list|embed)\/[a-zA-Z0-9+/=]+/gi);

        if (!matches) {
            console.error("[FilmciBaba] Sayfada video linki bulunamadı.");
            return [];
        }

        let streams = [];
        for (const link of [...new Set(matches)]) {
            streams.push({
                name: "FilmciBaba (HotStream)",
                url: link,
                isM3u8: link.includes("/list/"),
                headers: { 'Referer': 'https://hotstream.club/' }
            });
        }

        console.error(`[FilmciBaba] Tamamlandı. ${streams.length} kaynak eklendi.`);
        return streams;

    } catch (error) {
        console.error("[FilmciBaba] Hata: " + error.message);
        return [];
    }
}

module.exports = { getStreams, config };
