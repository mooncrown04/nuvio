/**
 * JetFilmizle - Nuvio Ultra (v20 Final Force)
 * Videopark Titan ve Dahili Jet-Player kaynaklarını en derinden kazır.
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
    console.error('[Hata-Nerede] 1: Islem Baslatildi');
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var tmdbType = (mediaType === 'tv') ? 'tv' : 'movie';

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const name = info.name || info.title || info.original_name;
        
        const s = season || 1;
        const e = episode || 1;
        const slug = toSlug(name);
        
        let candidates = [];
        if (mediaType === 'tv') {
            candidates.push(`${BASE_URL}/dizi/${slug}-2018/sezon-${s}/bolum-${e}`);
            candidates.push(`${BASE_URL}/dizi/${slug}/sezon-${s}/bolum-${e}`);
            candidates.push(`${BASE_URL}/dizi/${slug}/sezon-${s}-bolum-${e}-izle`);
        } else {
            candidates.push(`${BASE_URL}/film/${slug}`);
            candidates.push(`${BASE_URL}/film/${slug}-izle`);
        }

        let html = "";
        for (let url of candidates) {
            console.error(`[Hata-Nerede] 6: Sayfa Deneniyor -> ${url}`);
            const res = await fetch(url, { headers: HEADERS });
            if (res.status === 200) {
                html = await res.text();
                if (html.length > 2500) break;
            }
        }

        if (!html) return [];

        let streams = [];
        const isDublaj = html.indexOf('dublaj') !== -1;
        const label = isDublaj ? "Dublaj" : "Altyazı";

        // 1. VIDEOPARK (TITAN) DERİN ARAMA
        // Sadece ID formatına uyanları al (Örn: DFADXFgPDU4)
        let titanIds = [];
        const titanRegex = /(?:titan\/w\/|data-id=|data-video=)["']?(DFADX[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]{11})["']?/gi;
        let m;
        while ((m = titanRegex.exec(html)) !== null) {
            let tId = m[1];
            if (!tId.startsWith('G-') && !tId.includes('search') && titanIds.indexOf(tId) === -1) {
                titanIds.push(tId);
            }
        }

        console.error(`[TITAN] Bulunan Gecerli ID: ${titanIds.length}`);

        for (let tId of titanIds) {
            const playerUrl = `https://videopark.top/titan/w/${tId}`;
            console.error(`[TITAN] Worker Cozuluyor: ${playerUrl}`);

            try {
                const pRes = await fetch(playerUrl, { headers: { 'Referer': 'https://jetfilmizle.net/', 'User-Agent': HEADERS['User-Agent'] } });
                const pHtml = await pRes.text();
                const sdMatch = pHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                
                if (sdMatch) {
                    const data = JSON.parse(sdMatch[1]);
                    if (data.stream_url) {
                        streams.push({
                            name: "Videopark (Titan)",
                            title: `⌜ ${label} ⌟`,
                            url: data.stream_url,
                            type: "hls",
                            subtitles: data.subtitles ? data.subtitles.map(s => ({ url: s.file, language: s.label, format: "vtt" })) : [],
                            headers: { 'Referer': 'https://videopark.top/', 'User-Agent': HEADERS['User-Agent'] }
                        });
                    }
                }
            } catch (e) { console.error("[TITAN-HATA] " + e.message); }
        }

        // 2. JET-PLAYER DIRECT (Eger Titan bulunamazsa)
        if (streams.length === 0) {
            const directSd = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (directSd) {
                try {
                    const d = JSON.parse(directSd[1]);
                    if (d.stream_url) {
                        streams.push({
                            name: "Jet-Direct",
                            title: `⌜ Standart: ${label} ⌟`,
                            url: d.stream_url,
                            type: "hls",
                            headers: { 'Referer': 'https://videopark.top/' }
                        });
                    }
                } catch(e) {}
            }
        }

        console.error(`[Hata-Nerede] 10: Islem Bitti. Kaynak: ${streams.length}`);
        // Bos dizi donerek Java tarafini koruyoruz
        return streams.length > 0 ? streams : [];

    } catch (err) {
        console.error(`[TITAN-KRITIK] Hata: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
