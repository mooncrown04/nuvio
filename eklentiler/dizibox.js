const cheerio = require("cheerio-without-node-native");
const CryptoJS = require("crypto-js");

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        const slug = (tmdbData.original_name || tmdbData.name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-1-izle/`;

        const mainHtml = await (await fetch(epUrl, { headers: HEADERS })).text();
        let playerUrl = cheerio.load(mainHtml)('div#video-area iframe').attr('src');
        if (!playerUrl) return [];
        playerUrl = playerUrl.startsWith('//') ? 'https:' + playerUrl : playerUrl;

        // --- KRİTİK ADIM: King sayfasının içine girmeye zorla ---
        const kingRes = await fetch(playerUrl, { headers: { ...HEADERS, 'Referer': epUrl } });
        const kingHtml = await kingRes.text();

        // 1. İhtimal: Sayfada gizli bir m3u8 var mı? (Bazı King sürümlerinde açık gelir)
        let m3u8 = kingHtml.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i)?.[1];

        // 2. İhtimal: Sheila yönlendirmesini yakala ve onun içine gir
        if (!m3u8) {
            const sheilaMatch = kingHtml.match(/https?:\/\/dbx\.molystream\.org\/embed\/sheila\/[a-zA-Z0-9-]+/i);
            if (sheilaMatch) {
                const sheilaHtml = await (await fetch(sheilaMatch[0], { headers: { ...HEADERS, 'Referer': 'https://dbx.molystream.org/' } })).text();
                
                // Sheila'nın içinde atob() ile gizlenmiş linki ara
                const b64Matches = sheilaHtml.match(/[a-zA-Z0-9+/=]{50,}/g) || [];
                for (let b64 of b64Matches) {
                    try {
                        const decoded = Buffer.from(b64, 'base64').toString('utf-8');
                        if (decoded.includes('.m3u8')) {
                            m3u8 = decoded.match(/https?:\/\/[^"']+\.m3u8[^"']*/i)?.[0];
                            if (m3u8) break;
                        }
                    } catch (e) {}
                }
            }
        }

        // 3. İhtimal: Arayüz her halükarda bir link görsün diye player'ı temizle
        const finalLink = m3u8 || playerUrl;

        return [{
            name: "DiziBox | " + (m3u8 ? "Direkt Link" : "Player"),
            url: finalLink.replace(/\\/g, ''),
            quality: "1080p",
            headers: { 
                'Referer': 'https://dbx.molystream.org/',
                'Origin': 'https://dbx.molystream.org',
                'User-Agent': HEADERS['User-Agent']
            }
        }];

    } catch (err) {
        return [];
    }
}

module.exports = { getStreams };
