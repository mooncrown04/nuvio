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

function getStreams(tmdbId, mediaType) {
    return new Promise(async (resolve) => {
        if (mediaType !== 'movie') return resolve([]);

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Referer': 'https://www.fullhdfilmizlesene.live/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        };

        try {
            // 1. TMDB üzerinden film adını al
            const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
            const movieData = await tmdbRes.json();
            console.log(`-> Film: ${movieData.title}`);

            // 2. Sitede Ara
            const searchUrl = `https://www.fullhdfilmizlesene.live/arama/${encodeURIComponent(movieData.title)}`;
            const searchRes = await fetch(searchUrl, { headers });
            const searchHtml = await searchRes.text();
            
            const $search = cheerio.load(searchHtml);
            const filmLink = $search("li.film a").first().attr("href");

            if (!filmLink) {
                console.log("! Film bulunamadı.");
                return resolve([]);
            }

            // 3. Film Sayfasını Çek
            console.log(`-> Sayfa: ${filmLink}`);
            const pageRes = await fetch(filmLink, { headers });
            const pageHtml = await pageRes.text();
            const streams = [];

            // --- YÖNTEM 1: SCX / PlayerData Objesini Yakala ---
            // Regex'i daha esnek hale getirdik (boşluklar ve farklı değişken isimleri için)
            const scxRegex = /(?:var\s+scx|scx)\s*=\s*({[\s\S]*?});/i;
            const match = scxRegex.exec(pageHtml);

            if (match) {
                try {
                    // JSON formatına zorla dönüştürme (keyleri tırnak içine al)
                    let rawJson = match[1]
                        .replace(/'/g, '"')
                        .replace(/(\s*?{\s*?|\s*?,\s*?)(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '$1"$3":');
                    
                    const data = JSON.parse(rawJson);
                    const labels = ["atom", "proton", "fast", "tr", "en", "dublaj", "alt-yazi"];

                    labels.forEach(label => {
                        if (data[label] && data[label].sx && data[label].sx.t) {
                            let tokens = Array.isArray(data[label].sx.t) ? data[label].sx.t : [data[label].sx.t];
                            tokens.forEach(t => {
                                const dec = decodeSecret(t);
                                if (dec && dec.startsWith("http")) {
                                    streams.push({
                                        name: `FHD - ${label.toUpperCase()}`,
                                        url: dec,
                                        quality: "1080p",
                                        headers: headers
                                    });
                                }
                            });
                        }
                    });
                } catch (e) { console.log("! Şifre çözme hatası:", e.message); }
            }

            // --- YÖNTEM 2: DOM Üzerinden Player ve Iframe Tara ---
            if (streams.length === 0) {
                const $page = cheerio.load(pageHtml);
                $page("iframe, [data-src], .player-container iframe").each((i, el) => {
                    let src = $page(el).attr("src") || $page(el).attr("data-src");
                    if (src && !src.includes("googleads")) {
                        if (src.startsWith("//")) src = "https:" + src;
                        streams.push({
                            name: "Yedek Kaynak",
                            url: src,
                            quality: "Auto",
                            headers: headers
                        });
                    }
                });
            }

            console.log(`-> Sonuç: ${streams.length} link bulundu.`);
            resolve(streams);

        } catch (err) {
            console.log("! Hata:", err.message);
            resolve([]);
        }
    });
}

module.exports = { getStreams };

