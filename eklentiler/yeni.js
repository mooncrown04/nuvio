/**
 * Nuvio Local Scraper - FilmciBaba (V33 - ID Fix & Deep Debug)
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
        
        // --- ID YAKALAMA MANTIĞINI GÜÇLENDİRDİK ---
        // Nuvio'nun farklı versiyonları farklı keyler gönderebilir, hepsini kontrol ediyoruz.
        let rawId = "";
        if (typeof input === 'object') {
            rawId = input.imdbId || input.imdb_id || input.tmdbId || input.tmdb_id || input.id;
        } else if (typeof input === 'string') {
            rawId = input;
        }

        if (!rawId) {
            // Eğer hala ID yoksa input'un tamamını logla ki ne geldiğini görelim
            console.error("[FilmciBaba] Hata: Gecerli bir ID bulunamadi. Gelen Input: " + JSON.stringify(input));
            return [];
        }

        const cleanId = rawId.toString().trim();
        console.error(`[FilmciBaba] Yakalanan ID: ${cleanId}`);

        // 1. TMDB Aşaması
        const finalImdbId = cleanId.startsWith('tt') ? cleanId : 'tt' + cleanId;
        const tmdbUrl = `${config.apiUrl}/find/${finalImdbId}?api_key=${config.apiKey}&external_source=imdb_id&language=tr-TR`;
        
        console.error(`[FilmciBaba] TMDB Sorgusu: ${tmdbUrl}`);
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        
        const item = tmdbData.movie_results?.[0] || tmdbData.tv_results?.[0];
        if (!item) {
            console.error(`[FilmciBaba] TMDB'de sonuc yok. ID: ${finalImdbId}`);
            return [];
        }

        const slug = slugify(item.title || item.name);
        const targetUrl = `${config.baseUrl}/${slug}/`;
        const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";

        console.error(`[FilmciBaba] Site Hedefi: ${targetUrl}`);

        // 2. Site Erişimi
        const res = await fetch(targetUrl, { headers: { 'User-Agent': ua } });
        const html = await res.text();
        const mainCookie = res.headers.get('set-cookie')?.split(';')[0] || "";

        // Embed bulma
        const embedMatch = html.match(/https:\/\/hotstream\.club\/(?:embed|list)\/([a-zA-Z0-9]+)/i);
        if (!embedMatch) {
            console.error("[FilmciBaba] Sayfada Hotstream linki bulunamadi!");
            return [];
        }

        const embedUrl = embedMatch[0];
        const embedId = embedMatch[1];
        console.error(`[FilmciBaba] Embed ID: ${embedId}`);

        // 3. Hotstream API POST Sorgusu (En sağlam yöntem)
        console.error("[FilmciBaba] API üzerinden kaynaklar sorgulanıyor...");
        const apiRes = await fetch(`https://hotstream.club/api/source/${embedId}`, {
            method: 'POST',
            headers: {
                'User-Agent': ua,
                'Referer': embedUrl,
                'X-Requested-With': 'XMLHttpRequest',
                'Cookie': mainCookie
            }
        });

        let results = [];
        if (apiRes.ok) {
            const apiData = await apiRes.json();
            if (apiData.data && Array.isArray(apiData.data)) {
                apiData.data.forEach(s => {
                    results.push({
                        name: `FilmciBaba - ${s.label || 'HD'}`,
                        url: s.file,
                        headers: { 
                            'User-Agent': ua, 
                            'Referer': 'https://hotstream.club/',
                            'Origin': 'https://hotstream.club'
                        }
                    });
                });
            }
        }

        console.error(`[FilmciBaba] Bitti. Bulunan Kaynak: ${results.length}`);
        return results;

    } catch (e) {
        console.error(`[FilmciBaba] Kritik Hata: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') {
    module.exports = { getStreams, config };
}
