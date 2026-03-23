/**
 * Nuvio Local Scraper - FilmciBaba (V48 - Auth Persistence)
 */

var config = {
    name: "FilmciBaba",
    baseUrl: "https://izle.plus",
    apiUrl: "https://api.themoviedb.org/3",
    apiKey: "500330721680edb6d5f7f12ba7cd9023",
    id: "999b5a3c-bb95-571e-bd12-f5778eaecbfe"
};

async function getStreams(input) {
    try {
        console.error("[FilmciBaba] >>> Scraper Baslatildi");
        var rawId = (typeof input === 'object') ? (input.imdbId || input.tmdbId || input.id) : input;
        if (!rawId) return [];

        // 1. TMDB ve Slug Hazırlığı
        var cleanId = rawId.toString().trim();
        var item = null;
        if (cleanId.startsWith('tt')) {
            var res = await fetch(config.apiUrl + "/find/" + cleanId + "?api_key=" + config.apiKey + "&external_source=imdb_id&language=tr-TR");
            var data = await res.json();
            item = data.movie_results?.[0] || data.tv_results?.[0];
        } else {
            var types = ['movie', 'tv'];
            for (var i = 0; i < types.length; i++) {
                var res = await fetch(config.apiUrl + "/" + types[i] + "/" + cleanId + "?api_key=" + config.apiKey + "&language=tr-TR");
                if (res.ok) { item = await res.json(); break; }
            }
        }
        if (!item) return [];

        var slug = (item.title || item.name).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        var targetUrl = config.baseUrl + "/" + slug + "/";
        var deviceUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        // 2. İlk İstek ve Çerez Yönetimi
        var initRes = await fetch(targetUrl, { headers: { 'User-Agent': deviceUA } });
        var html = await initRes.text();
        var cookies = initRes.headers.get('set-cookie') || "";

        // 3. Hotstream Linkini Çek
        var hotstreamRegex = /https?:\/\/hotstream\.club\/(?:embed|list|v|player)\/([a-zA-Z0-9+/=_-]+)/gi;
        var results = [];
        var match;

        while ((match = hotstreamRegex.exec(html)) !== null) {
            var foundId = match[1];
            var embedUrl = "https://hotstream.club/embed/" + foundId;
            var listUrl = "https://hotstream.club/list/" + foundId;

            // 4. KRİTİK: Player 404 almasın diye sessiz bir 'check' yapıyoruz
            // Bu adım Hotstream sunucusuna "ben bu videoyu izleyeceğim, kapıyı aç" der.
            await fetch(embedUrl, {
                headers: {
                    'User-Agent': deviceUA,
                    'Referer': targetUrl,
                    'Cookie': cookies
                }
            });

            results.push({
                name: "HotStream (HB-V4-Fixed)",
                url: listUrl,
                headers: { 
                    'User-Agent': deviceUA,
                    'Referer': embedUrl,
                    'Origin': 'https://hotstream.club',
                    'Cookie': cookies, // Bazı sistemlerde çerez şart
                    'X-Requested-With': 'com.google.android.youtube' // Gizli bir tag
                }
            });
        }

        console.error("[FilmciBaba] Bitti. Bulunan: " + results.length);
        return results;

    } catch (e) {
        console.error("[FilmciBaba] Hata: " + e.message);
        return [];
    }
}

globalThis.getStreams = getStreams;
if (typeof module !== 'undefined') { module.exports = { getStreams, config }; }
