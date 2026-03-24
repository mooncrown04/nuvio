/**
 * Nuvio Multi-Source - izle.plus (V95)
 */

var config = {
    name: "izle.plus (Multi-Source-V95)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        console.error("[Kekik-Log] 1. Multi-Source Başlatıldı");
        let query = (typeof input === 'object') ? (input.title || input.name) : input;
        if (!query || /^\d+$/.test(query)) query = "Ajan Zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

        // 1. Film Sayfasını Bul
        let sRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': browserUA } });
        let sHtml = await sRes.text();
        let movieUrl = (sHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-)[^"\/]+\/)"/i) || [])[1];
        if (!movieUrl) return [];

        console.error("[Kekik-Log] 2. Sayfa Analizi: " + movieUrl);
        let mRes = await fetch(movieUrl, { headers: { 'User-Agent': browserUA } });
        let mHtml = await mRes.text();

        let streams = [];

        // 2. KAYNAK TARAMASI (Hotstream dışındakiler)
        // Sayfadaki tüm iframe ve player linklerini topla
        let potentialLinks = mHtml.match(/https?:\/\/(?:vidmoly|moly|uqload|fastu|voe|dood)\.[a-z]+\/(?:embed|e|v)\/[a-zA-Z0-9_-]+/gi) || [];
        
        // Benzersiz linkleri filtrele
        let uniqueLinks = [...new Set(potentialLinks)];
        console.error(`[Kekik-Log] 3. Bulunan Alternatif Sayısı: ${uniqueLinks.length}`);

        for (let link of uniqueLinks) {
            console.error("[Kekik-Log] 4. Kaynak Deneniyor: " + link);
            
            // Vidmoly/Moly için basit m3u8 çekici
            try {
                let vRes = await fetch(link, { headers: { 'User-Agent': browserUA, 'Referer': movieUrl } });
                let vHtml = await vRes.text();
                let m3u8 = (vHtml.match(/https?:\/\/[^"']+\.m3u8[^"']*/i) || [])[0];
                
                if (m3u8) {
                    streams.push({
                        name: link.split('/')[2].split('.')[0].toUpperCase(),
                        url: `${config.proxyUrl}?url=${encodeURIComponent(m3u8)}&referer=${encodeURIComponent(link)}&ignore_ssl=true`,
                        headers: { 'User-Agent': browserUA, 'Referer': link }
                    });
                }
            } catch (e) { continue; }
        }

        // 3. EĞER HALA BOŞSA: Sayfadaki gizli "data-video" veya "data-link" özniteliklerini ara
        if (streams.length === 0) {
            console.error("[Kekik-Log] 5. Gizli veri taraması...");
            let dataLinks = mHtml.match(/data-(?:link|video|url)=["']([^"']+)["']/gi) || [];
            for (let dl of dataLinks) {
                let val = dl.match(/["']([^"']+)["']/)[1];
                if (val.includes("http")) {
                     streams.push({ name: "Alternatif", url: val });
                }
            }
        }

        console.error(`[Kekik-Log] 6. Toplam Yayın: ${streams.length}`);
        return streams;

    } catch (e) {
        console.error("[Kekik-Log] CRASH: " + e.toString());
        return [];
    }
}

globalThis.getStreams = getStreams;
