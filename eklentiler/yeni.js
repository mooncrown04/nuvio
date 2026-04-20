const PROVIDER_NAME = "WatchBuddy_V28_422Fix";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    // 422 hatasını önlemek için veriyi Pydantic'in beklediği tipe zorluyoruz
    let tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    if (!tmdbId) return [];

    try {
        // 1. TMDB'den ham veriyi al (Yıl ve Tip bilgisi için şart)
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const data = await tmdbRes.json();
        
        const title = data.title || data.original_title;
        const year = data.release_date ? data.release_date.split('-')[0] : "";

        // 2. KRİTİK: Sunucunun 422 dönmemesi için beklediği 'Schema' yapısı
        // Paylaştığın kodlarda 'type' ve 'q' parametreleri JSON veya Query olarak bekleniyor.
        const searchParams = new URLSearchParams({
            "q": title,
            "type": "movie", // Sunucu 'movie' veya 'tv' ayrımı bekliyor olabilir
            "tmdb": tmdbId.toString(),
            "year": year
        });

        const searchUrl = `${BASE_URL}/api/v1/search?${searchParams.toString()}`;
        console.error(`[${PROVIDER_NAME}] Gönderilen Veri: ${searchUrl}`);

        const response = await fetch(searchUrl, {
            method: 'GET', // Sunucu Middleware'i GET, POST ve Form deniyor
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                "X-Requested-With": "XMLHttpRequest",
                "Accept": "application/json"
            }
        });

        // Eğer hala 422 alıyorsak, sunucu veriyi JSON gövdesinde (Body) bekliyor demektir
        if (response.status === 422) {
            console.error(`[${PROVIDER_NAME}] 422 Hatası: POST/JSON denemesi yapılıyor...`);
            const postResponse = await fetch(`${BASE_URL}/api/v1/search`, {
                method: 'POST',
                headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
                body: JSON.stringify({ "q": title, "type": "movie", "id": tmdbId })
            });
            const postJson = await postResponse.json();
            return processItems(postJson.result || postJson.results || [], title);
        }

        const json = await response.json();
        return processItems(json.result || json.results || [], title);

    } catch (e) {
        // 422 alırsak veya çökerse 'px-webservisler' üzerinden manuel tünel aç
        return [{
            name: "SineWix (Manual Tunnel)",
            url: `${BASE_URL}/izle/SineWix?url=http://px-webservisler:2585/sinewix/movie/${tmdbId}`,
            quality: "1080p"
        }];
    }
}

// Sonuçları işleme fonksiyonu
function processItems(items, title) {
    return items.map(item => ({
        name: item.provider,
        title: `${item.title} [${item.provider}]`,
        url: `${BASE_URL}/izle/${item.provider}?url=${encodeURIComponent(item.url)}&baslik=${encodeURIComponent(title)}`,
        quality: "1080p"
    }));
}

globalThis.getStreams = getStreams;
