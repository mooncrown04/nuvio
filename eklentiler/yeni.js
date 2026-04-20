const PROVIDER_NAME = "WatchBuddy_Core";
const BASE_URL = "https://stream.watchbuddy.tv";

function getStreams(args) {
    var tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;

    return new Promise(function(resolve) {
        if (!tmdbId) return resolve([]);

        // 1. TMDB'den isim al
        fetch("https://api.themoviedb.org/3/movie/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR")
        .then(res => res.json())
        .then(data => {
            var title = data.title || data.original_title;
            
            // 2. 410 hatası veren API yerine doğrudan arama sayfasına gidiyoruz
            // Ancak bu sefer Nuvio'yu tam bir tarayıcı gibi tanıtıyoruz
            return fetch(BASE_URL + "/search?q=" + encodeURIComponent(title), {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml",
                    "Referer": BASE_URL + "/"
                }
            });
        })
        .then(res => res.text())
        .then(html => {
            // 3. HTML içindeki JSON verisini arıyoruz. 
            // Paylaştığın örneklerdeki {"with":...} yapısı genellikle bir <script> içinde olur.
            var results = [];
            
            // JSON formatındaki tüm blokları yakalayan daha geniş bir Regex
            var jsonBlocks = html.match(/\{"with":\s*"[^"]+",.*?"result":\s*\{.*?\}/g);

            if (jsonBlocks) {
                jsonBlocks.forEach(block => {
                    try {
                        var parsed = JSON.parse(block);
                        if (parsed.result && parsed.result.url) {
                            results.push({
                                name: parsed.result.title || "Kaynak",
                                title: (parsed.result.title || "Video") + " [" + (parsed.result.year || "") + "]",
                                url: decodeURIComponent(parsed.result.url).replace(/\\/g, ""),
                                quality: "1080p",
                                poster: parsed.result.poster
                            });
                        }
                    } catch (e) {
                        // Eğer JSON tam değilse (parçalanamazsa) manuel regex dene
                        var urlMatch = block.match(/"url"\s*:\s*"([^"]+)"/);
                        if (urlMatch) {
                            results.push({
                                name: "WatchBuddy",
                                title: "Kaynak",
                                url: decodeURIComponent(urlMatch[1]).replace(/\\/g, ""),
                                quality: "1080p"
                            });
                        }
                    }
                });
            }

            console.error("[" + PROVIDER_NAME + "] HTML'den sökülen link: " + results.length);
            resolve(results);
        })
        .catch(e => {
            console.error("[" + PROVIDER_NAME + "] Hata: " + e.message);
            resolve([]);
        });
    });
}

globalThis.getStreams = getStreams;
