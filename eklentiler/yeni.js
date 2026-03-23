/**
 * Nuvio Local Scraper - FilmciBaba (V41 - Hotstream HTML-Response Fix)
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

        // 1. Ana Sayfa
        const res = await fetch(targetUrl, { headers: { 'User-Agent': chromeUA } });
        const html = await res.text();
        const embedMatch = html.match(/https:\/\/hotstream\.club\/(?:embed|list)\/([a-zA-Z0-9]+)/i);
        if (!embedMatch) return [];

        const embedUrl = embedMatch[0];
        const embedId = embedMatch[1];

        // 2. Embed Sayfası & Key Avı
        const embedRes = await fetch(embedUrl, {
            headers: { 'User-Agent': chromeUA, 'Referer': targetUrl }
        });
        const embedHtml = await embedRes.text();
        const keyMatch = embedHtml.match(/key\s*[:=]\s*["']([^"']+)["']/i);
        const secretKey = keyMatch ? keyMatch[1] : "";

        console.error(`[FilmciBaba] API Sorgusu Hazirlaniyor: ${embedId}`);

        // 3. API POST (Form-Data ve Doğru Parametreler)
        const params = new URLSearchParams();
        params.append('r', targetUrl);
        params.append('d', 'hotstream.club');
        if (secretKey) params.append('key', secretKey);

        const apiRes = await fetch(`https://hotstream.club/api/source/${embedId}`, {
            method: 'POST',
            headers: {
                'User-Agent': chromeUA,
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': embedUrl,
                'Origin': 'https://hotstream.club'
            },
            body: params.toString()
        });

        let results = [];
        // JSON hatasını önlemek için güvenli parse
        const responseText = await apiRes.text();
        try {
            const apiData = JSON.parse(responseText);
            const sources = apiData.data || apiData.sources || [];
            sources.forEach(s => {
                results.push({
                    name: `FilmciBaba - ${s.label || 'HD'}`,
                    url: s.file,
                    headers: { 'User-Agent': chromeUA, 'Referer': 'https://hotstream.club/' }
                });
            });
        } catch (e) {
            console.error("[FilmciBaba] API JSON donmedi, HTML taraniyor...");
            // Yedek: HTML içinden direkt m3u8 ayıkla
            const m3u8Match = responseText.match(/https?:\/\/[^"']+\.m3u8[^"']*/gi);
            if (m3u8Match) {
                m3u8Match.forEach(link => {
                    results.push({ name: "FilmciBaba (Fallback)", url: link, headers: { 'User-Agent': chromeUA } });
                });
            }
        }

        console.error(`[FilmciBaba] Bitti. Kaynak: ${results.length}`);
        return results;

    } catch (e) {
        console.error(`[FilmciBaba] Hata: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') { module.exports = { getStreams, config }; }
