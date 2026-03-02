// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
const BASE_URL = 'https://www.fullhdfilmizlesene.live';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

// ==================== PROFESYONEL YARDIMCILAR (Yeni Örnekten) ====================

const parseQuality = (text) => {
    const t = String(text).toLowerCase();
    if (t.includes('2160') || t.includes('4k')) return "2160p";
    if (t.includes('1080')) return "1080p";
    if (t.includes('720')) return "720p";
    if (t.includes('480')) return "480p";
    return "720p"; // Varsayılan
};

const sortStreams = (streams) => {
    const order = { "2160p": 1, "1080p": 2, "720p": 3, "480p": 4 };
    return streams.sort((a, b) => (order[a.quality] || 99) - (order[b.quality] || 99));
};

// ==================== DECODE VE EXTRACTOR MANTIĞI ====================

function decodeSource(encoded) {
    try {
        // ROT13 + Base64 kombinasyonu (Sitenin standart koruması)
        const rot13 = str => str.replace(/[a-zA-Z]/g, c => String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26));
        const decoded = atob(rot13(encoded).replace(/\s/g, ''));
        return decoded.startsWith('http') ? decoded : null;
    } catch (e) { return null; }
}

async function resolveRapid(url, referer) {
    try {
        const res = await fetch(url, { headers: { ...HEADERS, 'Referer': referer } });
        const text = await res.text();
        const match = text.match(/file["']?\s*[:=]\s*["']([^"']+)["']/);
        if (!match) return null;
        
        // Hex Decode (Senin ilk örnekteki başarılı olan kısım)
        const hex = match[1].replace(/\\\\x|\\x/g, '');
        let str = '';
        for (let i = 0; i < hex.length; i += 2) str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        return str.includes('.m3u8') ? str : null;
    } catch (e) { return null; }
}

// ==================== ANA AKIŞ ====================

async function fetchDetailAndStreams(filmUrl) {
    const res = await fetch(filmUrl, { headers: HEADERS });
    const html = await res.text();
    
    const scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
    if (!scxMatch) return [];

    const scxData = JSON.parse(scxMatch[1]);
    const results = [];
    const keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];

    for (const key of keys) {
        const source = scxData[key]?.sx?.t;
        if (!source) continue;

        const items = Array.isArray(source) ? source : Object.values(source);
        
        for (const [index, encoded] of items.entries()) {
            let finalUrl = decodeSource(encoded);
            if (!finalUrl) continue;

            // Eğer link Rapidvid ise m3u8'e çevir
            if (finalUrl.includes('rapidvid') || finalUrl.includes('vidmoxy')) {
                finalUrl = await resolveRapid(finalUrl, filmUrl);
            }

            if (finalUrl) {
                const isHls = finalUrl.includes('.m3u8') || ['proton', 'fast'].includes(key);
                results.push({
                    name: `FHD | ${key.toUpperCase()} #${index + 1}`,
                    url: finalUrl,
                    quality: parseQuality(key),
                    is_direct: true,
                    streamType: isHls ? 'hls' : 'video',
                    headers: { ...HEADERS, 'Origin': BASE_URL }
                });
            }
        }
    }
    return sortStreams(results);
}

// Nuvio'nun getStreams fonksiyonu
async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];
    
    // 1. TMDB'den isim al
    const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
    const movie = await tmdbRes.json();
    
    // 2. Sitede Ara
    const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(movie.title)}`, { headers: HEADERS });
    const searchHtml = await searchRes.text();
    const linkMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
    
    if (!linkMatch) return [];
    const filmUrl = linkMatch[1].startsWith('http') ? linkMatch[1] : BASE_URL + linkMatch[1];
    
    // 3. Kaynakları Çöz
    return await fetchDetailAndStreams(filmUrl);
}

module.exports = { getStreams };
