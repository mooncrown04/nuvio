/**
 * Nuvio Local Scraper Şablonu - v5.0
 * Özellikler: Fetch yapısı, $ kapsam koruması, Çift dilli (TR/ORG) akıllı arama.
 */

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "SITE_ADI"; 
const BASE_URL = "https://site-adresi.com";
const EMPTY_RESULT = [];

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[${PROVIDER_NAME}] Başlatıldı -> ID: ${tmdbId}`);

    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = `https://api.themoviedb.org/3/${isMovie ? 'movie' : 'tv'}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;

        fetch(tmdbUrl)
            .then(res => res.json())
            .then(data => {
                // TMDB'den hem Türkçe hem Orijinal isimleri alıyoruz
                var trTitle = (data.title || data.name || "").toLowerCase().trim();
                var orgTitle = (data.original_title || data.original_name || "").toLowerCase().trim();
                
                console.error(`[${PROVIDER_NAME}] Arama Başlıyor: ${trTitle}`);

                // 1. ADIM: Önce Türkçe isimle ara
                return searchOnSite(trTitle).then(url => {
                    if (url) return url;
                    
                    // 2. ADIM: Türkçe sonuç yoksa ve isimler farklıysa Orijinal isimle ara
                    if (trTitle !== orgTitle) {
                        console.error(`[${PROVIDER_NAME}] TR bulunamadı, ORG deneniyor: ${orgTitle}`);
                        return searchOnSite(orgTitle);
                    }
                    return null;
                });
            })
            .then(targetUrl => {
                if (!targetUrl) {
                    console.error(`[${PROVIDER_NAME}] HATA: Hiçbir isimle sonuç bulunamadı.`);
                    return resolve(EMPTY_RESULT);
                }

                // Dizi ise bölüm yolunu ekle (Site yapısına göre düzenle)
                if (!isMovie) {
                    targetUrl = targetUrl.replace(/\/$/, "") + `-sezon-${seasonNum}-bolum-${episodeNum}`;
                }

                return fetch(targetUrl, { headers: HEADERS });
            })
            .then(res => res ? res.text() : null)
            .then(html => {
                if (!html) return resolve(EMPTY_RESULT);
                var $page = cheerio.load(html);
                
                // --- VİDEO ÇÖZME MANTIĞI BURAYA GELECEK ---
                // Örn: iframe yakalama, API isteği vb.
                
                resolve(EMPTY_RESULT); // Geçici
            })
            .catch(err => {
                console.error(`[${PROVIDER_NAME}] HATA: ${err.message}`);
                resolve(EMPTY_RESULT);
            });
    });
}

/**
 * Yardımcı Fonksiyon: Sitede Arama Yapar ve Eşleşen URL'yi Döner
 */
function searchOnSite(query) {
    // Site arama parametresine göre düzenle (Genelde ?s= veya /arama?q=)
    var searchUrl = `${BASE_URL}/?s=` + encodeURIComponent(query);
    
    return fetch(searchUrl, { headers: HEADERS })
        .then(res => res.text())
        .then(html => {
            var $search = cheerio.load(html);
            var foundUrl = null;

            // Seçicileri (Selector) siteye göre güncelle (article, .video-content vb.)
            $search("div.icerik div.frag-k, article, .post-item").each(function() {
                var anchor = $search(this).find("a").first();
                var siteTitle = anchor.text().toLowerCase().trim();
                
                // Akıllı Eşleşme: Başlıklar birbirini kapsıyor mu?
                if (siteTitle.includes(query) || query.includes(siteTitle)) {
                    foundUrl = anchor.attr("href");
                    if (foundUrl) return false; // İlk eşleşmede dur
                }
            });
            return foundUrl;
        });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
