/**
 * FullHDFilmizlesene Nuvio/Stremio Scraper - v31.0 (Final & Full)
 * MoOnCrOwN için eksiksiz, tek parça sürüm.
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr,en-US;q=0.7,en;q=0.3',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// 1. API'den kaynakları çeken fonksiyon (Tam sürüm)
async function getStreamsFromAPI(vidId, title) {
    try {
        const apiUrl = `${BASE_URL}/ajax/sources`;
        const params = new URLSearchParams();
        params.append('id', vidId);

        let response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                ...HEADERS,
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: params.toString()
        });

        let data = await response.json();
        let streams = [];

        if (data && data.sources) {
            data.sources.forEach(source => {
                streams.push({
                    name: `FullHD - ${source.label || 'Video'}`,
                    url: source.file,
                    title: title,
                    isDirect: true
                });
            });
        }
        return streams;
    } catch (e) {
        console.error("FullHD-API-Error: " + e.message);
        return [];
    }
}

// 2. Ana Akış Fonksiyonu (Tam sürüm)
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        // Loglardaki 'dizi' verisi yerine film kontrolü
        if (mediaType !== 'movie') return resolve([]);

        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`)
            .then(res => res.json())
            .then(async (data) => {
                const year = data.release_date ? data.release_date.split('-')[0] : "";
                const movieTitle = data.title || data.original_title;
                const imdbId = data.imdb_id;

                // Arama URL'si
                let searchUrl = imdbId 
                    ? `${BASE_URL}/search/${imdbId}/` 
                    : `${BASE_URL}/arama/${encodeURIComponent(movieTitle)}`;

                console.error("FullHD-Debug: Aranan -> " + movieTitle + " (" + searchUrl + ")");

                let res = await fetch(searchUrl, { headers: HEADERS });
                let html = await res.text();
                let $ = cheerio.load(html);
                let filmLink = "";

                // Arama sonuçlarında eşleşen linki bul
                $("a[href*='/film/']").each((i, el) => {
                    let href = $(el).attr("href");
                    let text = $(el).text().toLowerCase();
                    if (!href.includes('/kategori/') && !href.includes('/arama/')) {
                        if (text.includes(movieTitle.toLowerCase()) || (year && html.includes(year))) {
                            filmLink = href;
                            return false; 
                        }
                    }
                });

                // Link bulunamazsa ilk sonuca odaklan
                if (!filmLink) {
                    filmLink = $("a[href*='/film/']").first().attr("href");
                }

                if (!filmLink) throw new Error("Film linki bulunamadı");

                let targetUrl = filmLink.startsWith('http') ? filmLink : BASE_URL + (filmLink.startsWith('/') ? '' : '/') + filmLink;
                let filmRes = await fetch(targetUrl, { headers: HEADERS });
                let filmHtml = await filmRes.text();

                // Video ID'sini ham metinden çek
                let vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
                if (vidMatch) {
                    return getStreamsFromAPI(vidMatch[1], movieTitle);
                }
                
                throw new Error("Video ID bulunamadı");
            })
            .then(streams => resolve(streams))
            .catch(err => {
                console.error("FullHD-Main-Error: " + err.message);
                resolve([]);
            });
    });
}

// 3. Export (Nuvio uyumlu)
module.exports = {
    getStreams: getStreams
};
