/**
 * JetFilmizle — Nuvio Provider (Titan-Hunter)
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

function titleToSlug(t) {
    return (t || '').toLowerCase().trim()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

async function getStreams(id, mediaType, season, episode) {
    console.error('[JetFilm-Debug] Titan-Hunter Devrede: S' + season + ' E' + episode);
    
    try {
        var tmdbId = id.toString().replace(/[^0-9]/g, '');
        var type = (mediaType === 'tv') ? 'tv' : 'movie';

        const tmdbRes = await fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR');
        const info = await tmdbRes.json();
        const slug = titleToSlug(info.name || info.title);
        const finalUrl = BASE_URL + '/' + (mediaType === 'tv' ? 'dizi' : 'film') + '/' + slug;

        const pageRes = await fetch(finalUrl, { headers: HEADERS });
        const html = await pageRes.text();
        
        var streams = [];

        // 1. ADIM: Sayfadaki tüm scriptleri ve değişkenleri süpür
        // Jetfilm linkleri bazen 'var video_sources = [...]' içinde şifreli tutar.
        const sourcePatterns = [
            /["']?file["']?\s*:\s*["']([^"']+)["']/gi,
            /["']?link["']?\s*:\s*["']([^"']+)["']/gi,
            /["']?source["']?\s*:\s*["']([^"']+)["']/gi
        ];

        sourcePatterns.forEach(pattern => {
            let m;
            while ((m = pattern.exec(html)) !== null) {
                let u = m[1].replace(/\\/g, '');
                if ((u.includes('titan') || u.includes('jetv') || u.includes('vcdn')) && !u.includes('youtube')) {
                    if (!streams.some(s => s.url === u)) {
                        streams.push({ name: "JetFilmizle", title: "⌜ Titan HD ⌟", url: u.startsWith('//') ? 'https:' + u : u, type: "embed" });
                    }
                }
            }
        });

        // 2. ADIM: Titan Player'ın bilinen API yapısını "Force" et
        // Bazı Jetfilm versiyonları /p/ veya /v/ klasörünü kullanır.
        var postIDM = html.match(/post_id\s*:\s*(\d+)/) || html.match(/id="film_id" value="(\d+)"/);
        if (postIDM && streams.length === 0) {
            let pid = postIDM[1];
            console.error('[JetFilm-Debug] Post ID ile Manuel Tarama: ' + pid);
            
            // Jetfilm'in kullandığı muhtemel player endpointleri
            const possibleEndpoints = [
                `${BASE_URL}/wp-json/titan/v1/get-source?id=${pid}&s=${season}&e=${episode}`,
                `${BASE_URL}/player/index.php?id=${pid}&s=${season}&e=${episode}`
            ];

            for (let endpoint of possibleEndpoints) {
                try {
                    const res = await fetch(endpoint, { headers: HEADERS });
                    if (res.status === 200) {
                        const txt = await res.text();
                        if (txt.includes('http')) {
                             streams.push({ name: "JetFilmizle", title: "⌜ API Kaynağı ⌟", url: endpoint, type: "embed" });
                        }
                    }
                } catch(e) {}
            }
        }

        // 3. ADIM: Son Çare - Tüm URL'leri filtrele
        if (streams.length === 0) {
            const allUrls = html.match(/(?:https?:)?\/\/[^\s"'<>]+/gi) || [];
            allUrls.forEach(u => {
                if (/titan|jetv|videopark|d2rs/i.test(u) && !u.includes('google') && !u.includes('youtube')) {
                    let clean = u.replace(/\\/g, '').split(/[\\"']/)[0];
                    if (!streams.some(s => s.url === clean)) {
                        streams.push({ name: "JetFilmizle", title: "⌜ Otomatik ⌟", url: clean, type: "embed" });
                    }
                }
            });
        }

        console.error('[JetFilm-Debug] Hunter Sonuç: ' + streams.length);
        return streams;

    } catch (err) {
        console.error('[JetFilm-Debug] HATA: ' + err.message);
        return [];
    }
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
