const cheerio = require("cheerio-without-node-native");

// ROT13 + Base64 Çözücü
function decodeSecret(s) {
    try {
        if (!s) return null;
        let rotated = s.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        return Buffer.from(rotated, 'base64').toString('utf-8');
    } catch (e) { return null; }
}

// 1004 Hatasını Çözen Proton/Atom Extractor
async function extractM3U8(embedUrl, headers) {
    try {
        const res = await fetch(embedUrl, { headers });
        const html = await res.text();
        
        // Proton ve Atom sunucularında video linki genellikle "file": "..." içinde saklanır
        // Buradaki ters eğik çizgileri (\/) temizlemek kritik!
        const match = /["']?file["']?\s*[:=]\s*["'](http[^"']+\.m3u8[^"']*)["']/.exec(html);
        
        if (match && match[1]) {
            // Kaçış karakterlerini temizle (VLC'nin 1004 hatası vermesini engeller)
            let rawUrl = match[1].replace(/\\/g, '');
            return rawUrl;
        }
        return embedUrl; 
    } catch (e) { return embedUrl; }
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.fullhdfilmizlesene.live/'
    };

    try {
        // 1. Film Adını Al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const movieData = await tmdbRes.json();

        // 2. Sitede Ara
        const searchUrl = `https://www.fullhdfilmizlesene.live/arama/${encodeURIComponent(movieData.title)}`;
        const searchRes = await fetch(searchUrl, { headers });
        const searchHtml = await searchRes.text();
        const $ = cheerio.load(searchHtml);
        const filmLink = $("li.film a").first().attr("href");

        if (!filmLink) return [];

        // 3. Film Sayfasını Çek
        const pageRes = await fetch(filmLink, { headers });
        const pageHtml = await pageRes.text();
        const streams = [];

        // 4. Şifreli SCX Verisini Çöz
        const scxRegex = /scx\s*=\s*({[\s\S]*?});/i;
        const match = scxRegex.exec(pageHtml);

        if (match) {
            let rawJson = match[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1" :').replace(/,\s*}/g, '}');
            const data = JSON.parse(rawJson);
            const labels = ["proton", "atom", "fast", "tr", "en"]; // Proton en üstte

            for (const label of labels) {
                if (data[label] && data[label].sx && data[label].sx.t) {
                    let tokens = Array.isArray(data[label].sx.t) ? data[label].sx.t : [data[label].sx.t];
                    
                    for (const t of tokens) {
                        const embedUrl = decodeSecret(t);
                        if (embedUrl && embedUrl.startsWith("http")) {
                            
                            // --- EXTRATOR KULLANIMI ---
                            const finalLink = await extractM3U8(embedUrl, headers);
                            
                            streams.push({
                                name: `FHD - ${label.toUpperCase()}`,
                                url: finalLink,
                                quality: "1080p",
                                headers: {
                                    "Referer": embedUrl,
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
