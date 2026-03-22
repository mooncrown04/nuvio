/**
 * Nuvio Local Scraper - FilmciBaba (V37 - API Bypass & Deep HTML Scan)
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

        // TMDB Logic
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

        // 1. Ana Sayfa
        const res = await fetch(targetUrl, { headers: { 'User-Agent': chromeUA } });
        const html = await res.text();
        const mainCookie = res.headers.get('set-cookie')?.split(';')[0] || "";

        const embedMatch = html.match(/https:\/\/hotstream\.club\/(?:embed|list)\/([a-zA-Z0-9]+)/i);
        if (!embedMatch) return [];

        const embedUrl = embedMatch[0];
        console.error(`[FilmciBaba] Embed Sayfası Taranıyor: ${embedUrl}`);

        // 2. Embed Sayfasını Çek (API'ye sormadan önce sayfa içine bak)
        const embedRes = await fetch(embedUrl, {
            headers: { 'User-Agent': chromeUA, 'Referer': targetUrl, 'Cookie': mainCookie }
        });
        const embedHtml = await embedRes.text();
        const embedCookie = embedRes.headers.get('set-cookie')?.split(';')[0] || "";

        let results = [];

        // --- YÖNTEM A: HTML İÇİNDE GİZLİ M3U8 TARAMA ---
        // Bazı player'lar API kullanmaz, JSON objesi olarak sayfanın sonuna atar.
        const fileRegex = /file\s*:\s*["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/gi;
        let m;
        while ((m = fileRegex.exec(embedHtml)) !== null) {
            results.push({
                name: "FilmciBaba - HLS (Direct)",
                url: m[1],
                headers: { 'User-Agent': chromeUA, 'Referer': 'https://hotstream.club/' }
            });
        }

        // --- YÖNTEM B: BASE64 ŞİFRELİ LİNKLERİ ARA ---
        if (results.length === 0) {
            const b64Regex = /["']([A-Za-z0-9+/]{40,})={0,2}["']/g;
            const b64Matches = embedHtml.match(b64Regex) || [];
            b64Matches.forEach(match => {
                try {
                    const decoded = Buffer.from(match.replace(/["']/g, ''), 'base64').toString();
                    if (decoded.includes('.m3u8') || decoded.includes('.mp4')) {
                        const link = decoded.match(/https?:\/\/[^"']+/)?.[0];
                        if (link) {
                            results.push({ name: "FilmciBaba - HLS (Encoded)", url: link, headers: { 'User-Agent': chromeUA } });
                        }
                    }
                } catch(e) {}
            });
        }

        // --- YÖNTEM C: API YEDEK (Tekrar Dene ama Cookie ile) ---
        if (results.length === 0) {
            console.error("[FilmciBaba] HTML'de link yok, API son kez deneniyor...");
            const apiRes = await fetch(`https://hotstream.club/api/source/${embedMatch[1]}`, {
                method: 'POST',
                headers: {
                    'User-Agent': chromeUA,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': embedUrl,
                    'Cookie': embedCookie || mainCookie
                }
            });
            if (apiRes.ok) {
                const apiData = await apiRes.json();
                const sources = apiData.data || apiData.sources || [];
                sources.forEach(s => {
                    results.push({ name: `FilmciBaba - ${s.label || 'HD'}`, url: s.file, headers: { 'User-Agent': chromeUA, 'Referer': 'https://hotstream.club/' } });
                });
            }
        }

        console.error(`[FilmciBaba] Bitti. Bulunan: ${results.length}`);
        return results;

    } catch (e) {
        console.error(`[FilmciBaba] Hata: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') { module.exports = { getStreams, config }; }
