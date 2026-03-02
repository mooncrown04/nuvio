var BASE_URL = 'https://www.diziyou.one';
var STORAGE_URL = 'https://storage.diziyou.one';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Referer': BASE_URL + '/'
};

// Timeout kontrollü fetch
async function nuvioFetch(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        console.log('[nuvioFetch] Fetching:', url);
        const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
        clearTimeout(timeout);
        console.log('[nuvioFetch] Status:', res.status);
        return res;
    } catch (e) {
        clearTimeout(timeout);
        console.error('[nuvioFetch] Error:', e.message);
        return null;
    }
}

// Dizi arama
async function searchDiziYou(title) {
    const searchUrl = BASE_URL + '/?s=' + encodeURIComponent(title);
    console.log('[DiziYou] Search URL:', searchUrl);

    const res = await nuvioFetch(searchUrl);
    if (!res) return [];
    const html = await res.text();

    const results = [];
    const listSeriesMatch = html.match(/<div[^>]*id="list-series"[^>]*>([\s\S]*?)<\/div>/i);
    if (listSeriesMatch) {
        const seriesHtml = listSeriesMatch[1];
        const cardPattern = /<div[^>]*id="list-series-main"[^>]*>([\s\S]*?)<\/div>/gi;
        let cards;
        while ((cards = cardPattern.exec(seriesHtml)) !== null) {
            const card = cards[1];
            const linkMatch = card.match(/<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<div[^>]*class="[^"]*cat-title-main[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
            if (!linkMatch) continue;
            const href = linkMatch[1];
            const seriesTitle = linkMatch[2].replace(/<[^>]+>/g, '').trim();
            results.push({
                title: seriesTitle,
                url: href.startsWith('http') ? href : BASE_URL + href
            });
        }
    }
    return results;
}

// Bölüm sayfası yükleme
async function loadSeriesPage(url) {
    const res = await nuvioFetch(url);
    if (!res) return { episodes: [] };
    const html = await res.text();

    const episodes = [];
    const allLinks = html.match(/<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<div[^>]*class="[^"]*bolumust[^"]*"[^>]*>/gi) || [];
    for (let i = 0; i < allLinks.length; i++) {
        const hrefMatch = allLinks[i].match(/href="([^"]+)"/i);
        if (!hrefMatch) continue;
        const epHref = hrefMatch[1];
        episodes.push({
            url: epHref.startsWith('http') ? epHref : BASE_URL + epHref,
            season: 1,
            episode: i + 1
        });
    }
    return { episodes };
}

// Stream çıkarma (ikinci kodun düzeltmesiyle)
async function extractStreams(episodeUrl) {
    const res = await nuvioFetch(episodeUrl);
    if (!res) return null;
    const html = await res.text();

    const idM = html.match(/player\/([^"]+).html/i);
    if (!idM) {
        console.warn('[DiziYou] No itemId found');
        return null;
    }
    const itemId = idM[1];
    console.log('[DiziYou] Item ID:', itemId);

    return {
        streams: [{
            name: '⌜ DiziYou ⌟ | HLS',
            url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8',
            quality: '720p'
        }],
        itemId
    };
}

// Ana motor
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];
    try {
        const tmdb = await fetch('https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=...');
        const data = await tmdb.json();
        const title = data.name || data.original_name;
        console.log('[DiziYou] TMDB title:', title);

        const results = await searchDiziYou(title);
        if (!results.length) return [];

        const best = results[0];
        const seriesData = await loadSeriesPage(best.url);
        if (!seriesData.episodes.length) return [];

        const targetEpisode = seriesData.episodes.find(ep => ep.season === seasonNum && ep.episode === episodeNum) || seriesData.episodes[0];
        const streamData = await extractStreams(targetEpisode.url);
        if (!streamData) return [];

        return streamData.streams.map(stream => ({
            name: stream.name,
            title: 'S' + seasonNum + 'E' + episodeNum + ' · ' + stream.quality + ' [ID:' + streamData.itemId + ']',
            url: stream.url,
            quality: stream.quality,
            provider: 'diziyou',
            type: 'hls'
        }));
    } catch (err) {
        console.error('[DiziYou] Fatal error:', err.message);
        return [];
    }
}

global.getStreams = getStreams;
