/**
 * FullHDFilmizlesene - Veri Karşılaştırma & Eşleşme Analizi (v33.0)
 * Sitenin yıl verip vermediğini anlamak için RAW text basar.
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";
const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        // 1. TMDB Verilerini Al (Ham Liste)
        fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96')
            .then(res => res.json())
            .then(async (tmdb) => {
                const year = tmdb.release_date ? tmdb.release_date.split('-')[0] : "YOK";
                
                console.error("--- [1] TMDB HAM VERİLERİ ---");
                console.error("TR Adı: " + tmdb.title);
                console.error("Orjinal Adı: " + tmdb.original_title);
                console.error("Yıl: " + year);
                console.error("IMDb: " + (tmdb.imdb_id || "YOK"));
                console.error("-----------------------------");

                const searchUrl = BASE_URL + '/arama/' + encodeURIComponent(tmdb.title);
                let res = await fetch(searchUrl, { headers: WORKING_HEADERS });
                let html = await res.text();
                let $ = cheerio.load(html);
                
                console.error("--- [2] SİTE ARAMA LİSTESİ ANALİZİ ---");
                
                let foundLink = "";

                // Sitedeki tüm liste elemanlarını tek tek inceleyelim
                $(".film-listesi li").each((i, el) => {
                    // Li elementinin içindeki her şeyi alalım
                    let rawLiText = $(el).text().replace(/\s+/g, ' ').trim(); 
                    let linkAttr = $(el).find("a").attr("href");
                    let titleAttr = $(el).find("a").attr("title") || "YOK";
                    let imgAlt = $(el).find("img").attr("alt") || "YOK";

                    console.error(`Sıra ${i+1}:`);
                    console.error(` > Ham Yazı (Raw Text): "${rawLiText}"`);
                    console.error(` > Title Özelliği: "${titleAttr}"`);
                    console.error(` > Resim Alt Yazısı: "${imgAlt}"`);
                    console.error(` > Link: "${linkAttr}"`);

                    // Eşleşme denemesi (Loglara bakarak burayı düzelteceğiz)
                    let cleanSearchTitle = tmdb.title.toLowerCase();
                    if (rawLiText.toLowerCase().includes(cleanSearchTitle)) {
                        console.error(" >> UYUMLU: İsim eşleşti.");
                        if (year !== "YOK" && rawLiText.includes(year)) {
                            console.error(" >> UYUMLU: Yıl da eşleşti.");
                            if(!foundLink) foundLink = linkAttr;
                        } else if (year === "YOK") {
                            console.error(" >> UYUMLU: Yıl bilgisi yok, isim yetti.");
                            if(!foundLink) foundLink = linkAttr;
                        }
                    }
                    console.error("--------------------------------------");
                });

                if (!foundLink) {
                    console.error("!!! DİKKAT: Tam eşleşme bulunamadı. İlk sonuç zorlanıyor.");
                    foundLink = $(".film-listesi a").first().attr("href");
                }

                console.error("--- ANALİZ BİTTİ ---");
                
                // Buradan sonra senin çalışan vidid çekme mantığını ekleyebilirsin.
                resolve([]); 
            })
            .catch(err => {
                console.error("ANALİZ HATASI: " + err.message);
                resolve([]);
            });
    });
}

module.exports = { getStreams: getStreams };
