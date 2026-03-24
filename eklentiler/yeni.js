/**
 * Nuvio Final-Strike - izle.plus (V84)
 */

var config = {
    name: "izle.plus (Final-V86)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        console.error("[Kekik-Log] 1. Operasyon Başladı");
        let query = (typeof input === 'object') ? (input.title || input.name) : input;
        if (!query || /^\d+$/.test(query)) query = "Ajan Zeta";

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

        // 1. ADIM: Sayfa ve ID zaten loglarda onaylandı, hızlıca geçiyoruz
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

        // 2. ADIM: EMBED SAYFASI DERİN ANALİZ
        let eRes = await fetch(`https://hotstream.club/embed/${videoId}`, { 
            headers: { 'User-Agent': browserUA, 'Referer': movieUrl } 
        });
        let eHtml = await eRes.text();

        let finalUrl = "";

        // Metot A: JSON Kaynakları (file: "...")
        let fileMatch = eHtml.match(/["']?file["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i);
        if (fileMatch) finalUrl = fileMatch[1];

        // Metot B: Packer / Eval Unpacker (Eğer şifreliyse)
        if (!finalUrl && eHtml.includes("eval(function")) {
            console.error("[Kekik-Log] 4. Eval algılandı, çözülüyor...");
            const unpack = (p,a,c,k,e,d) => {e=c=> (c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36));if(!''.replace(/^/,String)){while(c--)d[e(c)]=k[c]||e(c);k=[e=>d[e]];e=()=>'\\w+'};while(c--)if(k[c])p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c]);return p;};
            
            let evals = eHtml.match(/eval\(function\(p,a,c,k,e,d\).+?split\('\|'\)\)\)/g);
            if (evals) {
                for (let ev of evals) {
                    let p = ev.match(/\('(.*)',\s*(\d+),\s*(\d+),\s*'(.*)'\.split/);
                    if (p) {
                        let dec = unpack(p[1], parseInt(p[2]), parseInt(p[3]), p[4].split('|'), 0, {});
                        let m = dec.match(/https?:\/\/[^"']+\.m3u8[^"']*/i);
                        if (m) { finalUrl = m[0]; break; }
                    }
                }
            }
        }

        // Metot C: Ham String Taraması (Her ihtimale karşı)
        if (!finalUrl) {
            let rawLinks = eHtml.match(/https?:\/\/[^"']+\.m3u8[^"']*/gi);
            if (rawLinks) finalUrl = rawLinks.find(l => !l.includes("google"));
        }

        if (finalUrl) {
            // Hotstream linklerinde ters slash (\/) varsa temizle
            finalUrl = finalUrl.replace(/\\/g, "");
            console.error("[Kekik-Log] 5. BINGO: " + finalUrl);
            
            return [{
                name: "HotStream (Final-V86)",
                url: `${config.proxyUrl}?url=${encodeURIComponent(finalUrl)}&referer=${encodeURIComponent("https://hotstream.club/")}&ignore_ssl=true`,
                headers: { 'User-Agent': browserUA, 'Referer': "https://hotstream.club/" }
            }];
        }

        console.error("[Kekik-Log] 6. HATA: Link hala bulunamadı.");
        return [];

    } catch (e) {
        console.error("[Kekik-Log] CRASH: " + e.toString());
        return [];
    }
}

globalThis.getStreams = getStreams;
