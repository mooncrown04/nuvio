// Version: 6.9 (Global Context Fix)
// FIXED: 'app is not defined' by accessing global context safely.

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "HDFilmCehennemi";
const STATIC_URL = "https://www.hdfilmcehennemi.nl/project-hail-mary-3/";

// Kotlin'deki unmix algoritması
function unmix(byteArray) {
    let result = "";
    for (let i = 0; i < byteArray.length; i++) {
        let charCode = byteArray[i] & 0xFF;
        let newChar = (charCode - (399756995 % (i + 5)) + 256) % 256;
        result += String.fromCharCode(newChar);
    }
    return result;
}

// Global uygulama nesnesini bul (Cloudstream için kritik)
const _app = (typeof app !== 'undefined') ? app : (typeof globalThis.app !== 'undefined') ? globalThis.app : null;

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error("[" + PROVIDER_NAME + "] v6.9 STARTING...");
    
    if (!_app) {
        console.error("[" + PROVIDER_NAME + "] FATAL: Cloudstream 'app' object not found in global context.");
        return [];
    }

    try {
        const HEADERS = { 
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "X-Requested-With": "fetch"
        };

        // 1. Film Sayfasını Al
        const response = await _app.get(STATIC_URL, { headers: HEADERS });
        const html = response.text;

        // Cloudflare kontrolü
        if (html.includes("Just a moment") || html.includes("DDoS protection")) {
            console.error("[" + PROVIDER_NAME + "] CLOUDFLARE DETECTED! Use a VPN or wait.");
            return [];
        }

        const $ = cheerio.load(html);

        // 2. Video ID Bul (Kotlin logic)
        let videoID = $("button.alternative-link").attr("data-video");
        if (!videoID) {
            let match = html.match(/data-video=["'](\d+)["']/);
            if (match) videoID = match[1];
        }

        if (!videoID) {
            console.error("[" + PROVIDER_NAME + "] ID NOT FOUND. Page length: " + html.length);
            return [];
        }

        console.error("[" + PROVIDER_NAME + "] FOUND ID: " + videoID);

        // 3. API İsteyi (Kotlin: /video/ID/)
        const apiRes = await _app.get(`https://www.hdfilmcehennemi.nl/video/${videoID}/`, {
            headers: HEADERS,
            referer: STATIC_URL
        });
        
        let iframeMatch = apiRes.text.match(/data-src=\\?"([^"\\]+)/);
        let iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";
        
        if (!iframeUrl) return [];

        if (iframeUrl.includes("rapidrame")) {
            iframeUrl = "https://www.hdfilmcehennemi.nl/rplayer/" + iframeUrl.split("?rapidrame_id=")[1];
        }

        // 4. Player & Decrypt
        const playerRes = await _app.get(iframeUrl, { 
            headers: { "Referer": "https://www.hdfilmcehennemi.nl/" } 
        });
        
        let base64Match = playerRes.text.match(/file_link\s*=\s*["']\(\[(.*?)\]\)["']/);
        if (base64Match) {
            let parts = base64Match[1].match(/"(.*?)"/g).map(p => p.replace(/"/g, ""));
            let binary = Buffer.from(parts.join(""), 'base64');
            let decoded = unmix(binary);
            
            let finalUrl = decoded.includes("https") ? "https" + decoded.split("https").pop() : "";

            return [{
                name: PROVIDER_NAME,
                url: finalUrl,
                quality: "1080p",
                headers: { "User-Agent": HEADERS["User-Agent"], "Referer": "https://www.hdfilmcehennemi.nl/" }
            }];
        }

        return [];

    } catch (err) {
        console.error("[" + PROVIDER_NAME + "] ERROR: " + err.message);
        return [];
    }
}

module.exports = { getStreams };
