const cheerio = require('cheerio-without-node-native');

const MAIN_URL = "https://www.fullhdfilmizlesene.live";
const TMDB_API_KEY = '4ef0d7355d9ffb5151e987764708ce96';

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Referer": `${MAIN_URL}/`,
    "Accept-Language": "tr-TR,tr;q=0.9"
};

// =================================================================================
// ŞİFRE ÇÖZÜCÜLER (Rapid2m3u8 - K9L Algoritması)
// =================================================================================

function rapidDecode(encodedString) {
    try {
        const reversed = encodedString.split('').reverse().join('');
        const tString = Buffer.from(reversed, 'base64').toString('binary');
        
        let oBuilder = "";
        const key = "K9L";
        for (let i = 0; i < tString.length; i++) {
            const keyChar = key[i % key.length];
            const offset = (keyChar.charCodeAt(0) % 5) + 1;
            oBuilder += String.fromCharCode(tString.charCodeAt(i) - offset);
        }
        return Buffer.from(oBuilder, 'base64').toString('utf-8');
    } catch (e) { return null; }
}

function decodeSecret(s) {
    try {
        if (!s) return null;
        let rotated = s.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        return Buffer.from(rotated, 'base64').toString('utf-8');
    } catch (e) { return null; }
}

async function resolveHlsSource(embedUrl) {
    try {
        const res = await fetch(embedUrl, { headers: { ...HEADERS, "Referer": MAIN_URL } });
        const html = await res.text();

        // 1. av('...') pattern (RapidVid/Vidmoxy)
        const avMatch = /av\('([^']+)'\)/.exec(html);
        if (avMatch && avMatch[1]) {
            let decoded = rapidDecode(avMatch[1]);
            if (decoded) {
                // VLC ve ExoPlayer'ın tanıması için uzantı kontrolü
                if (!decoded.includes('.m3u8')) {
                    decoded += "/index.m3u8";
                }
                return decoded;
            }
        }

        // 2. Sayfa içinde m3u8 ara
        const m3u8Match = /["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i.exec(html);
        if (m3u8Match) return m3u8Match[1].replace(/\\/g, '');

        return embedUrl;
    } catch (e) { return embedUrl; }
}

// =================================================================================
// ANA SCRAPER
// =================================================================================

async function getStreams(tmdbId, mediaType = 'movie') {
    if (mediaType !== 'movie') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const mediaInfo = await tmdbRes.json();
        const movieTitle = mediaInfo.title || mediaInfo.original_title;

        // Arama kısmını genişlettik (Boş dönmemesi için)
        const searchUrl = `${MAIN_URL}/arama/${encodeURIComponent(movieTitle)}`;
        const searchRes = await fetch(searchUrl, { headers: HEADERS });
        const searchHtml = await searchRes.text();
        const $ = cheerio.load(searchHtml);
        
        let filmLink = "";
        $(".film-list li a, .film-box a, h2 a").each((i, el) => {
            const href = $(el).attr("href");
            if (href && href.includes("/film/")) {
                filmLink = href;
                return false;
            }
        });

        if (!filmLink) return [];
        const finalUrl = filmLink.startsWith("http") ? filmLink : MAIN_URL + filmLink;

        const pageRes = await fetch(finalUrl, { headers: HEADERS });
        const pageHtml = await pageRes.text();
        const streams = [];

        const scxMatch = /scx\s*=\s*({[\s\S]*?});/i.exec(pageHtml);
        if (scxMatch) {
            let jsonStr = scxMatch[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":').replace(/,\s*}/g, '}');
            const data = JSON.parse(jsonStr);
            const sources = ["proton", "atom", "tr", "en", "fast"];

            for (const key of sources) {
                if (data[key] && data[key].sx && data[key].sx.t) {
                    const tokens = Array.isArray(data[key].sx.t) ? data[key].sx.t : [data[key].sx.t];
                    for (const t of tokens) {
                        const embedUrl = decodeSecret(t);
                        if (embedUrl) {
                            const videoUrl = await resolveHlsSource(embedUrl);
                            streams.push({
                                name: "FullHDFilm",
                                title: `FHD - ${key.toUpperCase()}\n📼: ${movieTitle}`,
                                url: videoUrl,
                                quality: "1080p",
                                headers: { 
                                    "Referer": embedUrl,
                                    "User-Agent": HEADERS["User-Agent"]
                                },
                                provider: 'FullHDFilmizlesene'
                            });
                        }
                    }
                }
            }
        }
        return streams;
    } catch (error) {
        return [];
    }
}

module.exports = { getStreams };
