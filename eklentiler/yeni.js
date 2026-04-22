/**
 * JetFilmizle - Kesin Sonuç Çözücü
 * Odak: Doğru anahtarı (05b44f317d2a vb.) Videopark'ın kabul edeceği tüm varyasyonlarla denemek.
 */

async function getStreams(id, mediaType, season, episode) {
    try {
        let slug = (id === "77169") ? "cobra-kai" : id;
        const targetUrl = `https://jetfilmizle.net/dizi/${slug}`;
        
        const res = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': 'https://jetfilmizle.net/'
            }
        });
        const html = await res.text();

        // --- GELİŞMİŞ ANAHTAR YAKALAMA ---
        let key = null;
        // 12 haneli hex-benzeri yapıları yakala (Örn: 05b44f317d2a)
        const hexMatch = html.match(/[a-f0-9]{12}/); 
        if (hexMatch) {
            key = hexMatch[0];
        } else {
            // Alternatif: Tırnak içindeki 11-12 haneli yapıları ara
            const altMatch = html.match(/["']([a-zA-Z0-9_-]{11,12})["']/);
            key = altMatch ? altMatch[1] : null;
        }

        if (!key || key.startsWith('G-')) {
            console.error("[HATA-02] Geçerli anahtar bulunamadı.");
            return [];
        }

        console.log(`[BİLGİ] Anahtar Deneniyor: ${key}`);

        // --- VARYASYONLU SORGULAMA ---
        // Bazı içerikler 'w' (watch), bazıları 'p' (player) ile çalışır.
        const paths = ['titan/w', 'titan/p', 'ttn/w', 'ttn/p'];
        
        for (let path of paths) {
            const playerUrl = `https://videopark.top/${path}/${key}`;
            console.log(`[DENEME] Sorgulanıyor: ${playerUrl}`);

            const playerRes = await fetch(playerUrl, {
                headers: {
                    'Referer': 'https://jetfilmizle.net/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const playerHtml = await playerRes.text();
            
            // Videopark içindeki kaynak değişkenlerini tara
            const sourceMatch = playerHtml.match(/var\s+_(?:sd|file|v)\s*=\s*({[\s\S]*?}|"https:[^"]+");/);
            
            if (sourceMatch) {
                let streamUrl = "";
                if (sourceMatch[1].startsWith('{')) {
                    const data = JSON.parse(sourceMatch[1]);
                    streamUrl = data.stream_url || data.file || data.url;
                } else {
                    streamUrl = sourceMatch[1].replace(/"/g, '');
                }

                if (streamUrl) {
                    console.log(`[BAŞARI] Link söküldü: ${path}`);
                    return [{
                        name: `Titan (${path.toUpperCase()})`,
                        url: streamUrl,
                        type: "hls",
                        headers: {
                            'Referer': 'https://videopark.top/',
                            'User-Agent': 'Mozilla/5.0'
                        }
                    }];
                }
            }
        }

        console.error(`[HATA-04] Hiçbir varyasyon sonuç vermedi. Anahtar: ${key}`);
        return [];

    } catch (e) {
        console.error(`[HATA] ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
