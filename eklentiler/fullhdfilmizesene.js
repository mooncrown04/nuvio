var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// Sunucu güvenliğini aşmak için en kritik headerlar
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
};

// 1. Şifre Çözücü: Hem ROT13 hem Base64'ü aynı anda halleder
function decodeStep1(str) {
    try {
        var rot13 = str.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        return atob(rot13);
    } catch (e) { return null; }
}

// 2. Hex Çözücü: Cloudstream (Kotlin) dosyasındaki temizleme mantığı
function decodeStep2(hex) {
    try {
        var clean = hex.replace(/\\\\x/g, '').replace(/\\x/g, '');
        var res = '';
        for (var i = 0; i < clean.length; i += 2) {
            res += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
        }
        return res.replace(/\\/g, '').replace(/["']/g, "").trim();
    } catch (e) { return null; }
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    try {
        // Arama ve Sayfa Getirme adımları (Dosyandaki yapı)
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        
        const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(tmdbData.title)}`, { headers: HEADERS });
        const searchHtml = await searchRes.text();
        const moviePath = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
        
        if (!moviePath) return [];
        const movieUrl = moviePath[1].startsWith('http') ? moviePath[1] : BASE_URL + moviePath[1];

        const pageRes = await fetch(movieUrl, { headers: HEADERS });
        const pageHtml = await pageRes.text();

        // SCX verisini yakala
        const scxMatch = pageHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) return [];
        const scx = JSON.parse(scxMatch[1]);

        const streams = [];
        // Sitedeki tüm kaynaklar: Atom, Proton, Fast, Vidmoxy, TR, EN
        const keys = Object.keys(scx); 

        for (const key of keys) {
            if (!scx[key].sx || !scx[key].sx.t) continue;
            const links = Array.isArray(scx[key].sx.t) ? scx[key].sx.t : Object.values(scx[key].sx.t);

            for (const enc of links) {
                const step1Url = decodeStep1(enc);
                if (!step1Url) continue;

                // ESKİ KODUN HATASI BURADAYDI: Sadece step1Url'i ekliyordu.
                // ŞİMDİ: Eğer link bir iframe ise içine girip asıl videoyu hex'ten çözüyoruz.
                if (step1Url.includes('atom') || step1Url.includes('rapidvid') || step1Url.includes('vidmoxy')) {
                    const iframeRes = await fetch(step1Url, { headers: { 'Referer': movieUrl } });
                    const iframeHtml = await iframeRes.text();
                    const hexMatch = iframeHtml.match(/file["']:\s*["']([^"']+)["']/);

                    if (hexMatch) {
                        const finalVideoUrl = decodeStep2(hexMatch[1]);
                        streams.push({
                            name: `⌜ FHD ⌟ ${key.toUpperCase()}`,
                            url: finalVideoUrl,
                            type: 'VIDEO',
                            headers: { 'Referer': step1Url, 'User-Agent': HEADERS['User-Agent'] }
                        });
                    }
                } else {
                    // Proton, Fast gibi doğrudan çalışan kaynaklar
                    streams.push({
                        name: `⌜ FHD ⌟ ${key.toUpperCase()} (Direct)`,
                        url: step1Url,
                        type: step1Url.includes('m3u8') ? 'M3U8' : 'VIDEO',
                        headers: { 'Referer': movieUrl }
                    });
                }
            }
        }
        return streams;
    } catch (e) {
        return [];
    }
}
