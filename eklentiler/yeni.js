/**
 * FullHDFilmizlesene Nuvio Scraper - v29.0 (Full Version)
 * Created by: MoOnCrOwN
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// API'den kaynakları çeken fonksiyon
async function getStreamsFromAPI(vidId, title) {
    try {
        const apiUrl = `${BASE_URL}/ajax/sources`;
        const params = new URLSearchParams();
        params.append('id', vidId);

        let response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                ...WORKING_HEADERS,
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
                    isDirect: source.file.includes('.m3u8') || source.file.includes('.mp4')
                });
            });
        }
        return streams;
    } catch (e) {
        console.error("FullHD-API-Error: " + e.message);
        return [];
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        // Nuvio ve Stremio projelerinde dizi/film ayrımı[cite: 1]
        if (mediaType !== 'movie') return resolve([]);

        // TMDB Verilerini Çek
        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`)
            .then(res => res.json())
            .then(data => {
                const year = data.release_date ? data.release_date.split('-')[0] : "";
                const movieTitle = data.title || data.original_title;
                const imdbId = data.imdb_id;

                // Arama URL'si (IMDb ID varsa daha garantidir)
                let searchUrl = imdbId 
                    ? `${BASE_URL}/search/${imdbId}/` 
                    : `${BASE_URL}/arama/${encodeURIComponent(movieTitle)}`;

                return Promise.all([fetch(searchUrl, { headers: WORKING_HEADERS }), year, movieTitle]);
            })
            .then(async ([res, year, movieTitle]) => {
                let searchHtml = await res.text();
                let $ = cheerio.load(searchHtml);
                let filmLink = "";

                // Arama sonuçlarında linki yakala
                $("a").each((i, el) => {
                    let href = $(el).attr("href");
                    let text = $(el).text().toLowerCase();
                    
                    if (href && href.includes('/film/') && !href.includes('/kategori/')) {
                        if (text.includes(movieTitle.toLowerCase()) || (year && searchHtml.includes(year))) {
                            filmLink = href;
                            return false; 
                        }
                    }
                });

                if (!filmLink) {
                    filmLink = $("a[href*='/film/']").first().attr("href");
                }

                if (!filmLink) throw new Error("Film linki bulunamadı");

                let targetUrl = filmLink.startsWith('http') ? filmLink : BASE_URL + (filmLink.startsWith('/') ? '' : '/') + filmLink;
                let filmRes = await fetch(targetUrl, { headers: WORKING_HEADERS });
                let filmHtml = await filmRes.text();

                // Video ID'sini yakala
                let vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
                if (vidMatch) {
                    return getStreamsFromAPI(vidMatch[1], movieTitle);
                }
                return [];
            })
            .then(streams => resolve(streams))
            .catch(err => {
                console.error("FullHD-Main-Error: " + err.message);
                resolve([]);
            });
    });
}

// Nuvio için export mantığı
module.exports = {
    getStreams: getStreams
};
