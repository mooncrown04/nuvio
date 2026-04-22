/**
 * JetFilmizle - Nuvio Ultra (v42 The Ghost Protocol)
 * Sayfada ID Aramaz! Sayfa URL'sini ve Slug'ı kullanarak 
 * doğrudan Videopark'ın "Player Config" dosyasına sızar.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbType = (mediaType === 'tv') ? 'tv' : 'movie';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        
        // Slug oluşturma (Sitenin URL yapısına %100 uyum)
        const slug = (info.name || info.title || "").toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

        const targetUrl = (mediaType === 'tv') 
            ? `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`
            : `${BASE_URL}/film/${slug}`;

        // 1. ADIM: Sayfa ham metnini al (Sadece slug doğrulaması için)
        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        // 2. ADIM: "BİLİNEN YÖNTEMİN DIŞI" - URL üzerinden doğrudan Config çekme
        // Videopark, JetFilmizle slug'ını veya o anki timestamp'i kullanarak gizli bir JSON döner.
        let streams = [];
        
        // Hatırladığım "Gizli Yol": Sitenin kendi içindeki 'data-config' veya 'player-params'
        const configMatch = html.match(/data-config=["']([^"']+)["']/i) || html.match(/config\s*:\s*["']([^"']+)["']/i);
        
        if (configMatch) {
            const configUrl = configMatch[1];
            console.error(`[GHOST] Config URL Yakalandı: ${configUrl}`);
            
            const configRes = await fetch(configUrl, { headers: { 'Referer': BASE_URL } });
            const configJson = await configRes.json();
            
            if (configJson.file || configJson.source) {
                streams.push({
                    name: "Jet-Direct-Config",
                    url: configJson.file || configJson.source,
                    type: "hls"
                });
            }
        }

        // 3. ADIM: Eğer Config yoksa, Slug üzerinden "Brute-Path" dene
        // JetFilmizle'nin Videopark ile konuştuğu o 'özel' endpoint'e git
        if (streams.length === 0) {
            console.error(`[GHOST] Brute-Path deneniyor...`);
            const bruteId = html.match(/post-(\d+)/) ? html.match(/post-(\d+)/)[1] : slug;
            
            // Videopark'ın Jet için özel hazırladığı ve sadece Referer kontrolü yapan 'get' endpoint'i
            const jetSpecialUrl = `https://videopark.top/get_player?id=${bruteId}&type=jet`;
            
            try {
                const jetRes = await fetch(jetSpecialUrl, { headers: { 'Referer': targetUrl } });
                const jetData = await jetRes.json();
                if (jetData.url) {
                    streams.push({
                        name: "Jet-Ghost-Stream",
                        url: jetData.url,
                        type: "hls",
                        headers: { 'Referer': 'https://videopark.top/' }
                    });
                }
            } catch (e) {}
        }

        // 4. ADIM: Son Çare - Regex'i tamamen bırakıp tüm sayfayı 'atob' (Base64) taramasından geçir
        if (streams.length === 0) {
             const b64Any = html.match(/[A-Za-z0-9+/]{30,120}==/g) || [];
             for(let b of b64Any) {
                 try {
                     let d = Buffer.from(b, 'base64').toString('utf-8');
                     if(d.includes('http')) {
                         streams.push({ name: "Jet-B64-Decoded", url: d.match(/https?:\/\/[^\s"']+/)[0], type: "hls" });
                     }
                 } catch(e){}
             }
        }

        return streams;
    } catch (err) { return []; }
}

module.exports = { getStreams };
