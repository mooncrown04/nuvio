var VER = '1.8.0-PC';
console.log('[Dizibox V' + VER + '] PC Android Modu Baslatildi');

var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';
// PC'de daha stabil calisan bir proxy
var PROXY = 'https://api.allorigins.win/get?url=';

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.name || tmdbData.original_name;

        // .pw ve .tv artik yok, sadece .live ve PROXY
        const targetSearchUrl = `https://www.dizibox.live/?s=${encodeURIComponent(query)}`;
        console.log(`[Dizibox V${VER}] Sorgulanan: ${targetSearchUrl}`);

        const res = await fetch(PROXY + encodeURIComponent(targetSearchUrl));
        const data = await res.json();
        const html = data.contents;

        if (!html) throw new Error('Proxy verisi alinamadi.');

        const linkMatch = html.match(/href="(https?:\/\/www\.dizibox\.live\/[^"]+)"[^>]*rel="bookmark"/i);
        if (!linkMatch) throw new Error('Dizi bulunamadi.');

        const epUrl = linkMatch[1].replace(/\/$/, '') + `-sezon-${seasonNum}-bolum-${episodeNum}-izle/`;
        console.log(`[Dizibox V${VER}] Bulunan Bolum: ${epUrl}`);

        const epRes = await fetch(PROXY + encodeURIComponent(epUrl));
        const epData = await epRes.json();
        const epHtml = epData.contents;

        const streams = [];
        const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
        let match;

        while ((match = iframeRegex.exec(epHtml)) !== null) {
            let src = match[1];
            if (src.includes('vidmoly') || src.includes('moly') || src.includes('player')) {
                streams.push({
                    name: "Dizibox PC-PROXY",
                    url: src.startsWith('//') ? 'https:' + src : src,
                    quality: '1080p'
                });
            }
        }

        return streams;

    } catch (err) {
        console.log(`[Dizibox V${VER}] Hata: ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
