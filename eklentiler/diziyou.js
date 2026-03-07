console.log('[DZB-LOG] DIZIYOU DOSYASI ICINDEN DIZIBOX TETIKLENDI');

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log('[DZB-LOG] Gelen Talep -> ID: ' + tmdbId);
    try {
        // TMDB'den isim al
        const tmdbRes = await fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96');
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.name || tmdbData.original_name;
        
        console.log('[DZB-LOG] Aranan Dizi: ' + query);

        // DiziBox Arama
        const searchRes = await fetch('https://www.dizibox.live/?s=' + encodeURIComponent(query));
        const searchHtml = await searchRes.text();
        
        const slugMatch = searchHtml.match(/href="https:\/\/www\.dizibox\.live\/dizi\/([^/"]+)/);
        if (!slugMatch) {
            console.log('[DZB-LOG] DiziBox üzerinde bulunamadı.');
            return [];
        }

        const targetUrl = 'https://www.dizibox.live/' + slugMatch[1] + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-1-izle/';
        console.log('[DZB-LOG] Hedef Sayfa: ' + targetUrl);

        const pageRes = await fetch(targetUrl);
        const pageHtml = await pageRes.text();
        
        const iframeMatch = pageHtml.match(/<iframe[^>]+src="([^"]+)"/i);
        if (iframeMatch) {
            let streamUrl = iframeMatch[1];
            if (streamUrl.startsWith('//')) streamUrl = 'https:' + streamUrl;
            
            return [{
                name: "DiziBox (Redirect)",
                url: streamUrl,
                quality: "1080p"
            }];
        }
    } catch (e) {
        console.log('[DZB-LOG] HATA: ' + e.message);
    }
    return [];
}

if (typeof module !== 'undefined') module.exports = { getStreams: getStreams };
