/**
 * Nuvio Local Scraper - FilmciBaba (V43 - Hotstream List Method)
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

        // 1. TMDB Aşaması (Aynı kalıyor)
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

        const slug = slugify(item.title || item.name);
        const targetUrl = `${config.baseUrl}/${slug}/`;
        const chromeUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        // 2. Ana Sayfadan Embed URL Yakala
        const res = await fetch(targetUrl, { headers: { 'User-Agent': chromeUA } });
        const html = await res.text();
        const embedMatch = html.match(/https:\/\/hotstream\.club\/(?:embed|list)\/([a-zA-Z0-9]+)/i);
        if (!embedMatch) return [];

        const embedId = embedMatch[1];
        const embedFullUrl = `https://hotstream.club/embed/${embedId}`;

        // 3. Embed Sayfasını Çek ve İçindeki "/list/" Linkini Bul
        const embedRes = await fetch(embedFullUrl, {
            headers: { 'User-Agent': chromeUA, 'Referer': targetUrl }
        });
        const embedHtml = await embedRes.text();

        // PAYLAŞTIĞIN LOGLARDAKİ ŞİFRELİ LİSTEYİ BULAN REGEX
        const listMatch = embedHtml.match(/\/list\/([a-zA-Z0-9+/=]+)/i);
        
        let results = [];

        if (listMatch) {
            const listUrl = `https://hotstream.club/list/${listMatch[1]}`;
            console.error(`[FilmciBaba] HotStream List Yakalandı: ${listUrl.substring(0, 50)}...`);

            // Bu link direkt m3u8 playlistidir veya json döner
            results.push({
                name: "HotStream (Auto)",
                url: listUrl,
                headers: { 
                    'User-Agent': chromeUA, 
                    'Referer': embedFullUrl 
                }
            });
        }

        // --- YEDEK: EĞER LİST YOKSA ESKİ USUL M3U8 ARA ---
        if (results.length === 0) {
            const m3u8Match = embedHtml.match(/https?:\/\/[^"']+\.m3u8[^"']*/gi);
            if (m3u8Match) {
                m3u8Match.forEach(link => {
                    results.push({ name: "FilmciBaba (Direct)", url: link, headers: { 'User-Agent': chromeUA, 'Referer': embedFullUrl } });
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
