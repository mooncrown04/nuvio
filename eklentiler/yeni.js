/**
 * FilmCennetim Provider - Nuvio (Optimized with TMDB Bridge)
 * JetFilmizle şablonundaki paralel arama ve TMDB isim eşleme mantığı uygulandı.
 */

const BASE_URL = "https://stream.watchbuddy.tv";
const TMDB_API_KEY = "65166299966144e590059e7987771746";

// 1. TMDB'den filmin temiz isim bilgilerini çeken fonksiyon
function fetchTmdbInfo(tmdbId) {
    return fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`)
        .then(res => res.json())
        .then(data => ({
            titleTr: data.title || '',
            titleEn: data.original_title || '',
            year: (data.release_date || '').slice(0, 4)
        }));
}

// 2. FilmCennetim sitesinde TMDB'den gelen isimle arama yapan fonksiyon
function searchInProvider(query) {
    const searchUrl = `${BASE_URL}/ara/FilmCennetim?lang=tr&sorgu=${encodeURIComponent(query)}`;
    
    return fetch(searchUrl)
        .then(res => res.text())
        .then(html => {
            const results = [];
            const regex = /href="(\/izle\/FilmCennetim\?[^"]+)"/g;
            let match;
            while ((match = regex.exec(html)) !== null) {
                const path = match[1].replace(/&amp;/g, '&');
                results.push(path);
            }
            return results;
        })
        .catch(() => []);
}

const Scraper = {
    // Nuvio'nun ana giriş noktası
    getStreams: function(tmdbId) {
        console.error(`[Nuvio-Debug] Akış Başladı. TMDB ID: ${tmdbId}`);

        // Önce TMDB'den filmin gerçek isimlerini alıyoruz (JetFilmizle örneğindeki gibi)
        return fetchTmdbInfo(tmdbId)
            .then(info => {
                console.error(`[Nuvio-Debug] TMDB Bilgisi: ${info.titleTr} (${info.year})`);
                // Temiz isimle provider'da arama yapıyoruz
                return searchInProvider(info.titleTr);
            })
            .then(links => {
                if (links.length === 0) throw new Error("Provider'da film bulunamadı.");
                
                // İlk bulunan sonucun (en yakın eşleşme) sayfasına gidiyoruz
                // URL sonundaki bozulmaları (tv7555 vb.) burada engellemek için tam URL oluşturuyoruz
                const targetPath = links[0].split(' ')[0]; 
                const finalUrl = BASE_URL + targetPath;
                
                console.error(`[Nuvio-Debug] Sayfa Çekiliyor: ${finalUrl}`);
                return fetch(finalUrl);
            })
            .then(res => res.text())
            .then(html => {
                const streams = [];
                // HTML içindeki iframe (kaynak) linklerini ayıkla
                const iframeRegex = /<iframe[^>]+src="([^"]+)"/g;
                let match;
                let count = 1;

                while ((match = iframeRegex.exec(html)) !== null) {
                    const src = match[1];
                    // Reklam veya geçersiz iframe'leri filtrele
                    if (src.includes('http') && !src.includes('google')) {
                        streams.push({
                            title: `Kaynak ${count++}`,
                            url: src,
                            type: 'embed',
                            headers: { "Referer": BASE_URL }
                        });
                    }
                }
                return streams;
            })
            .catch(err => {
                console.error(`[Nuvio-Critical] Hata: ${err.message}`);
                return [];
            });
    }
};

module.exports = Scraper;
