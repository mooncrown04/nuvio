/**
 * Nuvio Local Scraper - FilmciBaba (V32 - Debug Mode & Nuvio Compatible)
 */

const config = {
    name: "FilmciBaba",
    baseUrl: "https://izle.plus",
    apiUrl: "https://api.themoviedb.org/3",
    apiKey: "500330721680edb6d5f7f12ba7cd9023",
    id: "999b5a3c-bb95-571e-bd12-f5778eaecbfe"
};

// --- Yardımcı Araçlar ---
const slugify = (text) => {
    const tr = {"ğ":"g","ü":"u","sh":"s","ı":"i","ö":"o","ç":"c","Ğ":"G","Ü":"U","Ş":"S","İ":"I","Ö":"O","Ç":"C"};
    return text.split('').map(c => tr[c] || c).join('').toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
};

const extractUrls = (text) => {
    const regex = /https?:\/\/[^"'\s]+\.(?:m3u8|mp4|ts)(?:\?[^"'\s]*)?/gi;
    return [...new Set(text.match(regex) || [])];
};

// --- Ana Fonksiyon ---
async function getStreams(input) {
    try {
        console.error("[FilmciBaba] >>> Scraper Baslatildi");
        const id = input.imdbId || input.tmdbId;
        if (!id) {
            console.error("[FilmciBaba] Hata: IMDB/TMDB ID bulunamadi");
            return [];
        }

        // 1. TMDB Aşaması
        console.error(`[FilmciBaba] TMDB Sorgusu yapiliyor: ${id}`);
        const tmdbUrl = `${config.apiUrl}/find/${id.startsWith('tt') ? id : 'tt'+id}?api_key=${config.apiKey}&external_source=imdb_id&language=tr-TR`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        const item = tmdbData.movie_results?.[0] || tmdbData.tv_results?.[0];
        
        if (!item) {
            console.error("[FilmciBaba] Hata: TMDB'de icerik karsiligi bulunamadi");
            return [];
        }

        const title = item.title || item.name;
        const slug = slugify(title);
        const targetUrl = `${config.baseUrl}/${slug}/`;
        const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

        console.error(`[FilmciBaba] Hedef URL: ${targetUrl}`);

        // 2. Ana Site ve Cookie Aşaması
        const res = await fetch(targetUrl, { headers: { 'User-Agent': ua } });
        if (!res.ok) {
            console.error(`[FilmciBaba] Siteye ulasilamadi: HTTP ${res.status}`);
            return [];
        }

        const html = await res.text();
        const mainCookie = res.headers.get('set-cookie')?.split(';')[0] || "";
        console.error(`[FilmciBaba] Ana Site Cookie: ${mainCookie ? "Alindi" : "Yok"}`);

        // Hotstream embed ID yakalama
        const embedMatch = html.match(/https:\/\/hotstream\.club\/(?:embed|list)\/([a-zA-Z0-9]+)/i);
        if (!embedMatch) {
            console.error("[FilmciBaba] Hotstream Embed linki bulunamadi. Kaynak kod degismis olabilir.");
            return [];
        }

        const embedUrl = embedMatch[0];
        const embedId = embedMatch[1];
        console.error(`[FilmciBaba] Embed Bulundu: ${embedUrl} (ID: ${embedId})`);

        // 3. Embed Sayfası Aşaması
        console.error("[FilmciBaba] Embed sayfasi cekiliyor...");
        const embedRes = await fetch(embedUrl, {
            headers: { 'User-Agent': ua, 'Referer': targetUrl, 'Cookie': mainCookie }
        });
        const embedCookie = embedRes.headers.get('set-cookie')?.split(';')[0] || "";
        const embedHtml = await embedRes.text();

        let results = [];

        // Direkt link taraması
        const directLinks = extractUrls(embedHtml);
        if (directLinks.length > 0) {
            console.error(`[FilmciBaba] ${directLinks.length} adet direkt link yakalandi.`);
            directLinks.forEach(link => {
                results.push({
                    name: "FilmciBaba - HLS",
                    url: link,
                    headers: { 'User-Agent': ua, 'Referer': embedUrl, 'Cookie': embedCookie || mainCookie }
                });
            });
        }

        // 4. Hotstream API Aşaması (Eğer direkt link yoksa)
        if (results.length === 0) {
            console.error("[FilmciBaba] Direkt link yok, API sorgusu deneniyor...");
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
                if (apiData.data && apiData.data.length > 0) {
                    console.error(`[FilmciBaba] API üzerinden ${apiData.data.length} kaynak bulundu.`);
                    apiData.data.forEach(s => {
                        results.push({
                            name: `FilmciBaba - ${s.label || 'HD'}`,
                            url: s.file,
                            headers: { 'User-Agent': ua, 'Referer': 'https://hotstream.club/' }
                        });
                    });
                } else {
                    console.error("[FilmciBaba] API bos dondu.");
                }
            } else {
                console.error(`[FilmciBaba] API Hatasi: HTTP ${apiRes.status}`);
            }
        }

        console.error(`[FilmciBaba] <<< Islem Tamamlandi. Toplam Stream: ${results.length}`);
        return results;

    } catch (e) {
        console.error(`[FilmciBaba] CRITICAL ERROR: ${e.message}`);
        console.error(e.stack);
        return [];
    }
}

// Nuvio Export
if (typeof module !== 'undefined') {
    module.exports = { getStreams, config };
}
