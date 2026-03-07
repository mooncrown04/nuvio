/**
 * DDizi Provider - Nuvio/SineWix Version
 */
const DDizi = {
    mainUrl: "https://www.ddizi.im",
    name: "DDizi",

    // Başlıkları (Headers) hazırlayan yardımcı fonksiyon
    getHeaders: function(referer) {
        return {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
            'Referer': referer || this.mainUrl,
            'Accept': 'text/html,application/xhtml+xml,xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
        };
    },

    // Ana sayfa bölümleri
    getMainPage: async function() {
        const sections = [
            { name: "Son Eklenen Bölümler", url: `${this.mainUrl}/yeni-eklenenler1` },
            { name: "Yabancı Diziler", url: `${this.mainUrl}/yabanci-dizi-izle` },
            { name: "Yerli Diziler", url: this.mainUrl },
            { name: "Eski Diziler", url: `${this.mainUrl}/eski.diziler` }
        ];

        let homePage = [];

        for (const section of sections) {
            try {
                const response = await fetch(section.url, { headers: this.getHeaders() });
                const html = await response.text();
                
                // Regex ile basit veri çekme (Nuvio ortamında DOM parser her zaman olmayabilir)
                const items = this.parseList(html);
                if (items.length > 0) {
                    homePage.push({
                        title: section.name,
                        items: items.slice(0, 20)
                    });
                }
            } catch (e) {
                console.error(`DDizi Error (${section.name}):`, e);
            }
        }
        return homePage;
    },

    // Arama fonksiyonu
    search: async function(query) {
        const formData = new URLSearchParams();
        formData.append('arama', query);

        try {
            const response = await fetch(`${this.mainUrl}/arama/`, {
                method: 'POST',
                body: formData,
                headers: this.getHeaders()
            });
            const html = await response.text();
            return this.parseList(html);
        } catch (e) {
            return [];
        }
    },

    // Detay sayfası (Bölümleri listeleme)
    load: async function(url) {
        const response = await fetch(url, { headers: this.getHeaders() });
        const html = await response.text();

        // Poster ve Açıklama çekme (Regex)
        const poster = html.match(/class="afis"[\s\S]*?src="([^"]+)"/) || html.match(/img-back"[\s\S]*?src="([^"]+)"/);
        const description = html.match(/class="aciklama">([\s\S]*?)<\/div>/);

        // Bölüm listesi yakalama
        const episodes = [];
        const epRegex = /href="([^"]+)"[^>]*>([\s\S]*?Bölüm[\s\S]*?)<\/a>/gi;
        let match;

        while ((match = epRegex.exec(html)) !== null) {
            episodes.push({
                name: match[2].replace(/<[^>]*>/g, '').trim(),
                url: match[1].startsWith('http') ? match[1] : this.mainUrl + match[1]
            });
        }

        return {
            title: "Dizi Detay", // Opsiyonel: HTML'den çekilebilir
            poster: poster ? poster[1] : "",
            description: description ? description[1].trim() : "",
            episodes: episodes.reverse() // Genelde eskiden yeniye sıralanır
        };
    },

    // Video linklerini yakalama
    getStreams: async function(url) {
        const response = await fetch(url, { headers: this.getHeaders() });
        const html = await response.text();
        let streams = [];

        // 1. YouTube Iframe kontrolü (Kotlin kodundaki mantık)
        const youtubeMatch = html.match(/iframe[\s\S]*?src="([^"]*youtube[^"]*id=([^"&]+)[^"]*)"/i);
        if (youtubeMatch) {
            streams.push({
                name: "YouTube Kaynağı",
                url: decodeURIComponent(youtubeMatch[2]),
                quality: "Direct",
                needExtractor: true
            });
        }

        // 2. og:video (JWPlayer) kontrolü
        const ogVideo = html.match(/property="og:video"[\s\S]*?content="([^"]+)"/);
        if (ogVideo) {
            const playerRes = await fetch(ogVideo[1], { headers: this.getHeaders(url) });
            const playerHtml = await playerRes.text();
            
            const fileMatch = playerHtml.match(/file:\s*["']([^"']+)["']/);
            if (fileMatch) {
                streams.push({
                    name: "DDizi - Internal",
                    url: fileMatch[1],
                    quality: "720p",
                    headers: { "Referer": ogVideo[1] }
                });
            }
        }

        return streams;
    },

    // Yardımcı: HTML içinden dizi listesi çıkarma
    parseList: function(html) {
        const results = [];
        const regex = /class="(?:dizi-boxpost|dizi-boxpost-cat)"[\s\S]*?href="([^"]+)"[\s\S]*?src="([^"]+)"[\s\S]*?title="([^"]+)"/gi;
        let match;

        while ((match = regex.exec(html)) !== null) {
            results.push({
                title: match[3],
                url: match[1].startsWith('http') ? match[1] : this.mainUrl + match[1],
                poster: match[2]
            });
        }
        return results;
    }
};

// Modül export (Nuvio gereksinimi)
if (typeof module !== 'undefined') {
    module.exports = DDizi;
}
