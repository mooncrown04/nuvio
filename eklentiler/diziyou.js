// Uygulamanın tanıması için global seviyede tanımlama yapıyoruz
const scraper = {
    // 1. Arama Fonksiyonu: Uygulama bir şey arattığında burası çalışır
    search: async function(query) {
        console.log("Diziyou: Arama yapılıyor -> " + query);
        // Test amaçlı sabit bir sonuç döndürelim
        return [{
            name: query + " - Dizibox Sonucu",
            url: "https://www.dizibox.tv/?s=" + encodeURIComponent(query),
            poster: "https://www.dizibox.tv/favicon.ico"
        }];
    },

    // 2. KRİTİK FONKSİYON: Uygulamanın logda "bulamadım" dediği yer
    getStreams: async function(url) {
        console.log("Diziyou: Yayınlar alınıyor -> " + url);
        // Uygulamanın çökmemesi için şimdilik boş bir liste döndürüyoruz
        return [];
    }
};

// Uygulamanın eklentiyi görmesi için dışa aktarma (Export)
if (typeof module !== 'undefined') {
    module.exports = scraper;
} else {
    // Bazı ortamlar için global tanımlama
    globalThis.search = scraper.search;
    globalThis.getStreams = scraper.getStreams;
}

console.log("Diziyou: Modül başarıyla yüklendi!");
