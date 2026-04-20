const PROVIDER_NAME = "WatchBuddy_V45_Final_Logic";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    // 1. ADIM: Argüman Kontrolü (Hatasız işleme için şart)
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    if (!tmdbId) return [];

    try {
        // 2. ADIM: Sunucuya "Ben geldim" mesajı (Header'lı arama)
        // Burada 'fetch' düzgün işleniyor mu? Evet, 'Film: Katil Makine' logunu gördük.
        var searchUrl = BASE_URL + "/api/v1/search?q=" + tmdbId + "&type=movie";
        
        var response = await fetch(searchUrl, {
            headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
        });

        var json = await response.json();
        var items = json.result || json.results || [];

        // 3. ADIM: Link Paketleme (Player'ın en sevdiği format)
        // Eğer arama boşsa bile eklenti çökmez, 'catch' bloğuna atlar.
        if (items.length === 0) throw new Error("RedirectToTunnel");

        return items.map(function(item) {
            return {
                name: item.provider,
                title: item.title,
                url: BASE_URL + "/proxy/video?url=" + encodeURIComponent(item.url) + "&force_proxy=1",
                headers: { "User-Agent": "Mozilla/5.0" } // Player'a teslim edilen anahtar
            };
        });

    } catch (e) {
        // 4. ADIM: Güvenli Liman (Tünel)
        // Kod buraya düşüyorsa yapısal bir bozukluk yok, sunucuda sonuç yoktur.
        return [{
            name: "WatchBuddy (Direct)",
            url: BASE_URL + "/izle/SineWix?url=" + encodeURIComponent("http://px-webservisler:2585/sinewix/movie/" + tmdbId) + "&force_proxy=1",
            headers: { "User-Agent": "Mozilla/5.0" }
        }];
    }
}

globalThis.getStreams = getStreams;
