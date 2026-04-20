// Version: 8.0 (Zero-Dependency Kotlin Port)
// Bu kod, WatchBuddy'nin sunucuda yaptığı işi cihazın içinde yapar.

const PROVIDER_NAME = "HDFilmCehennemi";

/**
 * Kotlin'deki dcHello ve unmix algoritmasının 
 * hiçbir kütüphaneye ihtiyaç duymayan saf JS hali.
 */
function solveHDFC(base64Parts) {
    try {
        // 1. Parçaları birleştir (Kotlin: parts.joinToString(""))
        let combined = base64Parts.join("");
        
        // 2. Base64 Decode (Standard atob)
        let binaryString = atob(combined);
        let bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // 3. Unmix Algoritması (Kotlin: charCode - (399756995 % (i + 5)))
        let result = "";
        for (let i = 0; i < bytes.length; i++) {
            let charCode = bytes[i] & 0xFF;
            let magic = 399756995 % (i + 5);
            let newChar = (charCode - magic + 256) % 256;
            result += String.fromCharCode(newChar);
        }

        // 4. Linki Temizle (Kotlin: substringAfter("https"))
        if (result.includes("https")) {
            return "https" + result.split("https").pop();
        }
        return result;
    } catch (e) {
        return null;
    }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    // WatchBuddy'nin yaptığı gibi, senin verdiğin linki baz alıyoruz
    const targetUrl = "https://www.hdfilmcehennemi.nl/1-ready-or-not-izle-hdf-8/";
    
    console.error("[" + PROVIDER_NAME + "] Çözücü Başlatıldı...");

    try {
        // Cloudstream ortamında request fonksiyonunu güvenli çağır
        const request = (typeof app !== 'undefined') ? app : globalThis.app;
        if (!request) throw new Error("Network kütüphanesi bulunamadı!");

        const headers = { 
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0",
            "X-Requested-With": "fetch"
        };

        // 1. Adım: Film sayfasından Video ID çek
        const page = await request.get(targetUrl, { headers });
        const videoID = page.text.match(/data-video=["'](\d+)["']/)?.[1];
        if (!videoID) throw new Error("Video ID bulunamadı (Cloudflare engeli olabilir)");

        // 2. Adım: API'den Iframe URL'yi al
        const api = await request.get(`https://www.hdfilmcehennemi.nl/video/${videoID}/`, { 
            headers, 
            referer: targetUrl 
        });
        let iframeUrl = api.text.match(/data-src=\\?"([^"\\]+)/)?.[1].replace(/\\/g, "");
        if (iframeUrl.includes("rapidrame")) {
            iframeUrl = "https://www.hdfilmcehennemi.nl/rplayer/" + iframeUrl.split("?rapidrame_id=")[1];
        }

        // 3. Adım: Player sayfasından şifreli base64 parçalarını al
        const player = await request.get(iframeUrl, { referer: "https://www.hdfilmcehennemi.nl/" });
        const base64Data = player.text.match(/file_link\s*=\s*["']\(\[(.*?)\]\)["']/)?.[1];
        if (!base64Data) throw new Error("Şifreli veri bulunamadı");

        // 4. Adım: Kotlin algoritmasıyla çöz
        const parts = base64Data.match(/"(.*?)"/g).map(p => p.replace(/"/g, ""));
        const finalUrl = solveHDFC(parts);

        if (finalUrl) {
            console.error("[" + PROVIDER_NAME + "] Link başarıyla çözüldü!");
            return [{
                name: PROVIDER_NAME,
                url: finalUrl,
                quality: "1080p",
                headers: { "Referer": "https://www.hdfilmcehennemi.nl/" }
            }];
        }

    } catch (err) {
        console.error("[" + PROVIDER_NAME + "] Hata: " + err.message);
        return [];
    }
}

module.exports = { getStreams };
