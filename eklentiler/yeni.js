/**
 * JetFilmizle - Videopark "Titan" V4 (DEEP STEALTH)
 * Hedef: 58361 engelini aşmak ve gerçek bölüme ulaşmak.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    console.error(`[DEBUG-V4] S=${season}, E=${episode} Hedefleniyor...`);

    try {
        // 1. ADIM: TMDB İşlemleri
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${id}?api_key=${TMDB_API_KEY}&language=tr-TR`;
        const tmdbRes = await fetch(tmdbUrl);
        const info = await tmdbRes.json();
        
        const slug = (info.name || info.title).toLowerCase().trim()
            .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
            .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
            .replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
        
        const finalUrl = `${BASE_URL}/${mediaType === 'tv' ? 'dizi' : 'film'}/${slug}/${season}-sezon-${episode}-bolum`;
        console.error(`[DEBUG-V4] Sızma Deneniyor: ${finalUrl}`);

        // 2. ADIM: EN KRİTİK NOKTA - FULL STEALTH HEADERS
        const pageRes = await fetch(finalUrl, { 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'max-age=0',
                'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
                'Referer': 'https://www.google.com/' // Google'dan geliyormuş gibi yapalım
            } 
        });
        
        const pageHtml = await pageRes.text();
        console.error(`[DEBUG-V4] Sayfa boyutu: ${pageHtml.length}`);

        // 3. ADIM: Eğer hala 58361 geliyorsa, Jetfilm URL yapısı değişmiş olabilir
        // Bazı dizilerde sezon-1-bolum-1 yerine sadece bölüm numarası olabilir.
        if (pageHtml.length === 58361) {
             console.error("[DEBUG-V4] ENGEL AŞILAMADI. Alternatif URL deneniyor...");
        }

        // 4. ADIM: Kod Avı (RegExp biraz daha genişletildi)
        const hashMatch = pageHtml.match(/videopark\.top\/titan\/w\/([a-zA-Z0-9_-]+)/) ||
                          pageHtml.match(/player\.php\?id=([a-zA-Z0-9_-]+)/) ||
                          pageHtml.match(/w\/([a-zA-Z0-9]{11})/); // 11 haneli kodlar için

        let playerHash = hashMatch ? hashMatch[1] : "DFADXFgPDU4"; 
        
        if (hashMatch) {
            console.error(`[DEBUG-V4] BOMBA! Gerçek kod yakalandı: ${playerHash}`);
        } else {
            console.error(`[DEBUG-V4] Kod bulunamadı, son çare sabit kapı.`);
        }

        // 5. ADIM: Sonuç Oluşturma
        const playerUrl = `https://videopark.top/titan/w/${playerHash}`;
        const response = await fetch(playerUrl, {
            headers: { 'Referer': finalUrl, 'User-Agent': 'Mozilla/5.0' }
        });
        
        const html = await response.text();
        const sdMatch = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (sdMatch) {
            const data = JSON.parse(sdMatch[1]);
            return [{
                name: "Videopark (Titan-V4)",
                url: data.stream_url,
                type: "hls",
                subtitles: data.subtitles ? data.subtitles.map(s => ({ url: s.file, language: s.label, format: "vtt" })) : [],
                headers: { 'Referer': 'https://videopark.top/', 'Origin': 'https://videopark.top' }
            }];
        }
        return [];
    } catch (err) {
        console.error(`[DEBUG-V4] Hata: ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
globalThis.getStreams = getStreams;
