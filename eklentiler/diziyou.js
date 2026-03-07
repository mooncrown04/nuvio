// [DZB-FIX] Dizibox Link Onarıcı Kod
console.log('[DZB-LOG] Eklenti Baslatildi');

const plugin = {
    name: 'DiziYou',
    async search(query) {
        // Arama yaparken dizibox üzerinden gitmesini sağlıyoruz
        const url = `https://www.dizibox.tv/?s=${encodeURIComponent(query)}`;
        console.log('[DZB-LOG] Aranan URL: ' + url);
        
        try {
            const response = await fetch(url);
            const html = await response.text();
            // Burada sonuçları parse eden orijinal mantık devam edecek
            return []; // Şimdilik boş dönelim, bağlantıyı test ediyoruz
        } catch (e) {
            console.log('[DZB-LOG] Hata: ' + e.message);
            return [];
        }
    }
};

// Uygulamanın eklentiyi tanıması için gerekli export (Uygulamanın orijinal formatına göre)
// Not: Eğer orijinal diziyou.js dosyan varsa, sadece link kısmını "dizibox.tv" olarak düzeltmen yeterli.
