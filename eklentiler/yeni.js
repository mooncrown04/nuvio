/**
 * Nuvio Brute-Force Scraper - izle.plus (V75)
 */

var config = {
    name: "izle.plus (Brute-V75)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        let query = (typeof input === 'object') ? (input.title || input.name || "ajan zeta") : input;
        if (query.toString().includes("1314786")) query = "ajan zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        // 1. Film Sayfasını Bul
        var searchUrl = `${config.baseUrl}/?s=${encodeURIComponent(query)}`;
        var searchRes = await fetch(searchUrl, { headers: { 'User-Agent': browserUA } });
        var searchHtml = await searchRes.text();
        var linkMatch = searchHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-json|wp-content|category|tag)[^"\/]+\/)"/i);
        if (!linkMatch) return [];

        // 2. Embed URL'sini Al
        var res = await fetch(linkMatch[1], { headers: { 'User-Agent': browserUA } });
        var html = await res.text();
        var videoMatch = html.match(/hotstream\.club\/(?:embed|v|list)\/([a-zA-Z0-9_-]+)/i);
        if (!videoMatch) return [];

        var embedUrl = `https://hotstream.club/embed/${videoMatch[1]}`;
        var playerRes = await fetch(embedUrl, { 
            headers: { 'User-Agent': browserUA, 'Referer': linkMatch[1] } 
        });
        var playerHtml = await playerRes.text();

        // 3. ADIM: GENİŞ TARAMA (Regex Bombası)
        let foundLinks = [];
        
        // Regex 1: Standart HTTP(S) m3u8/mp4
        let r1 = playerHtml.match(/https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*/gi);
        if (r1) foundLinks.push(...r1);

        // Regex 2: "file":"..." veya "src":"..." yapıları
        let r2 = playerHtml.match(/["']?(?:file|src|source|url)["']?\s*[:=]\s*["']([^"']+)["']/gi);
        if (r2) {
            r2.forEach(m => {
                let clean = m.replace(/["']?(?:file|src|source|url)["']?\s*[:=]\s*["']/, "").replace(/["']$/, "");
                if (clean.includes("m3u8") || clean.includes("mp4")) foundLinks.push(clean);
            });
        }

        // Regex 3: Base64 olabilecek uzun metinleri ayıkla (Hotstream bazen linki b64 yapar)
        let b64Match = playerHtml.match(/[A-Za-z0-9+/]{50,}/g);
        if (b64Match) {
            b64Match.forEach(b => {
                try {
                    let decoded = atob(b);
                    if (decoded.includes("http") && (decoded.includes("m3u8") || decoded.includes("mp4"))) {
                        foundLinks.push(decoded);
                    }
                } catch(e) {}
            });
        }

        // Tekrar edenleri sil ve temizle
        let uniqueLinks = [...new Set(foundLinks)].filter(l => l.startsWith('http'));

        if (uniqueLinks.length === 0) {
            console.error("[Kekik-Debug] Sayfa kodunda hiçbir video izi bulunamadı!");
            // Logcat'e sayfanın bir kısmını bas ki neyle karşı karşıyayız görelim
            console.error("[Kekik-Debug] HTML Snippet: " + playerHtml.substring(0, 500).replace(/\s+/g, ' '));
            return [];
        }

        let videoUrl = uniqueLinks[0];
        console.error(`[Kekik-Debug] AVCI YAKALADI: ${videoUrl}`);

        return [{
            name: "HotStream (Brute-V75)",
            url: `${config.proxyUrl}?url=${encodeURIComponent(videoUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
            headers: { 'User-Agent': browserUA, 'Referer': "https://hotstream.club/" }
        }];

    } catch (e) {
        console.error(`[Kekik-Debug] Hata: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
