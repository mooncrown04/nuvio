/**
 * Nuvio Local Scraper - FilmciBaba (V34 - TMDB ID Logic Fix)
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
        
        let rawId = "";
        if (typeof input === 'object') {
            rawId = input.imdbId || input.tmdbId || input.id;
        } else {
            rawId = input;
        }

        if (!rawId) {
            console.error("[FilmciBaba] Hata: ID yok.");
            return [];
        }

        const cleanId = rawId.toString().trim();
        let item = null;

        // --- TMDB AKILLI SORGU MANTIĞI ---
        if (cleanId.startsWith('tt')) {
            // IMDB ID ise 'find' kullan
            console.error(`[FilmciBaba] IMDB ID ile araniyor: ${cleanId}`);
            const res = await fetch(`${config.apiUrl}/find/${cleanId}?api_key=${config.apiKey}&external_source=imdb_id&language=tr-TR`);
            const data = await res.json();
            item = data.movie_results?.[0] || data.tv_results?.[0];
        } else {
            // Sayısal ID (TMDB ID) ise doğrudan movie/tv olarak dene
            console.error(`[FilmciBaba] TMDB ID ile araniyor: ${cleanId}`);
            for (const type of ['movie', 'tv']) {
                const res = await fetch(`${config.apiUrl}/${type}/${cleanId}?api_key=${config.apiKey}&language=tr-TR`);
                if (res.ok) {
                    item = await res.json();
                    break;
                }
            }
        }

        if (!item) {
            console.error("[FilmciBaba] TMDB'de icerik bulunamadi.");
            return [];
        }

        const title = item.title || item.name;
        const slug = slugify(title);
        const targetUrl = `${config.baseUrl}/${slug}/`;
        const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

        console.error(`[FilmciBaba] Bulunan: ${title} -> Hedef: ${targetUrl}`);

        const res = await fetch(targetUrl, { headers: { 'User-Agent': ua } });
        if (!res.ok) return [];

        const html = await res.text();
        const mainCookie = res.headers.get('set-cookie')?.split(';')[0] || "";

        const embedMatch = html.match(/https:\/\/hotstream\.club\/(?:embed|list)\/([a-zA-Z0-9]+)/i);
        if (!embedMatch) {
            console.error("[FilmciBaba] Embed linki yok.");
            return [];
        }

        const embedId = embedMatch[1];
        console.error(`[FilmciBaba] Kaynak cekiliyor (ID: ${embedId})...`);

        const apiRes = await fetch(`https://hotstream.club/api/source/${embedId}`, {
            method: 'POST',
            headers: {
                'User-Agent': ua,
                'Referer': embedMatch[0],
                'X-Requested-With': 'XMLHttpRequest',
                'Cookie': mainCookie
            }
        });

        let results = [];
        if (apiRes.ok) {
            const apiData = await apiRes.json();
            if (apiData.data) {
                apiData.data.forEach(s => {
                    results.push({
                        name: `FilmciBaba - ${s.label || 'HD'}`,
                        url: s.file,
                        headers: { 'User-Agent': ua, 'Referer': 'https://hotstream.club/' }
                    });
                });
            }
        }

        console.error(`[FilmciBaba] Bitti. Kaynak sayisi: ${results.length}`);
        return results;

    } catch (e) {
        console.error(`[FilmciBaba] Hata: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') {
    module.exports = { getStreams, config };
}
