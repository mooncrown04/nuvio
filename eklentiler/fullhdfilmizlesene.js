const cheerio = require("cheerio-without-node-native");

// Şifre Çözücü (ROT13 + Base64)
function decodeSecret(s) {
    try {
        if (!s) return null;
        let rotated = s.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        // APK ortamında Buffer yoksa atob kullanır
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(rotated, 'base64').toString('utf-8');
        } else {
            return atob(rotated);
        }
    } catch (e) { return null; }
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.fullhdfilmizlesene.live/'
    };

    try {
        // 1. TMDB'den film ismini al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const movieData = await tmdbRes.json();
        
        // 2. Sitede arama yap
        const searchUrl = `https://www.fullhdfilmizlesene.live/arama/${encodeURIComponent(movieData.title)}`;
        const searchRes = await fetch(searchUrl, { headers });
        const searchHtml = await searchRes.text();
        const $ = cheerio.load(searchHtml);
        const filmLink = $("li.film a").first().attr("href");

        if (!filmLink) return [];

        // 3. Film sayfasını çek
        const pageRes = await fetch(filmLink, { headers });
        const pageHtml = await pageRes.text();
        const streams = [];

        // 4. Şifreli 'scx' objesini bul
        const scxRegex = /scx\s*=\s*({[\s\S]*?});/i;
        const match = scxRegex.exec(pageHtml);

        if (match) {
            // JS objesini temizle ve JSON'a çevir
            let rawJson = match[1]
                .replace(/'/g, '"')
                .replace(/(\w+):/g, '"$1":')
                .replace(/,\s*}/g, '}');
            
            const data = JSON.parse(rawJson);
            // Sitenin kullandığı yaygın etiketler
            const labels = ["atom", "proton", "fast", "tr", "en", "dublaj", "alt-yazi"];

            labels.forEach(label => {
                if (data[label] && data[label].sx && data[label].sx.t) {
                    let tokens = Array.isArray(data[label].sx.t) ? data[label].sx.t : [data[label].sx.t];
                    tokens.forEach(t => {
                        const dec = decodeSecret(t);
                        if (dec && dec.startsWith("http")) {
                            // EXTRACTION YAPMADAN DİREKT EMBED LİNKİNİ VER
                            streams.push({
                                name: `FHD - ${label.toUpperCase()}`,
                                url: dec, // Örn: https://rapidvid.net/vod/v1x690030ec
                                quality: "1080p",
                                headers: headers
                            });
                        }
                    });
                }
            });
        }

        // Eğer scx'den bir şey çıkmadıysa sayfadaki iframe'leri topla
        if (streams.length === 0) {
            const $page = cheerio.load(pageHtml);
            $page("iframe").each((i, el) => {
                let src = $(el).attr("src") || $(el).attr("data-src");
                if (src && src.includes("http")) {
                    streams.push({
                        name: "Alternatif Kaynak",
                        url: src.startsWith("//") ? "https:" + src : src,
                        quality: "Auto",
                        headers: headers
                    });
                }
            });
        }

        return streams;
    } catch (err) {
        return [];
    }
}

module.exports = { getStreams };
