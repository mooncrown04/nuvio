/**
 * Nuvio Local Scraper - DiziBox (v17.0 Survivor Edition)
 */

var cheerio = require("cheerio-without-node-native");
var CryptoJS = require("crypto-js");

const BASE_URL = 'https://www.dizibox.live';
// Statik cookie yerine sadece temel tarayıcı kimliği
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3',
    'Referer': 'https://www.google.com/'
};

var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        console.log("DZBX_LOG: Islem basladi. TMDB -> " + tmdbId);

        // 1. ADIM: TMDB'den isim çek
        fetch('https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96')
            .then(res => res.json())
            .then(data => {
                const title = data.name || data.title;
                if (!title) throw new Error("TMDB_TITLE_NOT_FOUND");
                
                // slug oluştur (örneğin: "The Boys" -> "the-boys")
                const slug = title.toLowerCase().trim()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/[\s_-]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                console.log("DZBX_LOG: Sorgu -> " + title + " | Slug -> " + slug);

                // 2. ADIM: Arama yap (Cookie eklemeden dene, Cloudflare varsa zaten her türlü takılacak)
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(title), { headers: HEADERS })
                    .then(res => {
                        console.log("DZBX_LOG: Arama HTTP Durumu -> " + res.status);
                        return res.text();
                    })
                    .then(html => ({ html, slug }));
            })
            .then(obj => {
                let $ = cheerio.load(obj.html);
                let firstResult = $('article.detailed-article a').first().attr('href') || 
                                 $('article.article-series-poster a').first().attr('href');

                // Eğer arama sonucu boşsa, URL Tahmini (Brute Force) yapalım
                if (!firstResult) {
                    console.log("DZBX_WARN: Arama bos dondu, URL tahmini deneniyor...");
                    firstResult = BASE_URL + '/' + obj.slug + '/'; 
                }

                const targetUrl = firstResult.replace(/\/$/, "") + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
                console.log("DZBX_LOG: Hedef Sayfa -> " + targetUrl);

                return fetch(targetUrl, { headers: HEADERS });
            })
            .then(res => {
                if(res.status === 404) throw new Error("PAGE_NOT_FOUND: " + res.status);
                return res.text();
            })
            .then(pageHtml => {
                let $ = cheerio.load(pageHtml);
                let sources = [];
                
                // Iframe ve Alternatifleri topla
                $('#video-area iframe, .video-toolbar option').each((i, el) => {
                    let src = $(el).attr('src') || $(el).attr('value');
                    if(src && src.includes('http')) sources.push(src);
                });

                if (sources.length === 0) throw new Error("SOURCES_NOT_FOUND_IN_PAGE");
                console.log("DZBX_LOG: Bulunan Kaynak Sayisi -> " + sources.length);

                // İlk çalışan kaynağı çöz
                return solveSources(sources, 0);
            })
            .then(finalUrl => {
                if (finalUrl) {
                    resolve([{
                        name: "DiziBox Local",
                        url: finalUrl,
                        quality: "1080p",
                        headers: { 'Referer': BASE_URL + '/' },
                        provider: "dizibox_local"
                    }]);
                } else {
                    resolve([]);
                }
            })
            .catch(err => {
                console.error("DZBX_ERROR: " + err.message);
                resolve([]);
            });
    });
};

function solveSources(sources, index) {
    if (index >= sources.length) return Promise.resolve(null);
    
    let url = sources[index];
    if (url.includes("king.php")) url = url.replace("king.php?v=", "king.php?wmode=opaque&v=");

    console.log("DZBX_LOG: Kaynak Cozuluyor (" + index + ") -> " + url);

    return fetch(url, { headers: { 'Referer': BASE_URL } })
        .then(res => res.text())
        .then(html => {
            let match = html.match(/decrypt\("(.*?)",\s*"(.*?)"\)/);
            if (match) {
                let bytes = CryptoJS.AES.decrypt(match[1], match[2]);
                let dec = bytes.toString(CryptoJS.enc.Utf8);
                let file = dec.match(/file:\s*'(.*?)'/);
                return file ? file[1] : solveSources(sources, index + 1);
            }
            return solveSources(sources, index + 1);
        })
        .catch(() => solveSources(sources, index + 1));
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
