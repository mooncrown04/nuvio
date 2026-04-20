// Version: 6.6 (Kotlin Port + Global Export)
// FIXED: 'getStreams function not found' error by forcing global exposure.

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "HDFilmCehennemi";
const STATIC_URL = "https://www.hdfilmcehennemi.nl/project-hail-mary-3/";

// Kotlin'deki unmix algoritması (charCode - (399756995 % (i + 5)))
function unmix(byteArray) {
    let result = "";
    for (let i = 0; i < byteArray.length; i++) {
        let charCode = byteArray[i] & 0xFF;
        let newChar = (charCode - (399756995 % (i + 5)) + 256) % 256;
        result += String.fromCharCode(newChar);
    }
    return result;
}

// Kotlin'deki dcHello içindeki Regex ve Base64 çözme mantığı
function dcHello(base64Parts) {
    try {
        // Kotlin: parts.joinToString("") -> b64() -> unmix()
        let combinedBase64 = base64Parts.join("");
        let binary = Buffer.from(combinedBase64, 'base64');
        return unmix(binary);
    } catch (e) {
        return "";
    }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error("[" + PROVIDER_NAME + "] v6.6 KOTLIN-JS HYBRID START");
    
    try {
        const HEADERS = { 
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0",
            "X-Requested-With": "fetch"
        };

        // 1. Film Sayfasını Al
        const response = await fetch(STATIC_URL, { headers: HEADERS });
        const html = await response.text();
        const $ = cheerio.load(html);

        // 2. Video ID Bul (Kotlin: button.alternative-link -> data-video)
        const videoID = $("button.alternative-link").attr("data-video");
        if (!videoID) throw new Error("ID_NOT_FOUND_IN_PAGE");
        console.error("[" + PROVIDER_NAME + "] ID FOUND: " + videoID);

        // 3. Video API'sine Git
        const apiResponse = await fetch(`https://www.hdfilmcehennemi.nl/video/${videoID}/`, {
            headers: { ...HEADERS, "Referer": STATIC_URL }
        });
        const apiHtml = await apiResponse.text();

        // 4. Iframe URL Ayıkla
        let iframeMatch = apiHtml.match(/data-src=\\?"([^"\\]+)/);
        let iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";
        if (!iframeUrl) throw new Error("IFRAME_NOT_FOUND");

        // Kotlin: Rapidrame yönlendirmesi
        if (iframeUrl.includes("rapidrame")) {
            iframeUrl = "https://www.hdfilmcehennemi.nl/rplayer/" + iframeUrl.split("?rapidrame_id=")[1];
        }
        console.error("[" + PROVIDER_NAME + "] TARGET IFRAME: " + iframeUrl);

        // 5. Final Sayfası (rplayer) ve dcHello Çözümü
        const playerResponse = await fetch(iframeUrl, { headers: { "Referer": "https://www.hdfilmcehennemi.nl/" } });
        const playerHtml = await playerResponse.text();

        // Kotlin: file_link="([...])" içindeki base64 parçalarını bul
        let base64InputMatch = playerHtml.match(/file_link\s*=\s*"\(\[(.*?)\]\)"/);
        if (!base64InputMatch) throw new Error("BASE64_DATA_NOT_FOUND");

        // Tırnak içindeki parçaları diziye çevir: ["abc", "def"]
        let parts = base64InputMatch[1].match(/"(.*?)"/g).map(p => p.replace(/"/g, ""));
        let finalUrl = dcHello(parts);

        // Kotlin: .substringAfter("https").let { "https$it" }
        if (finalUrl.includes("https")) {
            finalUrl = "https" + finalUrl.split("https").pop();
        }

        console.error("[" + PROVIDER_NAME + "] FINAL URL DECRYPTED!");

        return [{
            name: PROVIDER_NAME,
            url: finalUrl,
            quality: "1080p",
            headers: { "User-Agent": HEADERS["User-Agent"], "Referer": "https://www.hdfilmcehennemi.nl/" }
        }];

    } catch (err) {
        console.error("[" + PROVIDER_NAME + "] FATAL ERROR: " + err.message);
        return [];
    }
}

// Fonksiyonu hem module hem global düzeyde tanımla (Hata almamak için)
globalThis.getStreams = getStreams;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
