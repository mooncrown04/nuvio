/**
 * FullHDFilmizlesene - Görsel Debug Sürümü (v32.0)
 * Loglar direkt "Stream İsmi" olarak ekrana gelir.
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/'
};

async function getStreamsFromAPI(vidId, title) {
    try {
        const apiUrl = `${BASE_URL}/ajax/sources`;
        const params = new URLSearchParams();
        params.append('id', vidId);

        let response = await fetch(apiUrl, {
            method: 'POST',
            headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
            body: params.toString()
        });

        let data = await response.json();
        let streams = [];

        if (data && data.sources) {
            data.sources.forEach(source => {
                streams.push({
                    name: `BAŞARILI: ${source.label || 'Video'}`,
                    url: source.file,
                    title: title
                });
            });
        }
        return streams;
    } catch (e) {
        return [{ name: "HATA: API Çekilemedi - " + e.message, url: "" }];
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([{ name: "Dizi Desteklenmiyor", url: "" }]);

        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`)
            .then(res => res.json())
            .then(async (data) => {
                const movieTitle = data.title || data.original_title;
                const searchUrl = `${BASE_URL}/arama/${encodeURIComponent(movieTitle)}`;

                // Adım 1: Arama isteği atıldı mı?
                let res = await fetch(searchUrl, { headers: HEADERS });
                let html = await res.text();
                
                if (!html || html.length < 100) {
                    return resolve([{ name: "HATA: Sayfa Boş Geldi (Bot Koruması?)", url: "" }]);
                }

                let $ = cheerio.load(html);
                let filmLink = "";

                // Adım 2: Link aranıyor
                $("a[href*='/film/']").each((i, el) => {
                    let href = $(el).attr("href");
                    if (!href.includes('/kategori/') && !href.includes('/arama/')) {
                        filmLink = href;
                        return false; 
                    }
                });

                if (!filmLink) {
                    return resolve([{ name: "HATA: Arama Sayfasında Film Linki Yok", url: "" }]);
                }

                // Adım 3: Film sayfasına giriliyor
                let targetUrl = filmLink.startsWith('http') ? filmLink : BASE_URL + (filmLink.startsWith('/') ? '' : '/') + filmLink;
                let filmRes = await fetch(targetUrl, { headers: HEADERS });
                let filmHtml = await filmRes.text();

                // Adım 4: Video ID (vidid) kontrolü
                let vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
                if (vidMatch) {
                    let results = await getStreamsFromAPI(vidMatch[1], movieTitle);
                    resolve(results);
                } else {
                    resolve([{ name: "HATA: Film Sayfasında vidid Bulunamadı", url: "" }]);
                }
            })
            .catch(err => {
                resolve([{ name: "KRİTİK HATA: " + err.message, url: "" }]);
            });
    });
}

module.exports = { getStreams };
