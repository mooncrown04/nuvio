const cheerio = require('cheerio-without-node-native');

const MAIN_URL = "https://www.fullhdfilmizlesene.live";
const TMDB_API_KEY = '4ef0d7355d9ffb5151e987764708ce96';

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Referer": `${MAIN_URL}/`
};

// =================================================================================
// ŞİFRE ÇÖZÜCÜLER (RAPIDVID & PROTON)
// =================================================================================

// RapidVid Özel Şifre Çözücü [cite: 45, 46]
function rapidDecode(encodedString) {
    try {
        const reversed = encodedString.split('').reverse().join('');
        const tString = Buffer.from(reversed, 'base64').toString('binary');
        
        let oBuilder = "";
        const key = "K9L"; // 
        for (let i = 0; i < tString.length; i++) {
            const keyChar = key[i % key.length];
            const offset = (keyChar.charCodeAt(0) % 5) + 1; // 
            oBuilder += String.fromCharCode(tString.charCodeAt(i) - offset);
        }

        return Buffer.from(oBuilder, 'base64').toString('utf-8');
    } catch (e) {
        return null;
    }
}

// Standart FHD Şifre Çözücü [cite: 17, 18, 23]
function decodeSecret(s) {
    try {
        if (!s) return null;
        let rotated = s.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        return Buffer.from(rotated, 'base64').toString('utf-8');
    } catch (e) { return null; }
}

// =================================================================================
// EXTRACTOR (M3U8 BULUCU)
// =================================================================================

async function resolveHlsSource(embedUrl) {
    try {
        const res = await fetch(embedUrl, { headers: { ...HEADERS, "Referer": MAIN_URL } });
        const html = await res.text();

        // 1. RapidVid Şifreli Linki Yakala [cite: 41]
        const avMatch = /av\('([^']+)'\)/.exec(html);
        if (avMatch && avMatch[1]) {
            const decoded = rapidDecode(avMatch[1]);
            if (decoded) return decoded;
        }

        // 2. Alternatif: JSON veya Klasik m3u8 Tarama [cite: 38, 49, 69]
        const m3u8Match = /["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i.exec(html);
        if (m3u8Match) return m3u8Match[1].replace(/\\/g, '');

        return embedUrl;
    } catch (e) {
        return embedUrl;
    }
}

// =================================================================================
// ANA FONKSİYON
// =================================================================================

async function getStreams(tmdbId, mediaType = 'movie') {
    if (mediaType !== 'movie') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const mediaInfo = await tmdbRes.json();

        const searchUrl = `${MAIN_URL}/arama/${encodeURIComponent(mediaInfo.title)}`;
        const searchRes = await fetch(searchUrl, { headers: HEADERS });
        const searchHtml = await searchRes.text();
        const $ = cheerio.load(searchHtml);
        const filmLink = $("li.film a").first().attr("href");

        if (!filmLink) return [];

        const pageRes = await fetch(filmLink, { headers: HEADERS });
        const pageHtml = await pageRes.text();
        const streams = [];

        const scxMatch = /scx\s*=\s*({[\s\S]*?});/i.exec(pageHtml); // [cite: 19, 87, 88]
        if (scxMatch) {
            let rawJson = scxMatch[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":').replace(/,\s*}/g, '}');
            const data = JSON.parse(rawJson);
            const labels = ["proton", "atom", "tr", "en"]; // [cite: 19, 88, 92]

            for (const label of labels) {
                if (data[label] && data[label].sx && data[label].sx.t) {
                    let tokens = Array.isArray(data[label].sx.t) ? data[label].sx.t : [data[label].sx.t];
                    for (const t of tokens) {
                        const embedUrl = decodeSecret(t);
                        if (embedUrl) {
                            const finalLink = await resolveHlsSource(embedUrl);
                            
                            streams.push({
                                name: 'FullHDFilm',
                                title: `FHD - ${label.toUpperCase()}\n📼: ${mediaInfo.title}`,
                                url: finalLink,
                                quality: '1080p',
                                headers: {
                                    'Referer': embedUrl,
                                    'User-Agent': HEADERS["User-Agent"]
                                },
                                provider: 'FullHDFilmizlesene'
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

// MODÜL DIŞA AKTARMA (Hata düzelten kritik kısım)
module.exports = { getStreams };
