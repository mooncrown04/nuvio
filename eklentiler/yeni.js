/**
 * Nuvio Local Scraper - FilmciBaba (V31 - Nuvio Compatible)
 */

const config = {
    name: "FilmciBaba",
    baseUrl: "https://izle.plus",
    apiUrl: "https://api.themoviedb.org/3",
    apiKey: "500330721680edb6d5f7f12ba7cd9023",
    id: "999b5a3c-bb95-571e-bd12-f5778eaecbfe"
};

// Yardımcı Fonksiyonlar
const slugify = (text) => {
    const tr = {"ğ":"g","ü":"u","sh":"s","ı":"i","ö":"o","ç":"c","Ğ":"G","Ü":"U","Ş":"S","İ":"I","Ö":"O","Ç":"C"};
    return text.split('').map(c => tr[c] || c).join('').toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
};

const extractUrls = (text) => {
    const regex = /https?:\/\/[^"'\s]+\.(?:m3u8|mp4|ts)(?:\?[^"'\s]*)?/gi;
    return [...new Set(text.match(regex) || [])];
};

/**
 * Nuvio'nun ana giriş noktası
 * @param {Object} input - { imdbId, tmdbId, title, type, season, episode }
 */
async function getStreams(input) {
    try {
        const id = input.imdbId || input.tmdbId;
        if (!id) return [];

        // 1. TMDB üzerinden isim ve yıl çekme (Slug oluşturmak için)
        const tmdbUrl = `${config.apiUrl}/find/${id.startsWith('tt') ? id : 'tt'+id}?api_key=${config.apiKey}&external_source=imdb_id&language=tr-TR`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        const item = tmdbData.movie_results?.[0] || tmdbData.tv_results?.[0];
        
        if (!item) return [];

        const slug = slugify(item.title || item.name);
        const targetUrl = `${config.baseUrl}/${slug}/`;
        const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

        // 2. Ana sayfayı çek ve Hotstream linkini bul
        const res = await fetch(targetUrl, { headers: { 'User-Agent': ua } });
        const html = await res.text();
        const mainCookie = res.headers.get('set-cookie')?.split(';')[0] || "";

        const embedMatch = html.match(/https:\/\/hotstream\.club\/(?:embed|list)\/([a-zA-Z0-9]+)/i);
        if (!embedMatch) return [];

        const embedUrl = embedMatch[0];
        const embedId = embedMatch[1];

        // 3. Embed sayfasından session/link al
        const embedRes = await fetch(embedUrl, {
            headers: { 'User-Agent': ua, 'Referer': targetUrl, 'Cookie': mainCookie }
        });
        const embedCookie = embedRes.headers.get('set-cookie')?.split(';')[0] || "";
        const embedHtml = await embedRes.text();

        let results = [];

        // Önce sayfa içindeki direkt linkleri dene
        const directLinks = extractUrls(embedHtml);
        directLinks.forEach(link => {
            results.push({
                name: "FilmciBaba - HLS",
                url: link,
                headers: { 'User-Agent': ua, 'Referer': embedUrl, 'Cookie': embedCookie || mainCookie }
            });
        });

        // Eğer boşsa Hotstream API'ye POST at
        if (results.length === 0) {
            const apiRes = await fetch(`https://hotstream.club/api/source/${embedId}`, {
                method: 'POST',
                headers: {
                    'User-Agent': ua,
                    'Referer': embedUrl,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cookie': embedCookie || mainCookie
                }
            });

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
        }

        return results;

    } catch (e) {
        console.error("Nuvio Scraper Error: ", e);
        return [];
    }
}

// Nuvio'nun export yapısı
if (typeof module !== 'undefined') {
    module.exports = {
        getStreams,
        config
    };
}
