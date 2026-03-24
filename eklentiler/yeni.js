/**
 * Nuvio Bepeak-Special - izle.plus (V93)
 */

var config = {
    name: "izle.plus (V93-Final-Attempt)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        console.error("[Kekik-Log] 1. Bepeak-Special Devrede");
        let query = (typeof input === 'object') ? (input.title || input.name) : input;
        if (!query || /^\d+$/.test(query)) query = "Ajan Zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

        // ID ve Sayfa Bulma (Log Onaylı)
        let sRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': browserUA } });
        let sHtml = await sRes.text();
        let movieUrl = (sHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-)[^"\/]+\/)"/i) || [])[1];
        if (!movieUrl) return [];

        let mRes = await fetch(movieUrl, { headers: { 'User-Agent': browserUA } });
        let mHtml = await mRes.text();
        let videoId = (mHtml.match(/hotstream\.club\/(?:embed|v|download)\/([a-zA-Z0-9_-]+)/i) || [])[1];
        if (!videoId) return [];
        console.error("[Kekik-Log] 2. ID: " + videoId);

        // EMBED SAYFASI ANALİZİ
        let eRes = await fetch(`https://hotstream.club/embed/${videoId}`, { 
            headers: { 'User-Agent': browserUA, 'Referer': movieUrl } 
        });
        let eHtml = await eRes.text();

        // --- UNPACKER ENGINE ---
        function unpack(p, a, c, k, e, d) {
            e = function(c) { return (c < a ? "" : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36)) };
            if (!''.replace(/^/, String)) {
                while (c--) d[e(c)] = k[c] || e(c);
                k = [function(e) { return d[e] }];
                e = function() { return '\\w+' };
                c = 1;
            }
            while (c--) if (k[c]) p = p.replace(new RegExp('\\b' + e(c) + '\\b', 'g'), k[c]);
            return p;
        }

        let finalUrl = "";

        // 1. ADIM: Packer (eval) Taraması
        let packerMatch = eHtml.match(/eval\(function\(p,a,c,k,e,d\).+?\.split\('\|'\)\)\)/g);
        if (packerMatch) {
            console.error("[Kekik-Log] 3. Packer algılandı, deşifre ediliyor...");
            for (let p of packerMatch) {
                let args = p.match(/\('(.*)',\s*(\d+),\s*(\d+),\s*'(.*)'\.split/);
                if (args) {
                    let decoded = unpack(args[1], parseInt(args[2]), parseInt(args[3]), args[4].split('|'), 0, {});
                    let m = decoded.match(/https?:\/\/[^"']+\.m3u8[^"']*/i);
                    if (m) { finalUrl = m[0]; break; }
                }
            }
        }

        // 2. ADIM: Base64 ve Tırnak Arası (Eğer Packer yoksa)
        if (!finalUrl) {
            let allLinks = eHtml.match(/https?:\/\/[^"']+\.m3u8[^"']*/gi) || [];
            finalUrl = allLinks.find(l => !l.includes("google") && !l.includes("cloudfront"));
        }

        if (finalUrl) {
            finalUrl = finalUrl.replace(/\\/g, "");
            console.error("[Kekik-Log] 4. BİNGO: " + finalUrl);
            return [{
                name: "HotStream (Bepeak-V93)",
                url: `${config.proxyUrl}?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
                headers: { 'User-Agent': browserUA, 'Referer': "https://hotstream.club/" }
            }];
        }

        console.error("[Kekik-Log] 5. Hata: Link şifresi kırılamadı.");
        return [];

    } catch (e) {
        console.error("[Kekik-Log] CRASH: " + e.toString());
        return [];
    }
}

globalThis.getStreams = getStreams;
