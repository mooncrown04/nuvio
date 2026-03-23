/**
 * Nuvio Global Scanner - izle.plus (V79)
 */

var config = {
    name: "izle.plus (Global-V79)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        let query = (typeof input === 'object') ? (input.title || input.name || "ajan zeta") : input;
        if (query.toString().includes("1314786")) query = "ajan zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        // 1. Film Arama
        var searchRes = await fetch(`${config.baseUrl}/?s=${encodeURIComponent(query)}`, { headers: { 'User-Agent': browserUA } });
        var searchHtml = await searchRes.text();
        var linkMatch = searchHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-json|wp-content|category|tag)[^"\/]+\/)"/i);
        if (!linkMatch) return [];

        // 2. Embed Sayfası
        var res = await fetch(linkMatch[1], { headers: { 'User-Agent': browserUA } });
        var html = await res.text();
        var videoMatch = html.match(/hotstream\.club\/(?:embed|v|list)\/([a-zA-Z0-9_-]+)/i);
        if (!videoMatch) return [];
        
        var embedUrl = `https://hotstream.club/embed/${videoMatch[1]}`;
        var playerRes = await fetch(embedUrl, { 
            headers: { 'User-Agent': browserUA, 'Referer': linkMatch[1] } 
        });
        var playerHtml = await playerRes.text();

        // 3. ADIM: GLOBAL REGEX TARAMASI (JSON ve String İçinden Ayıklama)
        let videoUrl = "";
        
        // Bu regex, tırnak içindeki her türlü m3u8 veya mp4 linkini bulur (JSON/JS fark etmez)
        let allLinks = playerHtml.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/gi);
        
        if (allLinks) {
            // Google linklerini ve reklamları ele
            let validLinks = allLinks
                .map(l => l.replace(/["']/g, ""))
                .filter(l => !l.includes("google") && !l.includes("analytics") && !l.includes("gtag"));
            
            if (validLinks.length > 0) videoUrl = validLinks[0];
        }

        // 4. ADIM: EĞER HALA YOKSA (Packer/Eval Çözümü)
        if (!videoUrl && playerHtml.includes("eval(function")) {
            function unpack(p,a,c,k,e,d){e=function(c){return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))};if(!''.replace(/^/,String)){while(c--){d[e(c)]=k[c]||e(c)}k=[function(e){return d[e]}];e=function(){return'\\w+'};c=1};while(c--){if(k[c]){p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c])}}return p;}
            
            let evalMatch = playerHtml.match(/eval\(function\(p,a,c,k,e,d\).+?split\('\|'\)\)\)/g);
            if (evalMatch) {
                for (let ev of evalMatch) {
                    let parts = ev.match(/\('(.*)',\s*(\d+),\s*(\d+),\s*'(.*)'\.split/);
                    if (parts) {
                        let decrypted = unpack(parts[1], parseInt(parts[2]), parseInt(parts[3]), parts[4].split('|'), 0, {});
                        let decMatch = decrypted.match(/https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*/i);
                        if (decMatch) { videoUrl = decMatch[0]; break; }
                    }
                }
            }
        }

        if (!videoUrl) {
            console.error("[Kekik-Debug] Link Hiçbir Yerde Yok!");
            return [];
        }

        console.error(`[Kekik-Debug] BULUNAN: ${videoUrl}`);

        return [{
            name: "HotStream (Global-Scan)",
            url: `${config.proxyUrl}?url=${encodeURIComponent(videoUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
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
