/**
 * Nuvio Last-Stand - izle.plus (V87)
 */

var config = {
    name: "izle.plus (Final-V87)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        console.error("[Kekik-Log] 1. Operasyon Başladı");
        let query = (typeof input === 'object') ? (input.title || input.name) : input;
        if (!query || /^\d+$/.test(query)) query = "Ajan Zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

        // 1. ADIM: Film Sayfası ve ID (Log onaylı süreç)
        let sRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': browserUA } });
        let sHtml = await sRes.text();
        let matches = sHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-)[^"\/]+\/)"/gi);
        let movieUrl = matches ? matches.map(m => m.match(/href="([^"]+)"/)[1]).find(l => !l.includes("wp-json") && l.length > config.baseUrl.length + 2) : null;
        
        if (!movieUrl) return [];
        console.error("[Kekik-Log] 2. Hedef: " + movieUrl);

        let mRes = await fetch(movieUrl, { headers: { 'User-Agent': browserUA } });
        let mHtml = await mRes.text();
        let videoId = (mHtml.match(/hotstream\.club\/(?:embed|v|download)\/([a-zA-Z0-9_-]+)/i) || [])[1];

        if (!videoId) return [];
        console.error("[Kekik-Log] 3. ID: " + videoId);

        // 2. ADIM: DOWNLOAD SAYFASI TARAMASI (GİZLİ SİLAH)
        // Embed sayfası boş dönüyorsa, link mutlaka indirme sayfasında bir yerdedir.
        let dlPage = `https://hotstream.club/download/${videoId}`;
        let dlRes = await fetch(dlPage, { 
            headers: { 
                'User-Agent': browserUA, 
                'Referer': movieUrl,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            } 
        });
        let dlHtml = await dlRes.text();

        let finalUrl = "";

        // Metot A: Ham m3u8 Taraması
        let m3u8Links = dlHtml.match(/https?:\/\/[^"']+\.m3u8[^"']*/gi);
        if (m3u8Links) finalUrl = m3u8Links.find(l => !l.includes("google"));

        // Metot B: Eğer m3u8 yoksa, MP4 linki ara (Bazen mp4 olarak döner)
        if (!finalUrl) {
            let mp4Links = dlHtml.match(/https?:\/\/[^"']+\.mp4[^"']*/gi);
            if (mp4Links) finalUrl = mp4Links.find(l => !l.includes("google"));
        }

        // Metot C: "sources" JSON Bloğu Taraması
        if (!finalUrl) {
            let sourceMatch = dlHtml.match(/["']?file["']?\s*:\s*["']([^"']+)["']/i);
            if (sourceMatch) finalUrl = sourceMatch[1];
        }

        if (finalUrl) {
            finalUrl = finalUrl.replace(/\\/g, ""); // Ters slashları temizle
            console.error("[Kekik-Log] 5. BINGO: " + finalUrl);
            
            return [{
                name: "HotStream (Last-Stand)",
                url: `${config.proxyUrl}?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
                headers: { 
                    'User-Agent': browserUA, 
                    'Referer': "https://hotstream.club/",
                    'Origin': "https://hotstream.club"
                }
            }];
        }

        console.error("[Kekik-Log] 6. HATA: Hiçbir kaynak bulunamadı. HTML Boyutu: " + dlHtml.length);
        return [];

    } catch (e) {
        console.error("[Kekik-Log] CRASH: " + e.toString());
        return [];
    }
}

globalThis.getStreams = getStreams;
