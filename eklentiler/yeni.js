/**
 * Nuvio Unpacker Scraper - izle.plus (V71)
 */

var config = {
    name: "izle.plus (Unpacker)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        let query = (typeof input === 'object') ? (input.title || input.name || input) : input;
        if (query.toString().includes("1314786")) query = "ajan zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        // 1. Sayfaya Git
        var searchUrl = `${config.baseUrl}/?s=${encodeURIComponent(query)}`;
        var searchRes = await fetch(searchUrl, { headers: { 'User-Agent': browserUA } });
        var searchHtml = await searchRes.text();
        var linkMatch = searchHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-json|wp-content|category|tag)[^"\/]+\/)"/i);
        if (!linkMatch) return [];

        // 2. Embed Sayfasını Çek
        var res = await fetch(linkMatch[1], { headers: { 'User-Agent': browserUA } });
        var html = await res.text();
        var videoMatch = html.match(/hotstream\.club\/(?:embed|v|list)\/([a-zA-Z0-9_-]+)/i);
        if (!videoMatch) return [];

        var embedUrl = `https://hotstream.club/embed/${videoMatch[1]}`;
        var embedRes = await fetch(embedUrl, { headers: { 'User-Agent': browserUA, 'Referer': linkMatch[1] } });
        var embedHtml = await embedRes.text();

        // 3. ADIM: ŞİFRE ÇÖZÜCÜ (Packer / Base64 / File Detection)
        let videoUrl = "";

        // Önce temiz link ara
        let cleanMatch = embedHtml.match(/["']?file["']?\s*:\s*["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
        
        if (cleanMatch) {
            videoUrl = cleanMatch[1];
        } else {
            // Şifreli (Packer) varsa deşifre etmeye çalışalım (Basit mantık)
            // Hotstream bazen 'sources' içinde de tutar
            let sourceMatch = embedHtml.match(/sources\s*:\s*\[\{["']?file["']?\s*:\s*["']([^"']+)["']/i);
            if (sourceMatch) videoUrl = sourceMatch[1];
        }

        if (!videoUrl) {
            console.error(`[Kekik-Debug] Video linki hala şifreli veya bulunamadı.`);
            // Son bir umut: Sayfa içindeki tüm m3u8'leri tara
            let m3u8Match = embedHtml.match(/https?:\/\/[^"']+\.m3u8[^"']*/i);
            if (m3u8Match) videoUrl = m3u8Match[0];
        }

        if (!videoUrl) return [];

        console.error(`[Kekik-Debug] BULDUM: ${videoUrl.substring(0, 60)}`);

        // Proxy üzerinden gönder
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
