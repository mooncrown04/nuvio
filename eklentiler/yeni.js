/**
 * Nuvio Local Scraper - FilmciBaba (V14 - Proxy Fix)
 */

var cheerio = require("cheerio-without-node-native");

const config = {
    name: "FilmciBaba",
    baseUrl: "https://izle.plus",
    id: "999b5a3c-bb95-571e-bd12-f5778eaecbfe"
};

async function getStreams(input) {
    try {
        console.error("[FilmciBaba] Sorgu Başladı...");
        
        // Ajan Zeta için direkt sayfa (Dinamik slug eklenebilir)
        const targetUrl = "https://izle.plus/ajan-zeta/"; 

        const response = await fetch(targetUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
        });
        const html = await response.text();
        
        // Loglardaki o meşhur /list/ linkini yakalayalım
        const hotstreamMatch = html.match(/https:\/\/hotstream\.club\/list\/[a-zA-Z0-9+/=]+/gi);
        
        if (!hotstreamMatch) {
            console.error("[FilmciBaba] Sayfada HotStream linki bulunamadı!");
            return [];
        }

        let streams = [];
        const uniqueLinks = [...new Set(hotstreamMatch)];

        for (const listUrl of uniqueLinks) {
            console.error("[FilmciBaba] Kaynak Çözümleniyor: " + listUrl);

            // KRİTİK NOKTA: HotStream'e gidip içindeki gerçek seyret1.top linkini almalıyız
            const listRes = await fetch(listUrl, {
                headers: { 
                    'Referer': 'https://hotstream.club/',
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            const manifestContent = await listRes.text();

            // Manifest içindeki asıl video URL'sini (seyret1.top) bulalım
            const realVideoMatch = manifestContent.match(/https?:\/\/seyret1\.top\/process\/[a-zA-Z0-9+/=]+/gi);
            
            if (realVideoMatch) {
                console.error("[FilmciBaba] Gerçek Video Bulundu: seyret1.top");
                streams.push({
                    name: "FilmciBaba - HotStream (HD)",
                    url: listUrl, // Oynatıcıya listeyi veriyoruz
                    quality: "1080p",
                    isM3u8: true,
                    headers: { 
                        'Referer': 'https://hotstream.club/embed/hEk7szkobgFelSf', // Loglardaki referer
                        'Origin': 'https://hotstream.club',
                        'User-Agent': 'Mozilla/5.0'
                    }
                });
            } else {
                // Eğer seyret1 linki çıkmazsa bile listeyi ekle (Fallback)
                streams.push({
                    name: "FilmciBaba - Alternatif",
                    url: listUrl,
                    quality: "720p",
                    isM3u8: true,
                    headers: { 'Referer': 'https://hotstream.club/' }
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
