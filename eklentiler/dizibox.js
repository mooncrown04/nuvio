var VER = '2.1.0-CORS';
console.log('[Dizibox V' + VER + '] Yukleniyor...');

var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';
// Daha az bilinen ve Cloudflare bypass yetenegi olan bir proxy deniyoruz
var PROXY = 'https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all'; 
// Not: Yukaridaki proxy listesi degil, asagidaki yapiyi kullanacagiz:
var BYPASS = 'https://corsproxy.io/?';

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        
        // Isim temizleme (Slug)
        const rawName = tmdbData.original_name || tmdbData.name;
        const slug = rawName.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        const targetUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-izle/`;
        console.log(`[Dizibox] Hedef: ${targetUrl}`);

        // corsproxy.io kullanarak Cloudflare'i asmaya calisiyoruz
        const fetchUrl = BYPASS + encodeURIComponent(targetUrl);
        
        const res = await fetch(fetchUrl);
        const html = await res.text();

        if (html.includes('Cloudflare') || html.length < 500) {
            throw new Error('Proxy Cloudflare engelini asamadi.');
        }

        const streams = [];
        const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
        let match;

        while ((match = iframeRegex.exec(html)) !== null) {
            let src = match[1];
            if (src.includes('vidmoly') || src.includes('player') || src.includes('moly')) {
                streams.push({
                    name: "Dizibox (CORS-Proxy)",
                    url: src.startsWith('//') ? 'https:' + src : src,
                    quality: '1080p'
                });
            }
        }

        return streams;

    } catch (err) {
        console.log(`[Dizibox] Hata: ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
