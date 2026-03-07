const scraper = {
    search: async function(query) {
        // Gelen sorgu sadece sayıysa veya boşsa engelle
        if (!query || query.length < 2) return [];

        const searchUrl = `https://www.dizibox.tv/?s=${encodeURIComponent(query)}`;
        console.log("Diziyou: Arama yapılıyor -> " + searchUrl);

        try {
            const response = await fetch(searchUrl);
            if (!response.ok) throw new Error("Site yanıt vermedi");
            
            const html = await response.text();
            const results = [];
            
            // Daha geniş kapsamlı bir yakalama (Regex)
            const regex = /<div class="result-item">[\s\S]*?<a href="(http.*?)">[\s\S]*?<img src="(http.*?)" alt="(.*?)"/g;
            
            let match;
            while ((match = regex.exec(html)) !== null) {
                results.push({
                    name: match[3].trim(),
                    url: match[1],
                    poster: match[2],
                    description: "Dizibox Sonucu"
                });
            }

            // Eğer sonuç yoksa loga yaz ama hata fırlatma
            if (results.length === 0) console.log("Diziyou: Eşleşme bulunamadı.");
            return results;

        } catch (error) {
            console.log("Diziyou Kritik Hata: " + error.message);
            return [];
        }
    },

    getStreams: async function(url) {
        // Loglardaki "Expected URL scheme" hatasını önlemek için kontrol
        if (!url || typeof url !== 'string' || !url.startsWith('http')) {
            console.log("Diziyou: Geçersiz URL formatı reddedildi -> " + url);
            return [];
        }

        try {
            const response = await fetch(url);
            const html = await response.text();
            const streams = [];
            
            // Video linklerini ayıkla
            const videoRegex = /<iframe[\s\S]*?src="(.*?)"/g;
            let match;
            while ((match = videoRegex.exec(html)) !== null) {
                let streamUrl = match[1];
                if (streamUrl.startsWith("//")) streamUrl = "https:" + streamUrl;
                
                streams.push({
                    name: "Kaynak " + (streams.length + 1),
                    url: streamUrl,
                    quality: "HD"
                });
            }
            return streams;
        } catch (e) {
            return [];
        }
    }
};

// Modül Tanımlamaları
if (typeof module !== 'undefined') { module.exports = scraper; }
else { 
    globalThis.search = scraper.search; 
    globalThis.getStreams = scraper.getStreams; 
}
