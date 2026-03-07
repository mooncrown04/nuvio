// [DZB-FIX] Diziyou Bridge - Legacy Version
console.log('[DZB-LOG] Eklenti Baslatiliyor (Legacy Mod)...');

var scraper = {
    search: function(query) {
        console.log('[DZB-LOG] Aranan Kelime: ' + query);
        
        var searchUrl = 'https://www.dizibox.tv/?s=' + encodeURIComponent(query);
        
        // Bu motor büyük ihtimalle 'fetch' yerine uygulamanın kendi 'http' kütüphanesini bekliyor olabilir.
        // Ama önce fetch deneyelim:
        try {
            fetch(searchUrl)
                .then(function(res) { return res.text(); })
                .then(function(html) {
                    console.log('[DZB-LOG] Sayfa Alindi. Uzunluk: ' + html.length);
                })
                .catch(function(e) {
                    console.log('[DZB-LOG] Istek Hatasi: ' + e.message);
                });
        } catch (err) {
            console.log('[DZB-LOG] Genel Hata: ' + err.message);
        }
        
        return [];
    }
};

// Uygulama 'export' tanımadığı için nesneyi doğrudan tanımlıyoruz.
// Eğer uygulama eklentiyi bu isimle çağırıyorsa bu çalışacaktır.
scraper;
