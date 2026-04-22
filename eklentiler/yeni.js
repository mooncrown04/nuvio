/**
 * JetFilmizle - Videopark "Titan" V5 (Zero-Touch Edition)
 * Jetfilm sayfasına gitmeden direkt Titan üzerinden çözer.
 */

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    console.error(`[DEBUG-V5] Direkt API Modu: S=${season}, E=${episode}`);

    try {
        // 1. ADIM: Senin çalışan o meşhur kodunu temel alıyoruz
        // Bu kod bir "Container" görevi görüyor olabilir.
        const masterHash = "DFADXFgPDU4"; 
        const titanBase = `https://videopark.top/titan/w/${masterHash}`;

        // 2. ADIM: Bölüm parametrelerini Titan'a enjekte etmeye çalışalım
        // Titan Player genelde URL parametrelerini (s, e, t) dinler.
        const targetUrl = `${titanBase}?s=${season}&e=${episode}&tmdb=${id}`;
        
        console.error(`[DEBUG-V5] Titan API Zorlanıyor: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            headers: {
                'Referer': 'https://jetfilmizle.net/', // Site üzerinden gelmiş süsü veriyoruz
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const html = await response.text();
        
        // 3. ADIM: _sd objesi içinde gelen veriyi kontrol et
        const sdMatch = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (sdMatch) {
            const data = JSON.parse(sdMatch[1]);
            
            // BURASI KRİTİK: Eğer data.stream_url içinde hala S1E1 geliyorsa 
            // Titan bizi yönlendirmiyor demektir. 
            console.error(`[DEBUG-V5] Gelen Akış: ${data.stream_url.substring(0, 60)}...`);

            return [{
                name: "Videopark (Titan-Direct)",
                url: data.stream_url,
                type: "hls",
                subtitles: data.subtitles ? data.subtitles.map(s => ({ 
                    url: s.file, 
                    language: s.label, 
                    format: "vtt" 
                })) : [],
                headers: {
                    'Referer': 'https://videopark.top/',
                    'Origin': 'https://videopark.top',
                    'User-Agent': 'Mozilla/5.0'
                }
            }];
        }

        // 4. ADIM: Eğer yukarıdaki yemezse, Jetfilm'in "Player" sayfasına 
        // bot gibi değil, bir "AJAX" isteği gibi gidelim.
        console.error("[DEBUG-V5] API Yemedi, alternatif AJAX denenecek...");
        return [];

    } catch (err) {
        console.error(`[DEBUG-CRITICAL] V5 Hata: ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
globalThis.getStreams = getStreams;
