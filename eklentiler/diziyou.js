// [DZB-FIX] Diziyou to Dizibox Bridge
console.log('[DZB-LOG] Eklenti Yuklendi: Diziyou -> Dizibox');

const scraper = {
    // Uygulama arama yaptığında bu fonksiyon çalışır
    async search(query) {
        console.log('[DZB-LOG] Aranan Kelime: ' + query);
        
        // Dizibox'ın güncel arama URL'si
        const searchUrl = `https://www.dizibox.tv/?s=${encodeURIComponent(query)}`;
        
        try {
            const response = await fetch(searchUrl);
            const html = await response.text();
            
            // Eğer buraya kadar geldiyse bağlantı başarılıdır
            console.log('[DZB-LOG] Sayfa Alindi, Uzunluk: ' + html.length);
            
            // Önemli: Uygulamanın orijinal parse mantığı burada olmalı.
            // Şimdilik bağlantıyı test etmek için boş dönüyoruz.
            return []; 
        } catch (e) {
            console.log('[DZB-LOG] Baglanti Hatasi: ' + e.message);
            return [];
        }
    }
};

// QuickJS motoru için eklentiyi dışa aktar (Export)
export default scraper;
