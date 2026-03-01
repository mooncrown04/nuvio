var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// Senin kullandığın yardımcı fonksiyonlar kalsın
function atobFixed(str) {
    try { return atob(str); } catch (e) { return null; }
}

function rot13Fixed(str) {
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

// OYNATMA HATASINI ÇÖZEN KRİTİK FONKSİYON (Hex Çözücü)
function decodeHexVideo(hex) {
    try {
        var clean = hex.replace(/\\\\x/g, '').replace(/\\x/g, '');
        var res = '';
        for (var i = 0; i < clean.length; i += 2) {
            res += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
        }
        return res.replace(/\\/g, '').replace(/["']/g, "").trim();
    } catch (e) { return null; }
}

function fetchDetailAndStreams(movieUrl) {
    return fetch(movieUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(async function(html) { // async ekledik çünkü içeride fetch yapacağız
            var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return [];

            var scx = JSON.parse(scxMatch[1]);
            var allStreams = [];

            // Senin link toplama döngün
            for (var key in scx) {
                if (scx[key].sx && scx[key].sx.t) {
                    var links = Array.isArray(scx[key].sx.t) ? scx[key].sx.t : Object.values(scx[key].sx.t);
                    
                    for (var i = 0; i < links.length; i++) {
                        // 1. Kademe Şifre Çözme (Senin yaptığın)
                        var step1Url = atobFixed(rot13Fixed(links[i]));
                        if (!step1Url) continue;

                        // 2. Kademe: OYNATMA HATASINI GİDERME
                        // Eğer link bir iframe sayfasıysa (Atom, Rapid vb.) içine girip asıl videoyu çekiyoruz
                        if (step1Url.includes('atom') || step1Url.includes('rapidvid') || step1Url.includes('vidmoxy')) {
                            try {
                                const iframeRes = await fetch(step1Url, { headers: { 'Referer': movieUrl } });
                                const iframeHtml = await iframeRes.text();
                                const hexMatch = iframeHtml.match(/file["']:\s*["']([^"']+)["']/);

                                if (hexMatch) {
                                    const finalVideoUrl = decodeHexVideo(hexMatch[1]);
                                    allStreams.push({
                                        name: "FHD - " + key.toUpperCase() + " (Çözüldü)",
                                        url: finalVideoUrl,
                                        type: 'VIDEO',
                                        headers: { 'Referer': step1Url, 'User-Agent': HEADERS['User-Agent'] }
                                    });
                                }
                            } catch (e) { 
                                // Hata alsa bile en azından ham linki ekleyelim (senin eski mantık)
                                allStreams.push({ name: "FHD - " + key, url: step1Url }); 
                            }
                        } else {
                            // Proton, Fast gibi doğrudan çalışan linkler
                            allStreams.push({
                                name: "FHD - " + key,
                                url: step1Url,
                                type: step1Url.includes('m3u8') ? 'M3U8' : 'VIDEO',
                                headers: { 'Referer': movieUrl }
                            });
                        }
                    }
                }
            }
            return allStreams;
        });
}
