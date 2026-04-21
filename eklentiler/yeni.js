/**
 * JetFilmizle - Nuvio Ultra (v19 Smart Filter)
 * Gereksiz ID'leri ayıklar ve sadece gerçek Videopark kaynaklarına odaklanır.
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

        // 1. ANALİZ VE FİLTRELEME
        let rawIds = [];
        // Videopark ID'leri genelde 11 karakterdir ve içinde 'G-P2W' gibi Analytics kalıpları olmaz.
        const titanRegex = /(?:titan\/w\/|data-id=|data-video=)["']?([a-zA-Z0-9_-]{10,15})/gi;
        let m;
        while ((m = titanRegex.exec(html)) !== null) {
            let foundId = m[1];
            // FİLTRE: Analytics, CSS sınıfları ve anlamsız kelimeleri ele
            if (foundId.startsWith('G-') || foundId.includes('search') || foundId.includes('input') || foundId.length < 10) {
                continue;
            }
            if (rawIds.indexOf(foundId) === -1) rawIds.push(foundId);
        }

        console.error(`[TITAN] Filtrelenmiş ID Sayısı: ${rawIds.length} (Gerçek Kaynaklar Aranıyor)`);

        for (let tId of rawIds) {
            const playerUrl = `https://videopark.top/titan/w/${tId}`;
            console.error(`[TITAN] Deneniyor: ${playerUrl}`);

            try {
                const pRes = await fetch(playerUrl, { headers: { 'Referer': 'https://jetfilmizle.net/', 'User-Agent': HEADERS['User-Agent'] } });
                const pHtml = await pRes.text();
                
                const sdMatch = pHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                if (sdMatch) {
                    const data = JSON.parse(sdMatch[1]);
                    if (data.stream_url) {
                        console.error(`[TITAN-SUCCESS] Kaynak Bulundu: ${tId}`);
                        streams.push({
                            name: "Videopark",
                            title: `⌜ Titan Worker ⌟ | ${dil}`,
                            url: data.stream_url,
                            type: "hls",
                            subtitles: data.subtitles ? data.subtitles.map(s => ({ url: s.file, language: s.label, format: "vtt" })) : [],
                            headers: { 'Referer': 'https://videopark.top/', 'User-Agent': HEADERS['User-Agent'] }
                        });
                    }
                }
            } catch (e) { continue; }
        }

        // 2. Sayfa içi doğrudan _sd kontrolü (Yedek)
        if (streams.length === 0) {
            const directSd = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (directSd) {
                try {
                    const d = JSON.parse(directSd[1]);
                    if (d.stream_url) {
                        streams.push({ name: "JetFilm", title: "Standart | " + dil, url: d.stream_url, type: 'hls', headers: { 'Referer': 'https://videopark.top/' } });
                    }
                } catch(e) {}
            }
        }

        // BOŞ DİZİ DÖNME KURALI (Java Engine Crash Fix)
        console.error(`[Hata-Nerede] 10: Bitti. Toplam: ${streams.length}`);
        return streams.length > 0 ? streams : [];

    } catch (err) {
        console.error(`[TITAN-KRITIK] Hata: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
