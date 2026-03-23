/**
 * Nuvio Local Scraper - FilmciBaba (V44 - WatchBuddy List & Export Fix)
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

        var cleanId = rawId.toString().trim();
        var item = null;

        // 1. TMDB Sorgusu
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

        // 2. Slug & Siteye Giriş
        var title = item.title || item.name;
        var slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        var targetUrl = config.baseUrl + "/" + slug + "/";
        var deviceUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

        var res = await fetch(targetUrl, { headers: { 'User-Agent': deviceUA } });
        var html = await res.text();

        // 3. Hotstream Linkini Yakalama (WatchBuddy'nin bulduğu o yapı)
        // Regex'i hem list hem embed için çok genişlettik
        var hotstreamRegex = /https?:\/\/hotstream\.club\/(?:embed|list|v|player)\/([a-zA-Z0-9+/=_-]+)/gi;
        var results = [];
        var match;

        while ((match = hotstreamRegex.exec(html)) !== null) {
            var foundId = match[1];
            // WatchBuddy loglarındaki asıl oynatıcı linkine çeviriyoruz
            var finalUrl = "https://hotstream.club/list/" + foundId;

            results.push({
                name: "HotStream (HB-V2)",
                url: finalUrl,
                headers: { 
                    'User-Agent': deviceUA,
                    'Referer': "https://hotstream.club/embed/" + foundId,
                    'Origin': 'https://hotstream.club'
                }
            });
        }

        // 4. Eğer Regex patlarsa HTML içinde m3u8 ara
        if (results.length === 0) {
            var m3u8Links = html.match(/https?:\/\/[^"']+\.m3u8[^"']*/gi) || [];
            m3u8Links.forEach(function(link) {
                results.push({ name: "FilmciBaba (Direct)", url: link, headers: { 'User-Agent': deviceUA } });
            });
        }

        console.error("[FilmciBaba] Bitti. Bulunan: " + results.length);
        return results;

    } catch (e) {
        console.error("[FilmciBaba] Hata: " + e.message);
        return [];
    }
}

// Nuvio'nun "function not found" hatası vermemesi için hem global hem module seviyesinde export ediyoruz
globalThis.getStreams = getStreams;
if (typeof module !== 'undefined') { module.exports = { getStreams, config }; }
