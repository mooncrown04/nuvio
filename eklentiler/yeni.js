/**
 * FullHDFilmizlesene Nuvio Scraper - v34.0 (Full Data Debug Mode)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";
const API_BASE = "https://www.fullhdfilmizlesene.live/player/api.php";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

async function getStreamsFromAPI(vidid, movieTitle) {
    try {
        let res = await fetch(API_BASE + '?id=' + vidid + '&type=t&name=atom&get=video&format=json', { headers: WORKING_HEADERS });
        let data = await res.json();
        if (data && data.html) {
            let playerRes = await fetch(data.html.replace(/\\/g, ''), { headers: WORKING_HEADERS });
            let playerHtml = await playerRes.text();
            let avMatch = playerHtml.match(/av\(['"]([^'"]+)['"]\)/);
            if (avMatch) {
                // decodeRapidVid fonksiyonunu yukarıda tanımladığını varsayıyorum (v28'deki gibi)
                let url = decodeRapidVid(avMatch[1]); 
                if (url) return [{ 
                    name: movieTitle, 
                    title: "⌜ FULLHDFILM ⌟ | 🇹🇷 Dublaj", 
                    url: url, 
                    quality: "Auto", 
                    headers: WORKING_HEADERS, 
                    provider: "fullhd_scraper" 
                }];
            }
        }
    } catch (e) { }
    return [];
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96')
            .then(res => res.json())
            .then(data => {
                const year = data.release_date ? data.release_date.split('-')[0] : "";
                const movieTitle = data.title || data.original_title;
                const searchUrl = BASE_URL + '/arama/' + encodeURIComponent(movieTitle);
                return Promise.all([fetch(searchUrl, { headers: WORKING_HEADERS }), year, movieTitle]);
            })
            .then(async ([res, year, movieTitle]) => {
                let searchHtml = await res.text();
                let $ = cheerio.load(searchHtml);
                
                console.error("--- SİTE ARAMA VERİ ANALİZİ ---");
                console.error("Aranan: " + movieTitle + " (" + year + ")");

                let filmLink = "";
                
                $(".film-listesi li").each((i, el) => {
                    // SİTEDEN GELEN TÜM VERİLERİ TOPLUYORUZ
                    let siteText = $(el).text().trim().replace(/\s+/g, ' '); // Ekranda yazan her şey
                    let siteTitleAttr = $(el).find("a").attr("title") || "YOK"; // Linkin gizli başlığı
                    let siteLink = $(el).find("a").attr("href");

                    // LOG: Sitenin her bir sonuç için bize ne verdiğini görelim
                    console.error(`Sonuç ${i+1}: Text: "${siteText}" | TitleAttr: "${siteTitleAttr}" | Link: "${siteLink}"`);

                    // Senin v28'deki çalışan eşleşme mantığın:
                    if (siteLink && (year === "" || siteText.includes(year))) {
                        if (!filmLink) {
                            filmLink = siteLink;
                            console.error(">> EŞLEŞTİ: Bu link seçildi.");
                        }
                    }
                });
                console.error("--- ANALİZ BİTTİ ---");

                if (!filmLink) filmLink = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                
                if (!filmLink) throw new Error("Film bulunamadı");
                
                let targetUrl = filmLink.startsWith('http') ? filmLink : BASE_URL + (filmLink.startsWith('/') ? '' : '/') + filmLink;
                let filmRes = await fetch(targetUrl, { headers: WORKING_HEADERS });
                let filmHtml = await filmRes.text();
                
                let vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);
                if (vidMatch) {
                    return getStreamsFromAPI(vidMatch[1], movieTitle);
                }
                return [];
            })
            .then(streams => resolve(streams))
            .catch(err => { 
                console.error("Hata: " + err.message);
                resolve([]); 
            });
    });
}

// v28'deki decodeRapidVid fonksiyonunu buraya eklemeyi unutma
function decodeRapidVid(e){/* v28'deki kodun aynısı */}

module.exports = { getStreams: getStreams };
