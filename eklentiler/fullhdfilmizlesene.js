const cheerio = require("cheerio-without-node-native");

function decodeSecret(s) {
    try {
        if (!s) return null;
        let rotated = s.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        return Buffer.from(rotated, 'base64').toString('utf-8');
    } catch (e) { return null; }
}

async function extractVideoSource(embedUrl, headers) {
    try {
        const res = await fetch(embedUrl, { headers });
        const html = await res.text();
        // Video dosyasını ve ters eğik çizgileri temizleyerek al
        const videoMatch = /["']?file["']?\s*[:=]\s*["'](http[^"']+)["']/.exec(html);
        if (videoMatch && videoMatch[1]) {
            return videoMatch[1].replace(/\\/g, '');
        }
        return embedUrl;
    } catch (e) { return embedUrl; }
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    const siteUrl = 'https://www.fullhdfilmizlesene.live/';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': siteUrl
    };

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const movieData = await tmdbRes.json();
        
        const searchUrl = `${siteUrl}arama/${encodeURIComponent(movieData.title)}`;
        const searchRes = await fetch(searchUrl, { headers });
        const searchHtml = await searchRes.text();
        const $ = cheerio.load(searchHtml);
        const filmLink = $("li.film a").first().attr("href");

        if (!filmLink) return [];

        const pageRes = await fetch(filmLink, { headers });
        const pageHtml = await pageRes.text();
        const streams = [];

        const scxRegex = /scx\s*=\s*({[\s\S]*?});/i;
        const match = scxRegex.exec(pageHtml);

        if (match) {
            let rawJson = match[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":').replace(/,\s*}/g, '}');
            const data = JSON.parse(rawJson);
            const labels = ["atom", "proton", "fast", "tr", "en"];

            for (const label of labels) {
                if (data[label] && data[label].sx && data[label].sx.t) {
                    let tokens = Array.isArray(data[label].sx.t) ? data[label].sx.t : [data[label].sx.t];
                    for (const t of tokens) {
                        const embedUrl = decodeSecret(t);
                        if (embedUrl && embedUrl.startsWith("http")) {
                            const videoFile = await extractVideoSource(embedUrl, headers);
                            
                            // APK'LAR İÇİN KRİTİK NOKTA: Linkin yanına headers eklenmeli
                            streams.push({
                                name: `FHD - ${label.toUpperCase()}`,
                                url: videoFile,
                                quality: "1080p",
                                // Çoğu Android tabanlı eklenti bu formatı bekler:
                                headers: {
                                    "Referer": embedUrl, // Video sunucusu embed linkini referer olarak ister
                                    "User-Agent": headers['User-Agent']
                                }
                            });
                        }
                    }
                }
            }
        }
        return streams;
    } catch (err) {
        return [];
    }
}

module.exports = { getStreams };
