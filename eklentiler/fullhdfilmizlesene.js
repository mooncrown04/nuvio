const cheerio = require('cheerio-without-node-native');

// Yapılandırma
const MAIN_URL = "https://www.fullhdfilmizlesene.live";
const TMDB_API_KEY = '4ef0d7355d9ffb5151e987764708ce96';

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Referer": `${MAIN_URL}/`,
    "Accept-Language": "tr-TR,tr;q=0.9"
};

// =================================================================================
// YARDIMCI ARAÇLAR (DEOBFUSCATION & UTILS)
// =================================================================================

function decodeSecret(s) {
    try {
        if (!s) return null;
        let rotated = s.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        return Buffer.from(rotated, 'base64').toString('utf-8');
    } catch (e) { return null; }
}

async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
}

// =================================================================================
// HLS RESOLVER (1004 Hatasını Çözen Kısım)
// =================================================================================

async function resolveHlsSource(embedUrl) {
    try {
        const res = await fetchWithTimeout(embedUrl, { headers: HEADERS }, 7000);
        const html = await res.text();
        
        // Bu regex hem m3u8 hem de mp4 dosyalarını, kaçış karakterlerini temizleyerek yakalar
        const pattern = /["']?file["']?\s*[:=]\s*["'](http[^"']+)["']/;
        const match = html.match(pattern);
        
        if (match && match[1]) {
            let cleanUrl = match[1].replace(/\\/g, ''); // Ters eğik çizgileri temizle
            return cleanUrl;
        }
        return embedUrl;
    } catch (e) {
        return embedUrl;
    }
}

// =================================================================================
// CORE SCRAPER FUNCTIONS
// =================================================================================

async function getStreams(tmdbId, mediaType = 'movie') {
    if (mediaType !== 'movie') return [];

    try {
        // 1. TMDB'den Film Bilgisi Al
        const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`;
        const tmdbRes = await fetchWithTimeout(tmdbUrl);
        const mediaInfo = await tmdbRes.json();
        console.log(`[FHD] Aranan: ${mediaInfo.title}`);

        // 2. Sitede Ara
        const searchUrl = `${MAIN_URL}/arama/${encodeURIComponent(mediaInfo.title)}`;
        const searchRes = await fetchWithTimeout(searchUrl, { headers: HEADERS });
        const searchHtml = await searchRes.text();
        const $search = cheerio.load(searchHtml);
        const filmLink = $search("li.film a").first().attr("href");

        if (!filmLink) return [];

        // 3. Film Sayfasını Analiz Et
        const pageRes = await fetchWithTimeout(filmLink, { headers: HEADERS });
        const pageHtml = await pageRes.text();
        const streams = [];

        // 4. Şifreli SCX Objesini Yakala
        const scxMatch = /scx\s*=\s*({[\s\S]*?});/i.exec(pageHtml);

        if (scxMatch) {
            let rawJson = scxMatch[1].replace(/'/g, '"').replace(/(\w+):/g, '"$1":').replace(/,\s*}/g, '}');
            const scxData = JSON.parse(rawJson);
            const labels = ["proton", "atom", "fast", "tr", "en"];

            for (const label of labels) {
                if (scxData[label] && scxData[label].sx && scxData[label].sx.t) {
                    let tokens = Array.isArray(scxData[label].sx.t) ? scxData[label].sx.t : [scxData[label].sx.t];
                    
                    for (const t of tokens) {
                        const embedUrl = decodeSecret(t);
                        if (embedUrl && embedUrl.startsWith("http")) {
                            
                            // Movies4u Mantığı: Embed içinden asıl m3u8'i çıkar
                            const finalUrl = await resolveHlsSource(embedUrl);
                            
                            streams.push({
                                name: "FullHDFilm",
                                title: `FHD - ${label.toUpperCase()} (1080p)\n📼: ${mediaInfo.title}\n🌐: ${label.toUpperCase()}`,
                                url: finalUrl,
                                quality: "1080p",
                                headers: { 
                                    "Referer": embedUrl, // Video sunucusu embed URL'sini referer ister
                                    "User-Agent": HEADERS["User-Agent"]
                                },
                                provider: 'FullHDFilmizlesene'
                            });
                        }
                    }
                }
            }
        }

        console.log(`[FHD] Toplam ${streams.length} stream bulundu.`);
        return streams;

    } catch (error) {
        console.error("[FHD] getStreams hatası:", error.message);
        return [];
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
}

