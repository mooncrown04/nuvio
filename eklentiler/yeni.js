/**
 * Nuvio Local Scraper - FilmciBaba (V40 - Final Deep Dive)
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

        // 1. TMDB & Slug Aşaması (Stabil)
        const cleanId = rawId.toString().trim();
        let item = null;
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

        const title = item.title || item.name;
        const slug = slugify(title);
        const targetUrl = `${config.baseUrl}/${slug}/`;
        const chromeUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        // 2. Sayfa ve Embed Yakalama
        const res = await fetch(targetUrl, { headers: { 'User-Agent': chromeUA } });
        const html = await res.text();
        const mainCookie = res.headers.get('set-cookie')?.split(';')[0] || "";

        const embedMatch = html.match(/https:\/\/hotstream\.club\/(?:embed|list)\/([a-zA-Z0-9]+)/i);
        if (!embedMatch) return [];

        const embedUrl = embedMatch[0];
        const embedId = embedMatch[1];

        // 3. Embed Sayfasından Key ve Token Avı
        const embedRes = await fetch(embedUrl, {
            headers: { 'User-Agent': chromeUA, 'Referer': targetUrl, 'Cookie': mainCookie }
        });
        const embedHtml = await embedRes.text();
        const embedCookie = embedRes.headers.get('set-cookie')?.split(';')[0] || "";

        const key = (embedHtml.match(/key\s*[:=]\s*["']([^"']+)["']/i) || [])[1];
        
        // 4. API SİMGESEL SALDIRI (JSON Formatı Denemesi)
        console.error(`[FilmciBaba] API Sorgusu Atiliyor (ID: ${embedId})`);

        const apiResponse = await fetch(`https://hotstream.club/api/source/${embedId}`, {
            method: 'POST',
            headers: {
                'User-Agent': chromeUA,
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': embedUrl,
                'Content-Type': 'application/json', // Bu sefer JSON deniyoruz
                'Cookie': embedCookie || mainCookie
            },
            body: JSON.stringify({
                r: btoa(targetUrl), // Referer'ı Base64 yapma ihtimali
                key: key,
                d: "hotstream.club"
            })
        });

        let results = [];
        const apiData = await apiResponse.json().catch(() => ({}));
        const sources = apiData.data || apiData.sources || [];

        if (sources.length > 0) {
            sources.forEach(s => {
                results.push({
                    name: `FilmciBaba - ${s.label || 'HD'}`,
                    url: s.file,
                    headers: { 'User-Agent': chromeUA, 'Referer': 'https://hotstream.club/' }
                });
            });
        }

        // 5. SON ÇARE: JAVASCRIPT VARİABLE TARAMASI (Regex++ )
        if (results.length === 0) {
            console.error("[FilmciBaba] API başarısız, derin tarama yapılıyor...");
            
            // Packed JavaScript (p,a,c,k,e,d) veya düz m3u8 linklerini tara
            const deepRegex = /(https?:\/\/[^"']+\.m3u8[^"']*|https?:\/\/[^"']+\.mp4[^"']*)/gi;
            const matches = embedHtml.match(deepRegex) || [];
            
            matches.forEach(link => {
                if (!link.includes('themoviedb') && !link.includes('hotstream.club/embed')) {
                    results.push({
                        name: "FilmciBaba - HLS (Deep)",
                        url: link,
                        headers: { 'User-Agent': chromeUA, 'Referer': 'https://hotstream.club/' }
                    });
                }
            });
        }

        console.error(`[FilmciBaba] Tamamlandı. Bulunan: ${results.length}`);
        return results;

    } catch (e) {
        console.error(`[FilmciBaba] Hata: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') { module.exports = { getStreams, config }; }
