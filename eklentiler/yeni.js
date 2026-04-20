/**
 * Nuvio Scraper - FilmCennetim (KekikStream Based)
 * Hata payını minimize etmek için harici axios bağımlılığı kaldırıldı.
 */

const BASE_URL = "https://stream.watchbuddy.tv";

const Scraper = {
    // 1. Arama Fonksiyonu
    search: async function(query) {
        try {
            const searchUrl = `${BASE_URL}/ara/FilmCennetim?lang=tr&sorgu=${encodeURIComponent(query)}`;
            const response = await fetch(searchUrl);
            
            if (!response.ok) {
                console.error(`[Scraper Error] Arama isteği başarısız: ${response.status} - ${searchUrl}`);
                return [];
            }

            const html = await response.text();
            
            // Not: Eğer ortamda cheerio yoksa regex ile manuel ayıklama yapılır.
            // Burada en güvenli yöntem olan URL tabanlı yakalamayı kullanıyoruz.
            const results = [];
            const regex = /href="(\/izle\/FilmCennetim\?[^"]+)"/g;
            let match;

            while ((match = regex.exec(html)) !== null) {
                try {
                    const fullLink = match[1].replace(/&amp;/g, '&');
                    const params = new URLSearchParams(fullLink.split('?')[1]);
                    
                    results.push({
                        id: fullLink,
                        name: params.get('baslik') || "Bilinmeyen İçerik",
                        poster: params.get('poster_url') || "",
                        type: 'movie',
                        description: `Yıl: ${params.get('year') || '-'} | IMDb: ${params.get('rating') || '-'}`
                    });
                } catch (e) {
                    console.error("[Scraper Error] Link parse edilemedi:", e.message);
                }
            }

            return results;

        } catch (error) {
            console.error("[Scraper Critical] Search fonksiyonu çöktü:", error.message);
            return [];
        }
    },

    // 2. Detay Getirme (Meta)
    getMeta: async function(id) {
        try {
            // ID zaten tam URL veya path olarak geliyor
            const metaUrl = id.startsWith('http') ? id : `${BASE_URL}${id}`;
            const params = new URLSearchParams(metaUrl.split('?')[1]);

            // Detay sayfasından ekstra bilgi çekmek gerekirse fetch yapılabilir
            // Ancak şablon gereği URL parametreleri yeterli
            return {
                id: id,
                name: params.get('baslik'),
                poster: params.get('poster_url'),
                background: params.get('poster_url'),
                type: 'movie',
                releaseInfo: params.get('year'),
                imdbRating: params.get('rating'),
                description: `${params.get('baslik')} içeriğini izlemek için kaynakları kontrol edin.`
            };
        } catch (error) {
            console.error("[Scraper Critical] getMeta hatası:", error.message);
            return null;
        }
    },

    // 3. Yayın Kaynaklarını Çekme (Stream)
    getStreams: async function(id) {
        try {
            const streamUrl = id.startsWith('http') ? id : `${BASE_URL}${id}`;
            const response = await fetch(streamUrl);
            
            if (!response.ok) {
                console.error(`[Scraper Error] Stream sayfası yüklenemedi: ${response.status}`);
                return [];
            }

            const html = await response.text();
            const streams = [];

            // HTML içindeki iframe (embed) kaynaklarını yakala
            const iframeRegex = /<iframe[^>]+src="([^"]+)"/g;
            let match;
            let counter = 1;

            while ((match = iframeRegex.exec(html)) !== null) {
                const src = match[1];
                if (!src.includes('googletagmanager')) { // Reklam servislerini ele
                    streams.push({
                        title: `Kaynak #${counter++}`,
                        url: src,
                        type: 'embed'
                    });
                }
            }

            if (streams.length === 0) {
                console.error("[Scraper Warning] Hiç yayın kaynağı bulunamadı.");
            }

            return streams;

        } catch (error) {
            console.error("[Scraper Critical] getStreams hatası:", error.message);
            return [];
        }
    }
};

// Nuvio'nun tanıması için export
module.exports = Scraper;
