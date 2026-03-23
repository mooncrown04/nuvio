/**
 * Nuvio Hotstream Smasher - izle.plus (V72)
 */

var config = {
    name: "izle.plus (Smasher)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

// P.A.C.K.E.R Decoder Fonksiyonu
function unpack(code) {
    function slice(s, a, c) {
        var d = {};
        while (c--) { if (a[c]) { s = s.replace(new RegExp('\\b' + c.toString(a) + '\\b', 'g'), a[c]); } }
        return s;
    }
    var p = /}\('(.*)',\s*(\d+),\s*(\d+),\s*'(.*)'\.split\('\|'\)/.exec(code);
    if (p) { return slice(p[1], p[4].split('|'), p[2]); }
    return code;
}

async function getStreams(input) {
    try {
        let query = (typeof input === 'object') ? (input.title || input.name || input) : input;
        if (query.toString().includes("1314786")) query = "ajan zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        // 1. Film Sayfasını Bul
        var searchUrl = `${config.baseUrl}/?s=${encodeURIComponent(query)}`;
        var searchRes = await fetch(searchUrl, { headers: { 'User-Agent': browserUA } });
        var searchHtml = await searchRes.text();
        var linkMatch = searchHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-json|wp-content|category|tag)[^"\/]+\/)"/i);
        if (!linkMatch) return [];

        // 2. Embed Sayfasını Çek
        var embedRes = await fetch(linkMatch[1], { headers: { 'User-Agent': browserUA } });
        var embedHtml = await embedRes.text();
        var videoMatch = embedHtml.match(/hotstream\.club\/(?:embed|v|list)\/([a-zA-Z0-9_-]+)/i);
        if (!videoMatch) return [];

        var finalEmbedUrl = `https://hotstream.club/embed/${videoMatch[1]}`;
        var playerRes = await fetch(finalEmbedUrl, { headers: { 'User-Agent': browserUA, 'Referer': linkMatch[1] } });
        var playerHtml = await playerRes.text();

        // 3. ADIM: Packer Deşifre İşlemi
        let decrypted = playerHtml;
        if (playerHtml.includes('eval(function(p,a,c,k,e,d)')) {
            console.error(`[Kekik-Debug] Şifreli Packer bloğu bulundu, çözülüyor...`);
            decrypted = unpack(playerHtml);
        }

        // 4. ADIM: Deşifre edilmiş koddaki linki yakala
        var videoUrlMatch = decrypted.match(/(https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)/i);
        
        if (!videoUrlMatch) {
            console.error(`[Kekik-Debug] Deşifre sonrası bile link bulunamadı!`);
            return [];
        }

        var videoUrl = videoUrlMatch[1];
        console.error(`[Kekik-Debug] BULDUM: ${videoUrl.substring(0, 50)}...`);

        var finalUrl = `${config.proxyUrl}?url=${encodeURIComponent(videoUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`;

            return [{
                name: "HotStream (Unlocked)",
                url: finalUrl,
                headers: {
                    'User-Agent': browserUA,
                    'Referer': "https://hotstream.club/",
                    'Origin': "https://hotstream.club"
                }
            }];

    } catch (e) {
        console.error(`[Kekik-Debug] Hata: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
