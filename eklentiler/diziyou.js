console.log('[DZB-LOG] >>> TEST BASLADI <<<');

// 1. Format: Global Değişken (En yaygın olanı)
var scraper = {
    search: function(query) {
        console.log('[DZB-LOG] Arama tetiklendi: ' + query);
        return [];
    }
};

// 2. Format: Fonksiyonun doğrudan kendisi
function search(query) {
    console.log('[DZB-LOG] Direkt fonksiyon tetiklendi: ' + query);
    return [];
}

// 3. Format: QuickJS için nesneyi açıkta bırakma
scraper;

// 4. Format: Bazı sistemler için 'module.exports'
try {
    module.exports = scraper;
} catch(e) {}
