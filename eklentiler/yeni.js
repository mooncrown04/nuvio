/**
 * Nuvio Scraper - FilmCennetim (TMDB API'siz Versiyon)
 * Bu kod tamamen site içi parametreleri kullanarak objeye dönüştürme yapar.
 */

const BASE_URL = "https://stream.watchbuddy.tv";

const Scraper = {
    // 1. ARAMA: HTML'den linkleri yakalayıp Nuvio kartlarına dönüştürür
    search: function(query) {
        const searchUrl = BASE_URL + "/ara/FilmCennetim?lang=tr&sorgu=" + encodeURIComponent(query);
        console.error("[Nuvio-Debug] Arama URL: " + searchUrl);

        return fetch(searchUrl)
            .then(res => {
                if (!res.ok) throw new Error("Arama sayfası yüklenemedi: " + res.status);
                return res.text();
            })
            .then(html => {
                const results = [];
                // HTML içindeki href="/izle/FilmCennetim?..." linklerini yakalayan regex
                const regex = /href="(\/izle\/FilmCennetim\?[^"]+)"/g;
                let match;

                while ((match = regex.exec(html)) !== null) {
                    try {
                        const path = match[1].replace(/&amp;/g, '&');
                        const params = new URLSearchParams(path.split('?')[1]);
                        
                        // API KULLANMADAN DÖNÜŞTÜRME: Veriyi URL parametrelerinden alıyoruz
                        results.push({
                            id: path, // Linkin tamamını ID olarak kullanıyoruz
                            name: params.get('baslik') || "Bilinmeyen Film",
                            poster: params.get('poster_url') || "",
                            type: 'movie',
                            // Alt bilgi olarak yıl ve rating
                            description: "Yıl: " + (params.get('year') || "-") + " | IMDb: " + (params.get('rating') || "-")
                        });
                    } catch (e) {
                        console.error("[Nuvio-Error] Veri dönüştürme hatası: " + e.message);
                    }
                }
                console.error("[Nuvio-Debug] Bulunan sonuç sayısı: " + results.length);
                return results;
            })
            .catch(err => {
                console.error("[Nuvio-Critical] Search çöktü: " + err.message);
                return [];
            });
    },

    // 2. META: Kart tıklandığında URL'deki veriyi Nuvio detay sayfasına basar
    getMeta: function(id) {
        console.error("[Nuvio-Debug] Meta oluşturuluyor ID: " + id);
        try {
            // ID zaten parametre dolu bir link olduğu için parse ediyoruz
            const params = new URLSearchParams(id.split('?')[1]);
            
            return Promise.resolve({
                id: id,
                name: params.get('baslik'),
                poster: params.get('poster_url'),
                background: params.get('poster_url'), // Arkaplanı da poster yapıyoruz
                type: 'movie',
                releaseInfo: params.get('year') || "",
                imdbRating: params.get('rating') || "",
                description: params.get('baslik') + " filmini yüksek kalitede izle."
            });
        } catch (e) {
            console.error("[Nuvio-Critical] getMeta hatası: " + e.message);
            return Promise.resolve(null);
        }
    },

    // 3. STREAM: Oynat dendiğinde URL bozulmalarını tamir eder ve kaynağı çeker
    getStreams: function(id) {
        // HOSTNAME TAMİRİ: Loglarda gördüğümüz .tv286217 gibi bozulmaları temizliyoruz
        let cleanId = id.split(' ')[0].replace(/(https:\/\/stream\.watchbuddy\.tv)\d+/, '$1').trim();
        const streamUrl = cleanId.startsWith('http') ? cleanId : BASE_URL + cleanId;
        
        console.error("[Nuvio-Debug] Stream isteği atılıyor: " + streamUrl);

        return fetch(streamUrl)
            .then(res => {
                if (!res.ok) throw new Error("Yayın sayfası hatası: " + res.status);
                return res.text();
            })
            .then(html => {
                const streams = [];
                // HTML içindeki iframe (kaynak) linklerini yakala
                const iframeRegex = /<iframe[^>]+src="([^"]+)"/g;
                let match;
                let count = 1;

                while ((match = iframeRegex.exec(html)) !== null) {
                    const src = match[1];
                    if (src && src.startsWith('http') && !src.includes('ads')) {
                        streams.push({
                            title: "Kaynak " + (count++),
                            url: src,
                            type: 'embed'
                        });
                    }
                }
                
                if (streams.length === 0) console.error("[Nuvio-Warning] Hiç yayın linki bulunamadı!");
                return streams;
            })
            .catch(err => {
                console.error("[Nuvio-Critical] getStreams hatası: " + err.message);
                return [];
            });
    }
};

module.exports = Scraper;
