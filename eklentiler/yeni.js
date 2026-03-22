/**
 * Nuvio Local Scraper - FilmciBaba (V36 - Machine Identity & Header Spoofing)
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

        // TMDB ID Kontrolü (Önceki düzeltme)
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
        
        // --- MAKİNE KİMLİĞİ (HEADERS) ---
        // Android TV veya Windows fark etmeksizin en kararlı User-Agent
        const chromeUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        // 1. Ana Sayfadan Cookie Yakala
        const res = await fetch(targetUrl, { headers: { 'User-Agent': chromeUA } });
        const html = await res.text();
        const setCookie = res.headers.get('set-cookie');
        const sessionCookie = setCookie ? setCookie.split(';')[0] : "";

        // Embed Linki Yakala
        const embedMatch = html.match(/https:\/\/hotstream\.club\/(?:embed|list)\/([a-zA-Z0-9]+)/i);
        if (!embedMatch) return [];

        const embedFullUrl = embedMatch[0];
        const embedId = embedMatch[1];
        console.error(`[FilmciBaba] Makine Kimligiyle API Zorlaniyor: ${embedId}`);

        // 2. API Sorgusu (Tam Donanımlı Header Seti)
        const apiRes = await fetch(`https://hotstream.club/api/source/${embedId}`, {
            method: 'POST',
            headers: {
                'User-Agent': chromeUA,
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'tr-TR,tr;q=0.9',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': embedFullUrl,
                'Origin': 'https://hotstream.club',
                'Cookie': sessionCookie,
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin'
            }
        });

        let results = [];
        if (apiRes.ok) {
            const apiData = await apiRes.json();
            const sources = apiData.data || apiData.sources || [];
            
            if (sources.length > 0) {
                sources.forEach(s => {
                    results.push({
                        name: `FilmciBaba - ${s.label || 'HD'}`,
                        url: s.file,
                        headers: { 
                            'User-Agent': chromeUA, 
                            'Referer': 'https://hotstream.club/',
                            'Origin': 'https://hotstream.club',
                            'Cookie': sessionCookie
                        }
                    });
                });
            }
        }

        console.error(`[FilmciBaba] Islem bitti. Bulunan: ${results.length}`);
        return results;

    } catch (e) {
        console.error(`[FilmciBaba] Hata: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') {
    module.exports = { getStreams, config };
}
