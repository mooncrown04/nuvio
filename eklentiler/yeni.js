/**
 * Nuvio Omega - izle.plus (V94)
 */

var config = {
    name: "izle.plus (Omega-V94)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        console.error("[Kekik-Log] 1. Omega Modu Başlatıldı");
        let query = (typeof input === 'object') ? (input.title || input.name) : input;
        if (!query || /^\d+$/.test(query)) query = "Ajan Zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

        // 1. Arama ve ID (Hızlı Geçiş)
        let sRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': browserUA } });
        let sHtml = await sRes.text();
        let movieUrl = (sHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-)[^"\/]+\/)"/i) || [])[1];
        if (!movieUrl) return [];

        let mRes = await fetch(movieUrl, { headers: { 'User-Agent': browserUA } });
        let mHtml = await mRes.text();
        let videoId = (mHtml.match(/hotstream\.club\/(?:embed|v|download)\/([a-zA-Z0-9_-]+)/i) || [])[1];
        if (!videoId) return [];

        // 2. EMBED SAYFASI DERİN ANALİZ
        let eRes = await fetch(`https://hotstream.club/embed/${videoId}`, { 
            headers: { 'User-Agent': browserUA, 'Referer': movieUrl } 
        });
        let eHtml = await eRes.text();

        // Ters slash ve gereksiz boşlukları temizle (Regex'i rahatlatır)
        let cleanHtml = eHtml.replace(/\\/g, "");
        let finalUrl = "";

        // Metot A: En geniş m3u8 avcısı (Tırnak bağımsız)
        let wideMatch = cleanHtml.match(/https?:\/\/[^"'\s<>]+?\.m3u8[^"'\s<>]*/i);
        if (wideMatch) finalUrl = wideMatch[0];

        // Metot B: JSON "file" anahtarı (Alternatif)
        if (!finalUrl) {
            let jsonMatch = cleanHtml.match(/["']?file["']?\s*:\s*["']([^"']+)["']/i);
            if (jsonMatch && jsonMatch[1].includes("http")) finalUrl = jsonMatch[1];
        }

        // Metot C: JWPlayer "sources" dizisi taraması
        if (!finalUrl) {
            let sourceBlock = cleanHtml.match(/sources\s*:\s*\[([\s\S]+?)\]/i);
            if (sourceBlock) {
                let linkInBlock = sourceBlock[1].match(/https?:\/\/[^"']+/i);
                if (linkInBlock) finalUrl = linkInBlock[0];
            }
        }

        if (finalUrl) {
            // CDN filtreleme (Bazı js dosyalarını link sanmasın)
            if (finalUrl.includes("cloudfront.net") && !finalUrl.includes(".m3u8")) finalUrl = "";
        }

        if (finalUrl) {
            console.error("[Kekik-Log] 5. OMEGA BİNGO: " + finalUrl);
            return [{
                name: "HotStream (Omega-V94)",
                url: `${config.proxyUrl}?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
                headers: { 
                    'User-Agent': browserUA, 
                    'Referer': "https://hotstream.club/",
                    'Origin': "https://hotstream.club"
                }
            }];
        }

        console.error("[Kekik-Log] 6. Maalesef kale düşmedi. HTML Boyutu: " + eHtml.length);
        return [];

    } catch (e) {
        console.error("[Kekik-Log] CRASH: " + e.toString());
        return [];
    }
}

globalThis.getStreams = getStreams;
