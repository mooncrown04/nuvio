/**
 * Nuvio Code-Spy Scraper - izle.plus (V74)
 */

var config = {
    name: "izle.plus (Spy-Mode)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

// P.A.C.K.E.R Decoder
function unpack(code) {
    try {
        var p = /}\('(.*)',\s*(\d+),\s*(\d+),\s*'(.*)'\.split\('\|'\)/.exec(code);
        if (!p) return code;
        var s = p[1], a = p[4].split('|'), c = parseInt(p[2]);
        while (c--) { if (a[c]) { s = s.replace(new RegExp('\\b' + c.toString(parseInt(p[2]) > 62 ? 62 : p[3]) + '\\b', 'g'), a[c]); } }
        return s;
    } catch(e) { return code; }
}

async function getStreams(input) {
    try {
        let query = (typeof input === 'object') ? (input.title || input.name || "1314786") : input;
        if (query.toString().includes("1314786")) query = "ajan zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        // 1. Film Sayfasını Bul
        var searchUrl = `${config.baseUrl}/?s=${encodeURIComponent(query)}`;
        var searchRes = await fetch(searchUrl, { headers: { 'User-Agent': browserUA } });
        var searchHtml = await searchRes.text();
        var linkMatch = searchHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-json|wp-content|category|tag)[^"\/]+\/)"/i);
        if (!linkMatch) return [];

        // 2. Embed Sayfasına Gir
        var embedRes = await fetch(linkMatch[1], { headers: { 'User-Agent': browserUA } });
        var embedHtml = await embedRes.text();
        var videoMatch = embedHtml.match(/hotstream\.club\/(?:embed|v|list)\/([a-zA-Z0-9_-]+)/i);
        if (!videoMatch) return [];

        var playerRes = await fetch(`https://hotstream.club/embed/${videoMatch[1]}`, { 
            headers: { 'User-Agent': browserUA, 'Referer': linkMatch[1] } 
        });
        var playerHtml = await playerRes.text();

        // 3. KRİTİK ADIM: DEŞİFRE ET VE LOGA BAS
        let decrypted = playerHtml;
        if (playerHtml.includes('eval(function')) {
            decrypted = unpack(playerHtml);
            
            // Logcat sınırı (4kb) olduğu için kodu parçalayarak basıyoruz
            console.error("[Kekik-Debug] --- DEŞİFRE EDİLEN KOD BAŞLANGIÇ ---");
            for (let i = 0; i < decrypted.length; i += 500) {
                console.error(`[Kekik-Debug] KOD-PARCA[${i/500}]: ` + decrypted.substring(i, i + 500));
            }
            console.error("[Kekik-Debug] --- DEŞİFRE EDİLEN KOD BİTİŞ ---");
        }

        // 4. Standart Yakalama Denemesi
        var videoUrlMatch = decrypted.match(/(https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)/i);
        
        if (videoUrlMatch) {
            var videoUrl = videoUrlMatch[1];
            console.error(`[Kekik-Debug] Yakalanan URL: ${videoUrl}`);
            
            return [{
                name: "HotStream (Spy-V74)",
                url: `${config.proxyUrl}?url=${encodeURIComponent(videoUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
                headers: { 'User-Agent': browserUA, 'Referer': "https://hotstream.club/" }
            }];
        }

        return [];

    } catch (e) {
        console.error(`[Kekik-Debug] Hata: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
