/**
 * JetFilmizle - Nuvio Ultra (v24 AJAX Sniffer)
 * Sayfa içindeki gizli script bloklarından Titan ID'lerini cımbızla çeker.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    console.error(`[SNIFFER] Başlatıldı: ${mediaType} - ID: ${id}`);
    
    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbType = (mediaType === 'tv') ? 'tv' : 'movie';
        
        // 1. TMDB'den isim al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = (info.name || info.title || "").toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

        const targetUrl = (mediaType === 'tv') 
            ? `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`
            : `${BASE_URL}/film/${slug}`;

        // 2. SAYFAYI ÇEK VE ANALİZ ET
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://jetfilmizle.net/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,mobile/v1.0',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const html = await response.text();
        let streams = [];

        // 3. AGRESİF ID AVCI (Tüm tırnak içindeki 11-15 karakterlik büyük harfli dizinleri tara)
        // Jetfilm genelde DFADX ile başlayan ID'ler kullanır.
        const titanIds = [];
        const regexList = [
            /data-id=["']([a-zA-Z0-9_-]{10,20})["']/gi,
            /["']id["']\s*:\s*["']([a-zA-Z0-9_-]{10,20})["']/gi,
            /["'](DFADX[a-zA-Z0-9_-]{5,15})["']/gi // Cobra Kai özel kalıbı
        ];

        for (let reg of regexList) {
            let m;
            while ((m = reg.exec(html)) !== null) {
                let found = m[1];
                if (!found.startsWith('G-') && !found.includes('search') && titanIds.indexOf(found) === -1) {
                    titanIds.push(found);
                }
            }
        }

        console.error(`[SNIFFER] Bulunan Potansiyel ID: ${titanIds.length}`);

        for (let tId of titanIds) {
            const titanUrl = `https://videopark.top/titan/w/${tId}`;
            console.error(`[SNIFFER] Titan Deneniyor: ${tId}`);

            const tRes = await fetch(titanUrl, { 
                headers: { 
                    'Referer': 'https://jetfilmizle.net/',
                    'User-Agent': 'Mozilla/5.0' 
                } 
            });
            const tHtml = await tRes.text();
            
            // Senin meşhur _sd ayıklama bloğun
            const sdMatch = tHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (sdMatch) {
                try {
                    const data = JSON.parse(sdMatch[1]);
                    if (data.stream_url) {
                        streams.push({
                            name: "Videopark",
                            title: `⌜ Kaynak: ${tId.substring(0,3)} ⌟`,
                            url: data.stream_url,
                            type: "hls",
                            headers: { 'Referer': 'https://videopark.top/' }
                        });
                    }
                } catch(e) {}
            }
        }

        // 4. FALLBACK: Sayfa içinde doğrudan _sd varsa (Filmler için)
        if (streams.length === 0) {
            const directSd = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (directSd) {
                const d = JSON.parse(directSd[1]);
                streams.push({ name: "Jet-Direct", url: d.stream_url, type: "hls" });
            }
        }

        console.error(`[SNIFFER] Final Sonuç: ${streams.length}`);
        return streams;

    } catch (err) {
        console.error(`[SNIFFER-HATA] ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
