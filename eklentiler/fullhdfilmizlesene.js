const cheerio = require("cheerio-without-node-native");

/**
 * Şifreli veriyi çözen fonksiyon (ROT13 + Base64)
 */
function decodeSecret(s) {
    try {
        if (!s) return null;
        let rotated = s.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        return Buffer.from(rotated, 'base64').toString('utf-8');
    } catch (e) { return null; }
}

/**
 * Embed sayfasının (Rapidvid vb.) içine girip gerçek video linkini bulan extractor
 */
async function extractVideoSource(embedUrl, headers) {
    try {
        const res = await fetch(embedUrl, { headers });
        const html = await res.text();
        
        // 1. Regex: "file":"http..." veya file: 'http...' formatlarını yakala
        const videoMatch = /["']?file["']?\s*[:=]\s*["'](http[^"']+\.(?:m3u8|mp4|mkv)[^"']*)["']/.exec(html);
        
        if (videoMatch && videoMatch[1]) {
            return videoMatch[1].replace(/\\/g, ''); // Ters eğik çizgileri temizle
        }
        
        // 2. Alternatif: JSON içindeki kaynakları tara
        const sourceMatch = /sources\s*:\s*(\[[^\]]+\])/.exec(html);
        if (sourceMatch) {
            const sources = JSON.parse(sourceMatch[1].replace(/'/g, '"'));
            return sources[0].file || sources[0].src;
        }

        return embedUrl; // Bulamazsa mecburen eski linki dön
    } catch (e) { 
        return embedUrl; 
    }
}

/**
 * Ana fonksiyon
 */
async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.fullhdfilmizlesene.live/',
        'Accept-Language': 'tr-TR,tr;q=0.9'
    };

    try {
        // 1. TMDB Film Bilgisi
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const movieData = await tmdbRes.json();
        console.log(`-> Film: ${movieData.title}`);

        // 2. Sitede Arama
        const searchUrl = `https://www.fullhdfilmizlesene.live/arama/${encodeURIComponent(movieData.title)}`;
        const searchRes = await fetch(searchUrl, { headers });
        const searchHtml = await searchRes.text();
        const $search = cheerio.load(searchHtml);
        const filmLink = $search("li.film a").first().attr("href");

        if (!filmLink) return [];

        // 3. Film Sayfası Analizi
        console.log(`-> Sayfa: ${filmLink}`);
        const pageRes = await fetch(filmLink, { headers });
        const pageHtml = await pageRes.text();
        const streams = [];

        // SCX Objesini Yakala
        const scxRegex = /scx\s*=\s*({[\s\S]*?});/i;
        const match = scxRegex.exec(pageHtml);

        if (match) {
            // JS objesini JSON'a uygun hale getir (keyleri tırnakla)
            let rawJson = match[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":');
            const data = JSON.parse(rawJson);
            const labels = ["atom", "proton", "fast", "tr", "en", "dublaj"];

            for (const label of labels) {
                if (data[label] && data[label].sx && data[label].sx.t) {
                    let tokens = Array.isArray(data[label].sx.t) ? data[label].sx.t : [data[label].sx.t];
                    
                    for (const t of tokens) {
                        const embedUrl = decodeSecret(t);
                        if (embedUrl && embedUrl.startsWith("http")) {
                            console.log(`-> ${label.toUpperCase()} kaynağı işleniyor...`);
                            
                            // 1004 HATASINI ÇÖZEN KISIM: İçerideki gerçek dosyayı bul
                            const videoFile = await extractVideoSource(embedUrl, headers);
                            
                            streams.push({
                                name: `FHD - ${label.toUpperCase()}`,
                                url: videoFile,
                                quality: "1080p",
                                headers: headers // Oynatıcı için gerekli
                            });
                        }
                    }
                }
            }
        }

        console.log(`-> Toplam ${streams.length} link ayıklandı.`);
        return streams;

    } catch (err) {
        console.error("! Hata:", err.message);
        return [];
    }
}

module.exports = { getStreams };
