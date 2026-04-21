/**
 * JetFilmizle - Nuvio Ultra (Final Dizi Fix)
 * Butonlardaki data-id'leri yakalar ve Titan üzerinden akışı çözer.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://jetfilmizle.net/'
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
        const year = (info.first_air_date || info.release_date || "").split("-")[0];
        
        const s = season || 1;
        const e = episode || 1;
        const slug = toSlug(name);
        
        let candidates = [];
        if (mediaType === 'tv') {
            candidates.push(`${BASE_URL}/dizi/${slug}-2018/sezon-${s}/bolum-${e}`); // Önce spesifik olan
            candidates.push(`${BASE_URL}/dizi/${slug}/sezon-${s}/bolum-${e}`);
            candidates.push(`${BASE_URL}/dizi/${slug}-izle/sezon-${s}/bolum-${e}`);
            candidates.push(`${BASE_URL}/dizi/${slug}/sezon-${s}-bolum-${e}-izle`);
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
                // Eğer sayfa 404 değilse ama içerik boşsa devam et (Bot kontrolü)
                if (html.length > 2000) break; 
            }
        }

        if (!html) return [];

        let streams = [];
        const dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

        // --- BUTONLARDAKİ GİZLİ ID'LERİ TOPLA ---
        // data-id="DFADXFgPDU4" gibi olan her şeyi yakalar
        let titanIds = [];
        const dataIdRegex = /data-id=['"]([a-zA-Z0-9_-]{10,15})['"]/gi;
        let m;
        while ((m = dataIdRegex.exec(html)) !== null) {
            if (titanIds.indexOf(m[1]) === -1) titanIds.push(m[1]);
        }

        // Klasik URL içindeki ID'leri de ekle (Yedek)
        const urlIdRegex = /titan\/w\/([a-zA-Z0-9_-]{10,15})/gi;
        while ((m = urlIdRegex.exec(html)) !== null) {
            if (titanIds.indexOf(m[1]) === -1) titanIds.push(m[1]);
        }

        console.error(`[TITAN] Toplam ID Bulundu: ${titanIds.length}`);

        for (let tId of titanIds) {
            const playerUrl = `https://videopark.top/titan/w/${tId}`;
            console.error(`[TITAN] Player Çözülüyor: ${playerUrl}`);

            const pRes = await fetch(playerUrl, { headers: { 'Referer': 'https://jetfilmizle.net/', 'User-Agent': HEADERS['User-Agent'] } });
            const pHtml = await pRes.text();
            
            // Senin koddaki _sd ayıklama mantığı
            const sdMatch = pHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (sdMatch) {
                try {
                    const data = JSON.parse(sdMatch[1]);
                    if (data.stream_url) {
                        streams.push({
                            name: "Videopark",
                            title: `⌜ Titan ⌟ | ${dil}`,
                            url: data.stream_url,
                            type: "hls",
                            subtitles: data.subtitles ? data.subtitles.map(s => ({ url: s.file, language: s.label, format: "vtt" })) : [],
                            headers: { 'Referer': 'https://videopark.top/', 'User-Agent': HEADERS['User-Agent'] }
                        });
                    }
                } catch(e) {}
            }
        }

        // Eğer hala boşsa sayfa içine direkt bak (Filmler için)
        if (streams.length === 0) {
            const directSd = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (directSd) {
                const d = JSON.parse(directSd[1]);
                streams.push({ name: "JetFilm", title: "Standart | " + dil, url: d.stream_url, type: 'hls', headers: { 'Referer': 'https://videopark.top/' } });
            }
        }

        console.error(`[Hata-Nerede] 10: Islem Bitti. Kaynak: ${streams.length}`);
        return streams;

    } catch (err) {
        console.error(`[TITAN-KRITIK] Hata: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
