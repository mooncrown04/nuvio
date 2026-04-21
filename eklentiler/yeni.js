/**
 * JetFilmizle - Nuvio Debugger
 * Bu kod tahmin yapmaz, gelen veriyi loglara dökerek yolu bulur.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    console.error(`[DEBUG] Başlatıldı: ID:${id} | Type:${mediaType} | S:${season} E:${episode}`);
    
    try {
        // 1. TMDB'den ismi al (Link oluşturmak için şart)
        const tmdbType = (mediaType === 'tv') ? 'tv' : 'movie';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${id}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = info.name ? info.name.toLowerCase().replace(/ /g, '-') : ""; // Basit slug

        // Örnek linki dene
        let targetUrl = (mediaType === 'tv') 
            ? `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`
            : `${BASE_URL}/film/${slug}`;

        console.error(`[DEBUG] Hedef URL: ${targetUrl}`);

        const res = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': BASE_URL }
        });
        
        const html = await res.text();
        
        // --- ASIL ANALİZ BURADA ---
        console.error(`[DEBUG] HTML Boyutu: ${html.length} karakter`);

        // Sitedeki gizli player listesini (video-nav) ham metin olarak yakala
        const navBlock = html.match(/<div class="video-nav">([\s\S]*?)<\/div>/);
        if (navBlock) {
            console.error(`[DEBUG] Video Nav Bloğu Bulundu: ${navBlock[1].substring(0, 200)}...`);
        } else {
            console.error(`[DEBUG] Video Nav Bloğu BULUNAMADI. Sayfa JS render bekliyor olabilir.`);
        }

        // Senin verdiğin Videopark kodundaki _sd yapısını tüm sayfada tara
        const anySd = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        if (anySd) {
            console.error(`[DEBUG] Sayfada DOĞRUDAN _sd bulundu!`);
            const data = JSON.parse(anySd[1]);
            return [{
                name: "Jet-Direct",
                url: data.stream_url,
                type: "hls"
            }];
        }

        // Eğer ID'ler butonlardaysa, onları ham metinden cımbızla
        let streams = [];
        const regex = /data-id=["']([a-zA-Z0-9_-]+)["']/g;
        let m;
        while ((m = regex.exec(html)) !== null) {
            let tId = m[1];
            // analytics ve gereksizleri ele
            if (tId.length > 10 && !tId.includes('G-')) {
                console.error(`[DEBUG] Potansiyel ID Yakalandı: ${tId}`);
                
                // Hemen bu ID'yi Titan'a sor
                const titanUrl = `https://videopark.top/titan/w/${tId}`;
                const tRes = await fetch(titanUrl, { headers: { 'Referer': BASE_URL } });
                const tHtml = await tRes.text();
                const sdMatch = tHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                
                if (sdMatch) {
                    const d = JSON.parse(sdMatch[1]);
                    streams.push({
                        name: "Titan Worker",
                        url: d.stream_url,
                        type: "hls"
                    });
                }
            }
        }

        console.error(`[DEBUG] İşlem Bitti. Bulunan: ${streams.length}`);
        return streams;

    } catch (err) {
        console.error(`[DEBUG] KRİTİK HATA: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
