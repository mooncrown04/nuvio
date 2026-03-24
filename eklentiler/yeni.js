/**
 * Nuvio Master-Decoder - izle.plus (V90)
 */

var config = {
    name: "izle.plus (Final-V90)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        console.error("[Kekik-Log] 1. Decoder Aktif");
        let query = (typeof input === 'object') ? (input.title || input.name) : input;
        if (!query || /^\d+$/.test(query)) query = "Ajan Zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

        // 1. Film Sayfası & ID (Hızlı Geçiş - Loglarda Onaylı)
        let sRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': browserUA } });
        let sHtml = await sRes.text();
        let movieUrl = (sHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-)[^"\/]+\/)"/i) || [])[1];
        if (!movieUrl) return [];

        let mRes = await fetch(movieUrl, { headers: { 'User-Agent': browserUA } });
        let mHtml = await mRes.text();
        let videoId = (mHtml.match(/hotstream\.club\/(?:embed|v|download)\/([a-zA-Z0-9_-]+)/i) || [])[1];
        if (!videoId) return [];
        console.error("[Kekik-Log] 2. ID: " + videoId);

        // 2. EMBED SAYFASINI ÇÖZ (Boyutu 4364 olan sayfa)
        let eRes = await fetch(`https://hotstream.club/embed/${videoId}`, { 
            headers: { 'User-Agent': browserUA, 'Referer': movieUrl } 
        });
        let eHtml = await eRes.text();
        console.error(`[Kekik-Log] 3. Veri Boyutu: ${eHtml.length} - Analiz Başladı...`);

        let finalUrl = "";

        // Metot 1: JSON ve Tırnak Arası (file, src, link)
        let jsonMatch = eHtml.match(/["']?(?:file|src|link|url)["']?\s*[:=]\s*["']([^"']+\.m3u8[^"']*)["']/i);
        if (jsonMatch) finalUrl = jsonMatch[1];

        // Metot 2: Base64 Dedektörü (Çok kritik!)
        if (!finalUrl) {
            let b64Blocks = eHtml.match(/[A-Za-z0-9+/]{40,}/g); // 40 karakterden uzun b64 blokları
            if (b64Blocks) {
                for (let b of b64Blocks) {
                    try {
                        let decoded = atob(b);
                        if (decoded.includes(".m3u8")) {
                            let m = decoded.match(/https?:\/\/[^"']+\.m3u8[^"']*/i);
                            if (m) { finalUrl = m[0]; break; }
                        }
                    } catch(e) {}
                }
            }
        }

        // Metot 3: eval(atob(...)) Kombinasyonu
        if (!finalUrl && eHtml.includes("atob(")) {
            let atobMatch = eHtml.match(/atob\(["']([^"']+)["']\)/i);
            if (atobMatch) {
                try {
                    let dec = atob(atobMatch[1]);
                    if (dec.includes(".m3u8")) finalUrl = dec;
                } catch(e) {}
            }
        }

        // Metot 4: Ham Regex (En kaba hali)
        if (!finalUrl) {
            let raw = eHtml.match(/https?:\/\/[^"']+\.m3u8[^"']*/i);
            if (raw) finalUrl = raw[0];
        }

        if (finalUrl) {
            finalUrl = finalUrl.replace(/\\/g, "");
            console.error("[Kekik-Log] 4. SONUÇ: " + finalUrl);
            
            return [{
                name: "HotStream (V90-Final)",
                url: `${config.proxyUrl}?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
                headers: { 
                    'User-Agent': browserUA, 
                    'Referer': "https://hotstream.club/"
                }
            }];
        }

        console.error("[Kekik-Log] 5. Hata: 4364 byte içinde link bulunamadı. Yapı çok karmaşık.");
        return [];

    } catch (e) {
        console.error("[Kekik-Log] CRASH: " + e.toString());
        return [];
    }
}

globalThis.getStreams = getStreams;
