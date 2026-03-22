/**
 * Nuvio Local Scraper - FilmciBaba (V15 - IMDb & TMDB Fix)
 */

var cheerio = require("cheerio-without-node-native");

const config = {
    name: "FilmciBaba",
    baseUrl: "https://izle.plus",
    apiUrl: "https://api.themoviedb.org/3",
    apiKey: "500330721680edb6d5f7f12ba7cd9023", // Senin TMDB API Key'in
    id: "999b5a3c-bb95-571e-bd12-f5778eaecbfe"
};

async function getStreams(input) {
    try {
        console.error("[FilmciBaba] Sorgu Başladı...");
        
        // 1. IMDb ID'yi Çek ve TMDB üzerinden Film Adını Bul
        // Nuvio'dan gelen input: "tt12345" veya {imdbId: "tt12345"} olabilir
        const imdbId = (typeof input === 'object' ? input.imdbId : input);
        
        if (!imdbId) {
            console.error("[FilmciBaba] IMDb ID bulunamadı!");
            return [];
        }

        console.error("[FilmciBaba] IMDb Sorgulanıyor: " + imdbId);

        // TMDB'den film detaylarını al (Türkçe isim için)
        const tmdbRes = await fetch(`${config.apiUrl}/find/${imdbId}?api_key=${config.apiKey}&external_source=imdb_id&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        
        const movie = tmdbData.movie_results[0] || tmdbData.tv_results[0];
        if (!movie) throw new Error("TMDB'de içerik bulunamadı.");

        // Slug oluştur (İzle.plus formatı: kucuk-harf-tireli)
        const movieTitle = movie.title || movie.name;
        const slug = movieTitle.toLowerCase()
            .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
            .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .replace(/ /g, '-').replace(/[^\w-]+/g, '');

        const targetUrl = `${config.baseUrl}/${slug}/`;
        console.error("[FilmciBaba] Hedef URL: " + targetUrl);

        // 2. Sayfayı Çek
        const response = await fetch(targetUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
        });
        const html = await response.text();
        
        // 3. Link Arama (Daha Geniş Regex)
        // Hotstream linkleri bazen tırnak içinde bazen çıplak olur
        const hotstreamRegex = /https:\/\/hotstream\.club\/(?:list|embed)\/[a-zA-Z0-9+/=]+/gi;
        const matches = html.match(hotstreamRegex);

        if (!matches) {
            console.error("[FilmciBaba] Sayfada link yakalanamadı. HTML uzunluğu: " + html.length);
            // Debug: Eğer link bulunamazsa sayfanın bir kısmını logla (Sadece geliştirme aşamasında)
            // console.error(html.substring(0, 500)); 
            return [];
        }

        let streams = [];
        for (const link of [...new Set(matches)]) {
            console.error("[FilmciBaba] Kaynak Bulundu: " + link);
            
            // Eğer link /list/ ise içine girip m3u8 çekmeye çalış
            if (link.includes("/list/")) {
                const listRes = await fetch(link, { headers: { 'Referer': 'https://hotstream.club/' } });
                const listText = await listRes.text();
                const m3u8 = listText.match(/https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/i);
                
                if (m3u8) {
                    streams.push({
                        name: "FilmciBaba (HotStream HD)",
                        url: m3u8[0],
                        isM3u8: true,
                        headers: { 'Referer': 'https://hotstream.club/' }
                    });
                }
            } else {
                // Embed link ise doğrudan ekle
                streams.push({
                    name: "FilmciBaba (HotStream Embed)",
                    url: link,
                    headers: { 'Referer': config.baseUrl }
                });
            }
        }

        return streams;

    } catch (error) {
        console.error("[FilmciBaba] Hata: " + error.message);
        return [];
    }
}

module.exports = { getStreams, config };
