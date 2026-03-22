/**
 * Nuvio Local Scraper - FilmciBaba (V38 - Hotstream Key Injection)
 */

const config = {
    name: "FilmciBaba",
    baseUrl: "https://izle.plus",
    apiUrl: "https://api.themoviedb.org/3",
    apiKey: "500330721680edb6d5f7f12ba7cd9023",
    id: "999b5a3c-bb95-571e-bd12-f5778eaecbfe"
};

const slugify = (text) => {
    const tr = {"ğ":"g","ü":"u","sh":"s","ı":"i","ö":"o","ç":"c","Ğ":"G","Ü":"U","Ş":"S","İ":"I","Ö":"O","Ç":"C"};
    return text.split('').map(c => tr[c] || c).join('').toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
};

async function getStreams(input) {
    try {
        console.error("[FilmciBaba] >>> Scraper Baslatildi");
        let rawId = (typeof input === 'object') ? (input.imdbId || input.tmdbId || input.id) : input;
        if (!rawId) return [];

        const cleanId = rawId.toString().trim();
        let item = null;

        // 1. TMDB Aşaması
        if (cleanId.startsWith('tt')) {
            const res = await fetch(`${config.apiUrl}/find/${cleanId}?api_key=${config.apiKey}&external_source=imdb_id&language=tr-TR`);
            const data = await res.json();
            item = data.movie_results?.[0] || data.tv_results?.[0];
        } else {
            for (const type of ['movie', 'tv']) {
                const res = await fetch(`${config.apiUrl}/${type}/${cleanId}?api_key=${config.apiKey}&language=tr-TR`);
                if (res.ok) { item = await res.json(); break; }
            }
        }
        if (!item) return [];

        const slug = slugify(item.title || item.name);
        const targetUrl = `${config.baseUrl}/${slug}/`;
        const chromeUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        // 2. Ana Sayfa & Embed Linki
        const res = await fetch(targetUrl, { headers: { 'User-Agent': chromeUA } });
        const html = await res.text();
        const mainCookie = res.headers.get('set-cookie')?.split(';')[0] || "";

        const embedMatch = html.match(/https:\/\/hotstream\.club\/(?:embed|list)\/([a-zA-Z0-9]+)/i);
        if (!embedMatch) return [];

        const embedUrl = embedMatch[0];
        const embedId = embedMatch[1];
        console.error(`[FilmciBaba] Embed Sayfasi Analiz Ediliyor: ${embedId}`);

        // 3. Embed Sayfasından Gizli Key Çıkarma
        const embedRes = await fetch(embedUrl, {
            headers: { 'User-Agent': chromeUA, 'Referer': targetUrl, 'Cookie': mainCookie }
        });
        const embedHtml = await embedRes.text();
        const embedCookie = embedRes.headers.get('set-cookie')?.split(';')[0] || "";

        // Hotstream'in kullandığı yaygın key değişkenlerini tara
        const keyMatch = embedHtml.match(/key\s*[:=]\s*["']([^"']+)["']/i) || 
                         embedHtml.match(/hash\s*[:=]\s*["']([^"']+)["']/i) ||
                         embedHtml.match(/h\s*[:=]\s*["']([^"']+)["']/i);
        
        const secretKey = keyMatch ? keyMatch[1] : null;
        if (secretKey) console.error(`[FilmciBaba] Gizli Key Yakalandi: ${secretKey}`);

        // 4. API'ye "Key" ile POST Atma
        const apiHeaders = {
            'User-Agent': chromeUA,
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Referer': embedUrl,
            'Origin': 'https://hotstream.club',
            'Cookie': embedCookie || mainCookie
        };

        // Body'ye key ekle (eğer bulunduysa)
        let body = "r=" + encodeURIComponent(targetUrl);
        if (secretKey) body += "&h=" + encodeURIComponent(secretKey);

        const apiRes = await fetch(`https://hotstream.club/api/source/${embedId}`, {
            method: 'POST',
            headers: apiHeaders,
            body: body
        });

        let results = [];
        if (apiRes.ok) {
            const apiData = await apiRes.json();
            const sources = apiData.data || apiData.sources || [];
            
            sources.forEach(s => {
                results.push({
                    name: `FilmciBaba - ${s.label || 'HD'}`,
                    url: s.file,
                    headers: { 
                        'User-Agent': chromeUA, 
                        'Referer': 'https://hotstream.club/',
                        'Origin': 'https://hotstream.club'
                    }
                });
            });
        }

        console.error(`[FilmciBaba] Islem bitti. Bulunan: ${results.length}`);
        return results;

    } catch (e) {
        console.error(`[FilmciBaba] Kritik Hata: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') { module.exports = { getStreams, config }; }
