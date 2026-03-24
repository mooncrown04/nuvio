/**
 * Nuvio Native-Bridge - izle.plus (V88)
 */

var config = {
    name: "izle.plus (Native-V88)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        console.error("[Kekik-Log] 1. Native Mod Devrede");
        let query = (typeof input === 'object') ? (input.title || input.name) : input;
        if (!query || /^\d+$/.test(query)) query = "Ajan Zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

        // 1. ADIM: Arama (Bu kısım fetch ile çalışıyor gibi görünüyor)
        let sRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': browserUA } });
        let sHtml = await sRes.text();
        let movieUrl = (sHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-)[^"\/]+\/)"/i) || [])[1];
        
        if (!movieUrl) return [];
        console.error("[Kekik-Log] 2. Sayfa: " + movieUrl);

        // 2. ADIM: Sayfa ID Çekimi
        let mRes = await fetch(movieUrl, { headers: { 'User-Agent': browserUA, 'Referer': config.baseUrl } });
        let mHtml = await mRes.text();
        let videoId = (mHtml.match(/hotstream\.club\/(?:embed|v|download)\/([a-zA-Z0-9_-]+)/i) || [])[1];

        if (!videoId) return [];
        console.error("[Kekik-Log] 3. ID: " + videoId);

        // 3. ADIM: XHR İLE BOT KORUMASINI ATLATMA (Native Benzetimi)
        // Fetch yerine XHR kullanarak sunucuyu "bu bir uygulama isteği" diye kandırıyoruz
        async function smartFetch(url, ref) {
            return new Promise((resolve, reject) => {
                let xhr = new XMLHttpRequest();
                xhr.open("GET", url, true);
                xhr.setRequestHeader("User-Agent", browserUA);
                xhr.setRequestHeader("Referer", ref);
                xhr.onreadystatechange = function() {
                    if (xhr.readyState == 4) resolve(xhr.responseText);
                };
                xhr.onerror = () => reject("XHR Error");
                xhr.send();
            });
        }

        console.error("[Kekik-Log] 4. Linkler taranıyor...");
        let dlHtml = await smartFetch(`https://hotstream.club/download/${videoId}`, movieUrl);
        
        // Eğer download sayfası boşsa, embed sayfasını XHR ile dene
        if (!dlHtml || dlHtml.length < 100) {
            console.error("[Kekik-Log] 4.1 Download boş, Embed deneniyor...");
            dlHtml = await smartFetch(`https://hotstream.club/embed/${videoId}`, movieUrl);
        }

        console.error("[Kekik-Log] 5. Gelen Boyut: " + dlHtml.length);

        // 4. ADIM: Regex Avı
        let finalUrl = (dlHtml.match(/https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*/i) || [])[0];

        if (finalUrl) {
            finalUrl = finalUrl.replace(/\\/g, "");
            console.error("[Kekik-Log] 6. BİNGO: " + finalUrl);
            return [{
                name: "HotStream (Native-V88)",
                url: `${config.proxyUrl}?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
                headers: { 'User-Agent': browserUA, 'Referer': "https://hotstream.club/" }
            }];
        }

        console.error("[Kekik-Log] 7. Maalesef link bulunamadı.");
        return [];

    } catch (e) {
        console.error("[Kekik-Log] CRASH: " + e.toString());
        return [];
    }
}

globalThis.getStreams = getStreams;
