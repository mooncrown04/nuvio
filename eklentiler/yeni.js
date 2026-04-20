// Version: 6.7 (Enhanced Selectors & Kotlin Headers)
// FIXED: ID_NOT_FOUND_IN_PAGE by broadening the search area.

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "HDFilmCehennemi";
const STATIC_URL = "https://www.hdfilmcehennemi.nl/project-hail-mary-3/";

function unmix(byteArray) {
    let result = "";
    for (let i = 0; i < byteArray.length; i++) {
        let charCode = byteArray[i] & 0xFF;
        let newChar = (charCode - (399756995 % (i + 5)) + 256) % 256;
        result += String.fromCharCode(newChar);
    }
    return result;
}

function dcHello(base64Parts) {
    try {
        let combinedBase64 = base64Parts.join("");
        let binary = Buffer.from(combinedBase64, 'base64');
        return unmix(binary);
    } catch (e) { return ""; }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error("[" + PROVIDER_NAME + "] v6.7 STARTING...");
    
    try {
        // Kotlin kodundaki tam header seti
        const HEADERS = { 
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0",
            "Accept": "*/*",
            "X-Requested-With": "fetch"
        };

        const response = await fetch(STATIC_URL, { headers: HEADERS });
        const html = await response.text();
        const $ = cheerio.load(html);

        // Kotlin'deki hiyerarşiyi tek tek deneyelim
        let videoID = "";
        
        // 1. Seçenek: Kotlin'deki tam yol
        videoID = $("div.alternative-links button.alternative-link").attr("data-video") || 
                  $("button.alternative-link").attr("data-video") ||
                  $(".alternative-link").first().data("video");

        // 2. Seçenek: Ham HTML içinde Regex (Eğer Cheerio render edemezse)
        if (!videoID) {
            let regexMatch = html.match(/data-video=["'](\d+)["']/);
            if (regexMatch) videoID = regexMatch[1];
        }

        if (!videoID) {
            console.error("[" + PROVIDER_NAME + "] HTML SAMPLE: " + html.substring(html.indexOf('alternative'), html.indexOf('alternative') + 300));
            throw new Error("ID_STILL_NOT_FOUND");
        }

        console.error("[" + PROVIDER_NAME + "] SUCCESS! ID: " + videoID);

        const apiResponse = await fetch(`https://www.hdfilmcehennemi.nl/video/${videoID}/`, {
            headers: { ...HEADERS, "Referer": STATIC_URL }
        });
        const apiHtml = await apiResponse.text();

        let iframeMatch = apiHtml.match(/data-src=\\?"([^"\\]+)/);
        let iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";
        
        if (iframeUrl.includes("rapidrame")) {
            iframeUrl = "https://www.hdfilmcehennemi.nl/rplayer/" + iframeUrl.split("?rapidrame_id=")[1];
        }

        const playerResponse = await fetch(iframeUrl, { headers: { "Referer": "https://www.hdfilmcehennemi.nl/" } });
        const playerHtml = await playerResponse.text();

        // Kotlin: file_link="([...])"
        let base64InputMatch = playerHtml.match(/file_link\s*=\s*["']\(\[(.*?)\]\)["']/);
        if (!base64InputMatch) {
            // Alternatif: tırnaksız veya farklı boşluklarla olabilir
            base64InputMatch = playerHtml.match(/file_link\s*=\s*.*?\((.*?)\)/);
        }

        if (base64InputMatch) {
            let parts = base64InputMatch[1].match(/"(.*?)"/g).map(p => p.replace(/"/g, ""));
            let finalUrl = dcHello(parts);
            if (finalUrl.includes("https")) finalUrl = "https" + finalUrl.split("https").pop();

            return [{
                name: PROVIDER_NAME,
                url: finalUrl,
                quality: "1080p",
                headers: { "User-Agent": HEADERS["User-Agent"], "Referer": "https://www.hdfilmcehennemi.nl/" }
            }];
        }

        throw new Error("FINAL_DECRYPTION_FAILED");

    } catch (err) {
        console.error("[" + PROVIDER_NAME + "] ERROR: " + err.message);
        return [];
    }
}

globalThis.getStreams = getStreams;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
