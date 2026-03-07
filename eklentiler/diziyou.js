const scraper = {
    // 1. ARAMA FONKSİYONU: Dizibox'ta film/dizi arar
    search: async function(query) {
        const searchUrl = `https://www.dizibox.tv/?s=${encodeURIComponent(query)}`;
        console.log("Diziyou: Arama başlatıldı -> " + searchUrl);

        try {
            const response = await fetch(searchUrl);
            const html = await response.text();

            // HTML içindeki sonuçları ayıklıyoruz (Regex ile)
            // Dizibox arama sonuçları genelde 'class="result-item"' içindedir
            const results = [];
            const regex = /<div class="result-item">[\s\S]*?<a href="(.*?)">[\s\S]*?<img src="(.*?)" alt="(.*?)"/g;
            
            let match;
            while ((match = regex.exec(html)) !== null) {
                results.push({
                    name: match[3],      // Başlık
                    url: match[1],       // Link
                    poster: match[2],    // Afiş
                    description: "Dizibox Sonucu"
                });
            }

            // Eğer regex sonuç bulamazsa, en azından boş dönmesin diye manuel bir girdi
            if (results.length === 0) {
                console.log("Diziyou: Otomatik ayıklama başarısız, ham sonuç deneniyor.");
                return [{
                    name: query + " için siteye git",
                    url: searchUrl,
                    poster: "https://www.dizibox.tv/favicon.ico"
                }];
            }

            return results;
        } catch (error) {
            console.log("Diziyou Arama Hatası: " + error.message);
            return [];
        }
    },

    // 2. YAYIN FONKSİYONU: Seçilen içeriğin video linklerini bulur
    getStreams: async function(url) {
        console.log("Diziyou: Yayınlar aranıyor -> " + url);
        
        try {
            const response = await fetch(url);
            const html = await response.text();
            
            const streams = [];
            // Sayfa içindeki 'iframe' veya 'source' etiketlerini arar
            const videoRegex = /<iframe[\s\S]*?src="(.*?)"/g;
            
            let match;
            while ((match = videoRegex.exec(html)) !== null) {
                let streamUrl = match[1];
                if (streamUrl.startsWith("//")) streamUrl = "https:" + streamUrl;
                
                streams.push({
                    name: "Kaynak: " + (streams.length + 1),
                    url: streamUrl,
                    quality: "HD",
                    need_proxy: false
                });
            }

            return streams;
        } catch (error) {
            console.log("Diziyou Yayın Hatası: " + error.message);
            return [];
        }
    }
};

// Uygulama motoruna eklentiyi tanıtıyoruz
if (typeof module !== 'undefined') {
    module.exports = scraper;
} else {
    globalThis.search = scraper.search;
    globalThis.getStreams = scraper.getStreams;
}

console.log("Diziyou Modülü Tam Sürüm Yüklendi!");
