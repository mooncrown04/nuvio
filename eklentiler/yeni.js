/**
 * Nuvio Local Scraper - FilmciBaba (V22 - Cookie Persistence)
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
        
        let movie = null;
        const findUrl = `${config.apiUrl}/find/${imdbId}?api_key=${config.apiKey}&external_source=imdb_id&language=tr-TR`;
        const tmdbRes = await fetch(findUrl);
        const tmdbData = await tmdbRes.json();
        
        movie = (tmdbData.movie_results && tmdbData.movie_results[0]) || 
                (tmdbData.tv_results && tmdbData.tv_results[0]);

        if (!movie) {
            const fallbackRes = await fetch(`${config.apiUrl}/movie/${rawId}?api_key=${config.apiKey}&language=tr-TR`);
            const fallbackData = await fallbackRes.json();
            if (fallbackData && (fallbackData.title || fallbackData.name)) movie = fallbackData;
        }

        if (!movie) throw new Error("İçerik bulunamadı.");

        const movieTitle = movie.title || movie.name;
        const slug = movieTitle.toLowerCase()
            .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
            .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .replace(/ /g, '-').replace(/[^\w-]+/g, '');

        const targetUrl = `${config.baseUrl}/${slug}/`;
        const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
        
        // 1. ADIM: Sayfayı yükle ve varsa çerezleri (set-cookie) al
        const response = await fetch(targetUrl, { 
            headers: { 'User-Agent': ua } 
        });
        
        // Çerezleri ayıkla
        const setCookie = response.headers.get('set-cookie');
        const cookie = setCookie ? setCookie.split(';')[0] : "";
        
        const html = await response.text();
        const matches = html.match(/https:\/\/hotstream\.club\/(?:list|embed)\/[a-zA-Z0-9+/=]+/gi);
        if (!matches) return [];

        let streams = [];
        for (const link of [...new Set(matches)]) {
            
            // 2. ADIM: Oynatıcı için başlıkları hazırla
            const headers = {
                'User-Agent': ua,
                'Referer': targetUrl, // Tam sayfa linki
                'Origin': config.baseUrl,
                'Connection': 'keep-alive'
            };
            
            if (cookie) headers['Cookie'] = cookie;

            // URL içine başlıkları göm (ExoPlayer için en garantisi)
            let pipeUrl = `${link}|User-Agent=${encodeURIComponent(ua)}&Referer=${encodeURIComponent(targetUrl)}`;
            if (cookie) pipeUrl += `&Cookie=${encodeURIComponent(cookie)}`;

            streams.push({
                name: "FilmciBaba (HotStream)",
                url: pipeUrl,
                isM3u8: link.includes("/list/"),
                headers: headers
            });
        }

        return streams;

    } catch (error) {
        console.error("[FilmciBaba] Hata: " + error.message);
        return [];
    }
}

module.exports = { getStreams, config };
