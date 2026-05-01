/**
 * FullHDFilmizlesene Nuvio Scraper - v34.0
 * İsimle arama öncelikli ve Yıl/ID doğrulamalı.
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";
const API_BASE = "https://www.fullhdfilmizlesene.live/player/api.php";

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// ... (universalAtob ve decodeRapidVid fonksiyonları aynı kalacak) ...

async function performSearch(query) {
    // Sitenin arama motoru genellikle boşluk yerine + veya - kullanır.
    // İsimle aramada daha başarılı olması için temizlik yapıyoruz.
    const formattedQuery = query.replace(/\s+/g, '+').trim();
    const url = `${BASE_URL}/arama/${encodeURIComponent(formattedQuery)}`;
    
    console.error(`[SEARCH-REQ] Sorgu: ${query} | URL: ${url}`);
    
    try {
        let res = await fetch(url, { headers: WORKING_HEADERS });
        if (!res.ok) throw new Error("Site cevap vermedi: " + res.status);
        
        let html = await res.text();
        let $ = cheerio.load(html);
        let results = [];

        // Site yapısına göre seçiciyi geniş tutuyoruz
        $(".film-listesi li, .filmler-listesi li").each((i, el) => {
            let link = $(el).find("a").attr("href");
            let title = $(el).find(".film-adi, h2, h3").text().trim() || $(el).text().trim();
            let text = $(el).text().toLowerCase();
            
            if (link) {
                results.push({ 
                    link: link, 
                    title: title,
                    isDublaj: text.includes("dublaj") || text.includes("türkçe"),
                    fullText: text 
                });
            }
        });
        return results;
    } catch (e) {
        console.error("[SEARCH-ERROR] " + e.message);
        return [];
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        // 1. TMDB Verilerini Çek
        fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&append_to_response=external_ids&language=tr-TR`)
            .then(res => res.json())
            .then(async (data) => {
                const movieTitle = data.title || data.original_title;
                const year = data.release_date ? data.release_date.split('-')[0] : "";
                const ttId = data.external_ids ? data.external_ids.imdb_id : "";

                console.error(`[START] İsimle Araniyor: ${movieTitle} (${year})`);

                // 2. İSİMLE ARA (Elle arama yaptığında bulduğu yöntem)
                let results = await performSearch(movieTitle);

                // 3. BULUNAMAZSA ttID İLE DENE
                if (results.length === 0 && ttId) {
                    console.error("[RE-TRY] İsimle bulunamadi, ttID deneniyor...");
                    results = await performSearch(ttId);
                }

                if (results.length === 0) throw new Error("Sitede hicbir sonuc bulunamadi.");

                // 4. SONUÇLAR İÇİNDE EN DOĞRUSUNU BUL
                let selected = null;

                // A) Hem Yıl tutsun hem Dublaj olsun
                selected = results.find(r => r.fullText.includes(year) && r.isDublaj);
                
                // B) Dublaj yoksa sadece Yıl tutsun
                if (!selected) selected = results.find(r => r.fullText.includes(year));
                
                // C) Yıl da tutmuyorsa ama isimle arattık diye güvenip ilk sonucu al
                if (!selected) {
                    console.error("[INFO] Tam yil eslesmesi yok, ilk sonuc aliniyor.");
                    selected = results[0];
                }

                console.error(`[SELECTED] Seçilen: ${selected.title} | Link: ${selected.link}`);

                // 5. VİDEO SAYFASINA GİT VE VIDID BUL
                let filmRes = await fetch(selected.link.startsWith('http') ? selected.link : BASE_URL + selected.link, { headers: WORKING_HEADERS });
                let filmHtml = await filmRes.text();
                let vidMatch = filmHtml.match(/vidid\s*=\s*['"](\d+)['"]/);

                if (!vidMatch) throw new Error("Film sayfasinda vidid bulunamadi!");
                
                return getStreamsFromAPI(vidMatch[1], movieTitle);
            })
            .then(streams => resolve(streams))
            .catch(err => {
                console.error(`[KRITIK-HATA] ${err.message}`);
                resolve([]);
            });
    });
}

// ... (Export ve getStreamsFromAPI aynı kalacak) ...
