/**
 * JetFilmizle - Nuvio Ultra (v43 Source Master)
 * JSON bekleyip hata almak yerine, ham metin (raw text) üzerinden 
 * Videopark'ın 'var _sd' değişkenini avlar.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbType = (mediaType === 'tv') ? 'tv' : 'movie';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = (info.name || info.title || "").toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

        const targetUrl = (mediaType === 'tv') 
            ? `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`
            : `${BASE_URL}/film/${slug}`;

        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        // 1. ADIM: Sayfa içindeki tüm "iframe" ve "player" URL'lerini süpür
        // JetFilmizle veriyi genelde bir "embed" linki arkasına saklar.
        const embedMatches = html.match(/src=["'](https:\/\/videopark\.top\/[^"']+)["']/g) || [];
        let candidates = embedMatches.map(m => m.replace(/src=["']|["']/g, ''));

        // 2. ADIM: "BİLİNENİN DIŞI" - Script içindeki gizli "file" anahtarı
        // Bazen 'file: "..."' şeklinde doğrudan m3u8 linki veya şifreli bir yol bulunur.
        const fileMatch = html.match(/file\s*:\s*["']([^"']+)["']/);
        if (fileMatch) candidates.unshift(fileMatch[1]);

        console.error(`[MASTER] Potansiyel Kaynak Sayısı: ${candidates.length}`);

        let streams = [];
        for (let sourceUrl of candidates) {
            try {
                // Hata aldığımız JSON parse yerine her şeyi "text" olarak alıyoruz
                const res = await fetch(sourceUrl, { 
                    headers: { 'Referer': targetUrl, 'User-Agent': 'Mozilla/5.0' } 
                });
                const content = await res.text();

                // Eğer gelen içerik bir HTML/JS ise içinde '_sd' ara
                if (content.includes('_sd')) {
                    const sdMatch = content.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                    if (sdMatch) {
                        const data = JSON.parse(sdMatch[1]);
                        if (data.stream_url) {
                            return [{
                                name: "Jet-Source",
                                url: data.stream_url,
                                type: "hls",
                                headers: { 'Referer': 'https://videopark.top/' }
                            }];
                        }
                    }
                }
                
                // Eğer doğrudan bir m3u8 linkiyse
                if (content.includes('#EXTM3U') || sourceUrl.includes('.m3u8')) {
                    return [{ name: "Jet-Direct-M3U8", url: sourceUrl, type: "hls" }];
                }
            } catch (e) {
                console.error(`[MASTER] Kaynak hatası: ${e.message}`);
            }
        }

        return streams;
    } catch (err) { return []; }
}

module.exports = { getStreams };
