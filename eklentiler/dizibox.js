console.log('[DZB-LOG] DOSYA SISTEM TARAFINDAN OKUNDU');

var BASE_URL = 'https://www.dizibox.live';

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log('[DZB-LOG] getStreams baslatildi: ' + tmdbId);
    
    try {
        if (mediaType !== 'tv') return [];

        // TMDB Sorgusu
        const tmdbRes = await fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96');
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.name || tmdbData.original_name;
        
        console.log('[DZB-LOG] Aranan dizi: ' + query);

        // Arama
        const searchRes = await fetch(BASE_URL + '/?s=' + encodeURIComponent(query));
        const searchHtml = await searchRes.text();
        
        const slugMatch = searchHtml.match(/href="https:\/\/www\.dizibox\.live\/dizi\/([^/"]+)/);
        if (!slugMatch) return [];

        const targetUrl = BASE_URL + '/' + slugMatch[1] + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-1-izle/';
        console.log('[DZB-LOG] Hedef: ' + targetUrl);

        // Bolum Sayfası
        const pageRes = await fetch(targetUrl);
        const pageHtml = await pageRes.text();
        
        const iframeMatch = pageHtml.match(/<iframe[^>]+src="([^"]+)"/i);
        if (iframeMatch) {
            let streamUrl = iframeMatch[1];
            if (streamUrl.startsWith('//')) streamUrl = 'https:' + streamUrl;
            
            return [{
                name: "DiziBox",
                url: streamUrl,
                quality: "1080p"
            }];
        }
    } catch (e) {
        console.log('[DZB-LOG] Hata olustu: ' + e.message);
    }
    return [];
}

// Ortam bağımsız export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else if (typeof window !== 'undefined') {
    window.getStreams = getStreams;
} else {
    this.getStreams = getStreams;
}
