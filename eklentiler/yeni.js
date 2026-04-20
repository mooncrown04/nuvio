/**
 * Nuvio Scraper - FilmCennetim (GitHub nuviotr mantığıyla)
 * Bu kod Nuvio QuickJS ortamında doğrudan çalışacak şekilde optimize edilmiştir.
 */

const BASE_URL = "https://stream.watchbuddy.tv";

const Scraper = {
    /**
     * Arama Fonksiyonu: Nuvio arama çubuğuna yazıldığında tetiklenir.
     */
    search: function(query) {
        const searchUrl = `${BASE_URL}/ara/FilmCennetim?lang=tr&sorgu=${encodeURIComponent(query)}`;
        
        console.error(`[Nuvio-Info] Arama URL: ${searchUrl}`);

        return fetch(searchUrl)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP Hata: ${res.status}`);
                return res.text();
            })
            .then(html => {
                const results = [];
                // GitHub providerlarındaki mantık: URL parametrelerini Regex ile yakala
                const regex = /href="(\/izle\/FilmCennetim\?[^"]+)"/g;
                let match;

                while ((match = regex.exec(html)) !== null) {
                    try {
                        const path = match[1].replace(/&amp;/g, '&');
                        const params = new URLSearchParams(path.split('?')[1]);
                        
                        results.push({
                            id: path,
                            name: params.get('baslik') || "İsimsiz",
                            poster: params.get('poster_url') || "",
                            type: 'movie'
                        });
                    } catch (e) {
                        console.error("[Nuvio-Error] Link parse hatası: " + e.message);
                    }
                }
                return results;
            })
            .catch(err => {
                console.error("[Nuvio-Critical] Search Fonksiyonu Çöktü: " + err.message);
                return [];
            });
    },

    /**
     * Detay Fonksiyonu: Bir film kartına tıklandığında çalışır.
     */
    getMeta: function(id) {
        console.error(`[Nuvio-Info] Meta getiriliyor: ${id}`);
        try {
            const params = new URLSearchParams(id.split('?')[1]);
            return Promise.resolve({
                id: id,
                name: params.get('baslik'),
                poster: params.get('poster_url'),
                background: params.get('poster_url'),
                type: 'movie',
                releaseInfo: params.get('year') || "",
                imdbRating: params.get('rating') || ""
            });
        } catch (e) {
            console.error("[Nuvio-Critical] getMeta Hatası: " + e.message);
            return Promise.resolve(null);
        }
    },

    /**
     * Yayın Fonksiyonu: Oynat tuşuna basıldığında kaynakları getirir.
     */
    getStreams: function(id) {
        const streamUrl = id.startsWith('http') ? id : `${BASE_URL}${id}`;
        console.error(`[Nuvio-Info] Stream çekiliyor: ${streamUrl}`);

        return fetch(streamUrl)
            .then(res => {
                if (!res.ok) throw new Error(`HTTP Hata: ${res.status}`);
                return res.text();
            })
            .then(html => {
                const streams = [];
                // Iframe kaynaklarını bulma mantığı
                const iframeRegex = /<iframe[^>]+src="([^"]+)"/g;
                let match;
                let count = 1;

                while ((match = iframeRegex.exec(html)) !== null) {
                    const src = match[1];
                    if (src && src.includes('http')) {
                        streams.push({
                            title: `Kaynak ${count++}`,
                            url: src,
                            type: 'embed'
                        });
                    }
                }
                
                if (streams.length === 0) console.error("[Nuvio-Warning] Hiç kaynak bulunamadı!");
                return streams;
            })
            .catch(err => {
                console.error("[Nuvio-Critical] getStreams Hatası: " + err.message);
                return [];
            });
    }
};

// Nuvio'nun modülü tanıması için zorunlu alan
module.exports = Scraper;
