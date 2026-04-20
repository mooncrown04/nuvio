const PROVIDER_NAME = "WatchBuddy_V37_Interceptor";
const BASE_URL = "https://stream.watchbuddy.tv";

async function getStreams(args) {
    let tmdbId = (typeof args === 'object') ? (args.tmdbId || args.id) : args;
    if (!tmdbId) return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const data = await tmdbRes.json();
        const title = data.title;

        console.error(`[${PROVIDER_NAME}] Hedef Belirlendi: ${title}`);

        // Paylaştığın JS kodundaki 'protectionParams' listesini tetiklememek için
        // linklerimizi temiz ama kimlikli gönderiyoruz.
        const headers = {
            "User-Agent": "KekikStream/3.0",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": BASE_URL + "/"
        };

        const searchUrl = `${BASE_URL}/api/v1/search?q=${encodeURIComponent(title)}&type=movie`;
        const response = await fetch(searchUrl, { headers });
        const json = await response.json();
        let items = json.result || json.results || [];

        return items.map(item => {
            // KRİTİK: Senin JS kodundaki 'detectFormat' ve 'suggestInitialMode' 
            // fonksiyonlarını mutlu etmek için URL sonuna formatı zorla ekliyoruz.
            let streamUrl = `${BASE_URL}/izle/${item.provider}?url=${encodeURIComponent(item.url || item.path)}&format=hls`;
            
            // FULL modunu tetiklemek için sunucuya 'force_proxy' sinyali gönderiyoruz
            if (item.provider === 'SineWix' || item.provider === 'Dizipal') {
                streamUrl += "&force_proxy=1";
            }

            return {
                name: item.provider,
                title: `${item.title} [${item.provider}] (Tünelli)`,
                url: streamUrl,
                quality: "1080p",
                headers: headers
            };
        });

    } catch (e) {
        console.error(`[${PROVIDER_NAME}] Hata: ${e.message}`);
        // Fallback her zaman FULL modda çalışmalı
        return [{
            name: "WatchBuddy (Rescue Mode)",
            url: `${BASE_URL}/izle/SineWix?url=http://px-webservisler:2585/sinewix/movie/${tmdbId}&force_proxy=1&format=hls`,
            quality: "1080p",
            headers: { "User-Agent": "KekikStream/3.0" }
        }];
    }
}

globalThis.getStreams = getStreams;
