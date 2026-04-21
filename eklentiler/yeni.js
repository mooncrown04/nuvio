/**
 * JetFilmizle - Nuvio Ultra (Worker/Titan Bypass)
 * Dizilerdeki dinamik Worker yapısını ve Videopark Titan akışını çözer.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://jetfilmizle.net/',
    'X-Requested-With': 'XMLHttpRequest'
};

function toSlug(t) {
    if(!t) return "";
    return t.toLowerCase()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

async function getStreams(id, mediaType, season, episode) {
    console.error('[Hata-Nerede] 1: Basladi');
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var tmdbType = (mediaType === 'tv') ? 'tv' : 'movie';

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const name = info.name || info.title || info.original_name;
        
        const s = season || 1;
        const e = episode || 1;
        const slug = toSlug(name);
        
        // Aday URL'ler (Worker'ın tetiklendiği ana sayfalar)
        let candidates = [];
        if (mediaType === 'tv') {
            candidates.push(`${BASE_URL}/dizi/${slug}-2018/sezon-${s}/bolum-${e}`);
            candidates.push(`${BASE_URL}/dizi/${slug}/sezon-${s}/bolum-${e}`);
            candidates.push(`${BASE_URL}/dizi/${slug}-izle/sezon-${s}/bolum-${e}`);
        } else {
            candidates.push(`${BASE_URL}/film/${slug}`);
            candidates.push(`${BASE_URL}/film/${slug}-izle`);
        }

        let html = "";
        for (let url of candidates) {
            console.error(`[Hata-Nerede] 6: Deneniyor -> ${url}`);
            const res = await fetch(url, { headers: HEADERS });
            if (res.status === 200) {
                html = await res.text();
                if (html.length > 3000) break;
            }
        }

        if (!html) return [];

        let streams = [];
        const dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

        // 1. WORKER ID YAKALAYICI (En Geniş Kapsam)
        // Hem data-id'leri hem de ham script içindeki ID'leri toplar
        let titanIds = [];
        const titanRegex = /(?:titan\/w\/|data-id=|data-video=|id=)["']?([a-zA-Z0-9_-]{10,15})/gi;
        let m;
        while ((m = titanRegex.exec(html)) !== null) {
            if (titanIds.indexOf(m[1]) === -1) titanIds.push(m[1]);
        }

        // Eğer Worker/AJAX ile geliyorsa ve HTML'de ID yoksa, 
        // sayfa içindeki "video-nav-item" butonlarını manuel kazı
        if (titanIds.length === 0) {
            const navMatch = html.match(/video-nav-item.*?data-id=["'](.*?)["']/gi);
            if (navMatch) {
                navMatch.forEach(item => {
                    const idMatch = item.match(/data-id=["'](.*?)["']/i);
                    if (idMatch && titanIds.indexOf(idMatch[1]) === -1) titanIds.push(idMatch[1]);
                });
            }
        }

        console.error(`[TITAN] Worker'dan Çekilen ID Sayısı: ${titanIds.length}`);

        for (let tId of titanIds) {
            // Senin paylaştığın başarılı bypass mantığı
            const playerUrl = `https://videopark.top/titan/w/${tId}`;
            console.error(`[TITAN] Worker Akışı Çözülüyor: ${playerUrl}`);

            const pRes = await fetch(playerUrl, { 
                headers: { 
                    'Referer': 'https://jetfilmizle.net/',
                    'User-Agent': HEADERS['User-Agent']
                } 
            });
            const pHtml = await pRes.text();
            
            const sdMatch = pHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (sdMatch) {
                try {
                    const data = JSON.parse(sdMatch[1]);
                    if (data.stream_url) {
                        streams.push({
                            name: "Videopark (Worker)",
                            title: `⌜ Titan ⌟ | ${dil}`,
                            url: data.stream_url,
                            type: "hls",
                            subtitles: data.subtitles ? data.subtitles.map(s => ({ url: s.file, language: s.label, format: "vtt" })) : [],
                            headers: { 
                                'Referer': 'https://videopark.top/',
                                'User-Agent': HEADERS['User-Agent']
                            }
                        });
                    }
                } catch(e) {}
            }
        }

        // Fallback: Filmlerdeki standart yapı
        if (streams.length === 0) {
            const pageSd = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (pageSd) {
                try {
                    const d = JSON.parse(pageSd[1]);
                    if (d.stream_url) {
                        streams.push({ name: "JetFilm", title: "Standart | " + dil, url: d.stream_url, type: 'hls', headers: { 'Referer': 'https://videopark.top/' } });
                    }
                } catch(e) {}
            }
        }

        console.error(`[Hata-Nerede] 10: Bitti. Kaynak: ${streams.length}`);
        return streams;

    } catch (err) {
        console.error(`[TITAN-KRITIK] Hata: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
