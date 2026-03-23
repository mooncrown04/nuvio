/**
 * Nuvio Force-Title Scraper - izle.plus (V66)
 */

var config = {
    name: "izle.plus (Full-Force)",
    baseUrl: "https://izle.plus",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

async function getStreams(input) {
    try {
        // 1. ADIM: İsim Bulma Avı
        let query = "";
        
        if (typeof input === 'object') {
            // Logdaki 1314786 yerine gerçek ismi bulana kadar her şeyi dene
            query = input.name || input.title || input.original_title || input.title_tr || "";
            
            // Eğer hala sadece rakam geliyorsa veya boşsa loga bas
            if (!query || /^\d+$/.test(query)) {
                console.error(`[Kekik-Debug] Kritik: İsim bulunamadı, sadece ID var: ${JSON.stringify(input)}`);
            }
        } else {
            query = input;
        }

        console.error(`[Kekik-Debug] Kullanılan Arama Terimi: ${query}`);

        var browserUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

        // 2. ADIM: Arama Yap
        // Eğer query hala sadece rakamsa, site yine sonuç vermeyecektir.
        var searchUrl = `${config.baseUrl}/?s=${encodeURIComponent(query)}`;
        var searchRes = await fetch(searchUrl, { headers: { 'User-Agent': browserUA } });
        var searchHtml = await searchRes.text();

        // 3. ADIM: Link Ayıklama
        // wp-json vb. teknik sayfaları eleyerek ilk gerçek linki bul
        var linkMatch = searchHtml.match(/href="(https?:\/\/izle\.plus\/(?!wp-json|wp-content|category|tag)[^"\/]+\/)"/i);
        
        if (!linkMatch) {
            console.error(`[Kekik-Debug] Hata: '${query}' için arama sonucu bulunamadı.`);
            return [];
        }

        var targetUrl = linkMatch[1];
        console.error(`[Kekik-Debug] Hedef Sayfa Yakalandı: ${targetUrl}`);

        // 4. ADIM: Video Kaynağı Çekme
        var response = await fetch(targetUrl, { headers: { 'User-Agent': browserUA } });
        var html = await response.text();

        var videoMatch = html.match(/(?:hotstream\.club|vidmoly\.to|dizipal[^.]+)\/(?:embed|v|list)\/([a-zA-Z0-9_-]+)/i);

        if (videoMatch) {
            var videoId = videoMatch[1];
            var sourceDomain = videoMatch[0].split('/')[0];
            var streamUrl = `https://${sourceDomain}/v/${videoId}`;
            
            var finalUrl = `${config.proxyUrl}?url=${encodeURIComponent(streamUrl)}&referer=${encodeURIComponent("https://"+sourceDomain+"/")}&ignore_ssl=true`;

            return [{
                name: "izle.plus | " + sourceDomain,
                url: finalUrl,
                headers: { 'User-Agent': browserUA, 'Referer': `https://${sourceDomain}/` }
            }];
        }

        return [];

    } catch (e) {
        console.error(`[Kekik-Debug] Hata: ${e.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
