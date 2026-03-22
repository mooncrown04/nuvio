/**
 * Nuvio Local Scraper - FilmciBaba & HotStream Decoder
 * Version: 1.2.0
 */

var cheerio = require("cheerio-without-node-native");

// Nuvio'nun tanıdığı ana konfigürasyon
const config = {
    name: "FilmciBaba",
    baseUrl: "https://izle.plus",
    apiUrl: "https://api.themoviedb.org/3",
    apiKey: "500330721680edb6d5f7f12ba7cd9023", // TMDB Key
    id: "999b5a3c-bb95-571e-bd12-f5778eaecbfe"
};

/**
 * Nuvio bu fonksiyonu çağırır. 
 * @param {Object|String} input - IMDb ID veya Movie Objesi
 */
async function getStreams(input) {
    try {
        console.error("[FilmciBaba] Sorgu Başladı...");

        // 1. IMDb ID'den Film Adını ve Slug'ı Çıkar
        const id = (typeof input === 'object' ? (input.imdbId || input.tmdbId) : input).toString();
        const movieRes = await fetch(`${config.apiUrl}/movie/${id}?api_key=${config.apiKey}&language=tr-TR`);
        const movie = await movieRes.json();

        if (!movie.title) throw new Error("Film bilgisi TMDB'den alınamadı.");

        // Türkçe karakterleri temizleyip izle.plus uyumlu slug yapıyoruz
        const slug = movie.title.toLowerCase()
            .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
            .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .replace(/ /g, '-').replace(/[^\w-]+/g, '');

        const targetUrl = `${config.baseUrl}/${slug}/`;
        console.error("[FilmciBaba] Hedef Sayfa: " + targetUrl);

        // 2. Film Sayfasını Çek
        const response = await fetch(targetUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } 
        });
        const html = await response.text();
        const $ = cheerio.load(html);

        let streams = [];

        // 3. Sayfadaki HotStream Şifreli Listelerini Yakala
        // HTML içinde /list/N0Vj... şeklinde geçen yapıları arar
        const listMatches = html.match(/https:\/\/hotstream\.club\/list\/[a-zA-Z0-9+/=]+/gi);

        if (listMatches && listMatches.length > 0) {
            for (const listUrl of listMatches) {
                console.error("[FilmciBaba] Şifreli Liste Çözülüyor: " + listUrl);
                
                // HotStream List API'sine istek atıyoruz
                const listRes = await fetch(listUrl, {
                    headers: {
                        'Referer': 'https://hotstream.club/',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });
                const listContent = await listRes.text();

                // Çözülen içerik içinde .m3u8 veya .mp4 ara
                const videoMatch = listContent.match(/https?:\/\/[^\s'"]+\.(m3u8|mp4)[^\s'"]*/gi);
                
                if (videoMatch) {
                    streams.push({
                        name: "FilmciBaba - HotStream",
                        url: videoMatch[0],
                        quality: "1080p",
                        isM3u8: videoMatch[0].includes("m3u8"),
                        headers: { 
                            'Referer': 'https://hotstream.club/',
                            'User-Agent': 'Mozilla/5.0'
                        }
                    });
                }
            }
        }

        // 4. Alternatif: Iframe veya doğrudan link taraması (Fallback)
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && (src.includes('m3u8') || src.includes('google'))) {
                streams.push({
                    name: "Kaynak #" + (i + 1),
                    url: src,
                    quality: "720p",
                    headers: { 'Referer': config.baseUrl }
                });
            }
        });

        console.error(`[FilmciBaba] Bitti. ${streams.length} kaynak bulundu.`);
        return streams;

    } catch (error) {
        console.error("[FilmciBaba] Hata oluştu: " + error.message);
        return [];
    }
}

// Nuvio'nun eklentiyi tanıması için gerekli exportlar
module.exports = {
    getStreams,
    config
};
