const cheerio = require("cheerio-without-node-native");

// ROT13 + Base64 Çözücü
function decodeSecret(s) {
    try {
        if (!s) return null;
        var rotated = s.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = (c.charCodeAt(0) + 13)) ? c : c - 26);
        });
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
        'Referer': 'https://www.fullhdfilmizlesene.live/',
        'Accept-Language': 'tr-TR,tr;q=0.9'
    };

    try {
        // 1. TMDB Film Bilgisi
        const tmdbRes = await fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR");
        const movieData = await tmdbRes.json();
        console.log("-> Film:", movieData.title);

        // 2. Sitede Ara
        const searchUrl = "https://www.fullhdfilmizlesene.live/arama/" + encodeURIComponent(movieData.title);
        const searchRes = await fetch(searchUrl, { headers: headers });
        const searchHtml = await searchRes.text();
        const $search = cheerio.load(searchHtml);
        const filmLink = $search("li.film a").first().attr("href");

        if (!filmLink) {
            console.log("! Film bulunamadı.");
            return [];
        }

        // 3. Film Sayfasını Al
        console.log("-> Sayfa:", filmLink);
        const pageRes = await fetch(filmLink, { headers: headers });
        const pageHtml = await pageRes.text();
        const streams = [];

        // 4. Şifreli Veriyi Yakala (scx objesi)
        const scxMatch = /scx\s*=\s*({[\s\S]*?});/.exec(pageHtml);
        
        if (scxMatch) {
            try {
                // JSON formatına zorla dönüştür
                var rawJson = scxMatch[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":');
                var scxData = JSON.parse(rawJson);
                var labels = ["proton", "atom", "fast", "tr", "en"];

                for (const label of labels) {
                    if (scxData[label] && scxData[label].sx && scxData[label].sx.t) {
                        var t = scxData[label].sx.t;
                        var tokens = Array.isArray(t) ? t : [t];

                        for (const token of tokens) {
                            var dec = decodeSecret(token);
                            if (dec && dec.indexOf("http") === 0) {
                                // VLC'de 1004 hatasını önlemek için URL'yi temizle
                                var cleanUrl = dec.replace(/\\/g, '');

                                streams.push({
                                    name: "FHD - " + label.toUpperCase(),
                                    url: cleanUrl,
                                    quality: "1080p",
                                    headers: {
                                        "Referer": filmLink,
                                        "User-Agent": headers['User-Agent']
                                    }
                                });
                            }
                        }
                    }
                }
            } catch (e) { console.log("! JSON Error"); }
        }

        // Eğer hala link yoksa Iframe'leri tara
        if (streams.length === 0) {
            const $page = cheerio.load(pageHtml);
            $page("iframe").each(function() {
                var src = $page(this).attr("src") || $page(this).attr("data-src");
                if (src && src.includes("http")) {
                    streams.push({
                        name: "Yedek - PLAYER",
                        url: src.startsWith("//") ? "https:" + src : src,
                        quality: "Auto",
                        headers: headers
                    });
                }
            });
        }

        console.log("-> Toplam Link:", streams.length);
        return streams;

    } catch (err) {
        console.log("! Hata:", err.message);
        return [];
    }
}

module.exports = { getStreams };
