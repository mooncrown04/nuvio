/**
 * Nuvio Local Scraper - FilmciBaba (V13 - Debug)
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
        
        // Giriş tipini kontrol et (Nuvio bazen string bazen obje gönderir)
        const id = (typeof input === 'object' ? (input.imdbId || input.tmdbId) : input).toString();
        
        // Slug oluşturma (Ajan Zeta örneği için)
        // Eğer her zaman 'ajan-zeta' gibi elle giriyorsan burayı basitleştirebiliriz
        const targetUrl = `${config.baseUrl}/ajan-zeta/`; 
        console.error("[FilmciBaba] Hedef Sayfa: " + targetUrl);

        const response = await fetch(targetUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
        });
        const html = await response.text();
        
        let streams = [];

        // 1. ADIM: Sayfa içindeki tüm iframe ve script'leri topla
        // Bazen linkler düz metin değil, bir değişkenin içinde olur.
        const allLinks = html.match(/https?:\/\/[^"'\s<>]+/gi) || [];
        console.error(`[FilmciBaba] Toplam ${allLinks.length} adet link bulundu, filtreleniyor...`);

        // 2. ADIM: HotStream veya m3u8 içerenleri ayıkla
        const priorityLinks = allLinks.filter(link => 
            link.includes("hotstream.club/list/") || 
            link.includes(".m3u8") || 
            link.includes("goproxy")
        );

        for (const link of [...new Set(priorityLinks)]) { // Duplicate engelleme
            if (link.includes("/list/")) {
                console.error("[FilmciBaba] Liste Çözülüyor: " + link);
                try {
                    const listRes = await fetch(link, {
                        headers: { 'Referer': 'https://hotstream.club/' }
                    });
                    const content = await listRes.text();
                    const m3u8 = content.match(/https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/i);
                    
                    if (m3u8) {
                        streams.push({
                            name: "HotStream (Decoded)",
                            url: m3u8[0],
                            quality: "1080p",
                            isM3u8: true,
                            headers: { 'Referer': 'https://hotstream.club/' }
                        });
                    }
                } catch (e) {
                    console.error("[FilmciBaba] Decode hatası: " + link);
                }
            } else if (link.includes(".m3u8")) {
                streams.push({
                    name: "Direct Stream",
                    url: link,
                    quality: "720p",
                    isM3u8: true
                });
            }
        }

        console.error(`[FilmciBaba] Tarama Bitti. Bulunan: ${streams.length}`);
        return streams;

    } catch (error) {
        console.error("[FilmciBaba] Kritik Hata: " + error.message);
        return [];
    }
}

module.exports = { getStreams, config };
