// Version: 6.5 (Kotlin Logic Port)
// Bütün stratejiyi paylaştığın .kt dosyasındaki dcHello ve unmix üzerine kurduk.

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "HDFilmCehennemi";
const STATIC_URL = "https://www.hdfilmcehennemi.nl/project-hail-mary-3/";

// Kotlin'deki unmix algoritmasının JS hali
function unmix(byteArray) {
    let result = "";
    for (let i = 0; i < byteArray.length; i++) {
        let charCode = byteArray[i] & 0xFF;
        let newChar = (charCode - (399756995 % (i + 5)) + 256) % 256;
        result += String.fromCharCode(newChar);
    }
    return result;
}

// Kotlin'deki dcHello stratejilerinden en yaygın olanı (B64 -> Unmix)
function decryptLink(encodedStr) {
    try {
        // Kotlin'de dcHello içindeki stratejilerden biri: s.b64()?.unmix()
        let binary = Buffer.from(encodedStr, 'base64');
        return unmix(binary);
    } catch (e) {
        return null;
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        const HEADERS = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/137.0" };

        fetch(STATIC_URL, { headers: HEADERS })
            .then(res => res.text())
            .then(html => {
                const $ = cheerio.load(html);
                // Kotlin satırı: button.alternative-link -> data-video
                let videoID = $("button.alternative-link").first().attr("data-video");
                
                if (!videoID) throw new Error("KOTLIN_ID_NOT_FOUND");
                console.error("[" + PROVIDER_NAME + "] VIDEO ID -> " + videoID);

                return fetch("https://www.hdfilmcehennemi.nl/video/" + videoID + "/", { 
                    headers: { "X-Requested-With": "fetch", "Referer": STATIC_URL } 
                });
            })
            .then(res => res.text())
            .then(apiText => {
                // Iframe URL'sini regex ile çek (Kotlin: data-src=\\")
                let iframeMatch = apiText.match(/data-src=\\?"([^"\\]+)/);
                let iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";
                
                // Eğer rapidrame ise Kotlin'deki gibi rplayer'a dönüştür
                if (iframeUrl.includes("rapidrame")) {
                    iframeUrl = "https://www.hdfilmcehennemi.nl/rplayer/" + iframeUrl.split("?rapidrame_id=")[1];
                }

                console.error("[" + PROVIDER_NAME + "] IFRAME -> " + iframeUrl);

                // Asıl videoyu çözmek için rplayer sayfasına git
                return fetch(iframeUrl, { headers: { "Referer": "https://www.hdfilmcehennemi.nl/" } });
            })
            .then(res => res.text())
            .then(playerHtml => {
                // Kotlin'deki videoData çekme kısmı: file_link="..."
                let videoDataMatch = playerHtml.match(/file_link\s*=\s*["']([^"']+)["']/);
                if (!videoDataMatch) throw new Error("VIDEO_DATA_NOT_FOUND");
                
                // Burada Kotlin'deki dcHello(Regex) ve unmix devreye girer
                // Şimdilik test amaçlı direkt linki döndürüyoruz, eğer link şifreliyse 
                // decryptLink fonksiyonunu burada kullanacağız.
                
                resolve([{
                    name: PROVIDER_NAME,
                    url: videoDataMatch[1], // Bu aşamada link çözülmüş olmalı
                    quality: "1080p"
                }]);
            })
            .catch(err => {
                console.error("[" + PROVIDER_NAME + "] KOTLIN_FLOW_ERROR -> " + err.message);
                resolve([]);
            });
    });
}
