// Version: 6.8 (Cloudstream Native App Lib)
// FIXED: 'not a function' error by switching fetch -> app.get

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "HDFilmCehennemi";
const STATIC_URL = "https://www.hdfilmcehennemi.nl/project-hail-mary-3/";

// Kotlin unmix algoritması
function unmix(byteArray) {
    let result = "";
    for (let i = 0; i < byteArray.length; i++) {
        let charCode = byteArray[i] & 0xFF;
        let newChar = (charCode - (399756995 % (i + 5)) + 256) % 256;
        result += String.fromCharCode(newChar);
    }
    return result;
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error("[" + PROVIDER_NAME + "] v6.8 NATIVE START");
    
    try {
        const HEADERS = { 
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0",
            "X-Requested-With": "fetch"
        };

        // 1. Film Sayfası
        const response = await app.get(STATIC_URL, { headers: HEADERS });
        const html = response.text;
        const $ = cheerio.load(html);

        // 2. Video ID Bulma (data-video)
        let videoID = $("button.alternative-link").attr("data-video");
        if (!videoID) {
            let match = html.match(/data-video=["'](\d+)["']/);
            if (match) videoID = match[1];
        }

        if (!videoID) throw new Error("ID_MISSING");
        console.error("[" + PROVIDER_NAME + "] VIDEO_ID: " + videoID);

        // 3. API'den Iframe URL'yi alma
        const apiRes = await app.get(`https://www.hdfilmcehennemi.nl/video/${videoID}/`, {
            headers: HEADERS,
            referer: STATIC_URL
        });
        
        let iframeMatch = apiRes.text.match(/data-src=\\?"([^"\\]+)/);
        let iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";
        if (!iframeUrl) throw new Error("IFRAME_MISSING");

        if (iframeUrl.includes("rapidrame")) {
            iframeUrl = "https://www.hdfilmcehennemi.nl/rplayer/" + iframeUrl.split("?rapidrame_id=")[1];
        }

        // 4. Player sayfasından şifreli linki çekme
        const playerRes = await app.get(iframeUrl, { referer: "https://www.hdfilmcehennemi.nl/" });
        const playerHtml = playerRes.text;

        // Kotlin: file_link="([...])" içindeki tırnaklı base64 parçalarını yakala
        let base64Match = playerHtml.match(/file_link\s*=\s*"\(\[(.*?)\]\)"/);
        if (base64Match) {
            // Parçaları diziye çevir
            let parts = base64Match[1].match(/"(.*?)"/g).map(p => p.replace(/"/g, ""));
            let combined = parts.join("");
            
            // Base64 Decode -> Unmix
            let binary = Buffer.from(combined, 'base64');
            let decoded = unmix(binary);
            
            let finalUrl = decoded.includes("https") ? "https" + decoded.split("https").pop() : "";

            if (finalUrl) {
                return [{
                    name: PROVIDER_NAME,
                    url: finalUrl,
                    quality: "1080p",
                    headers: { 
                        "User-Agent": HEADERS["User-Agent"],
                        "Referer": "https://www.hdfilmcehennemi.nl/"
                    }
                }];
            }
        }

        throw new Error("DECRYPTION_FAILED");

    } catch (err) {
        console.error("[" + PROVIDER_NAME + "] ERROR: " + err.message);
        return [];
    }
}

// Cloudstream için doğru dışa aktarma
module.exports = { getStreams };
