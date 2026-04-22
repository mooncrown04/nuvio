/**
 * JetFilmizle - Nuvio Ultra (v67 Link Decryptor)
 * Sayfadaki gizli bölüm ID'lerini avlar ve dünkü çalışan
 * Videopark formatına (DFA/**
 * JetFilmizle - Nuvio Ultra (v67 Link Decryptor)
 * Sayfadaki gizli bölüm ID'lerini avlar ve dünkü çalışan
 * Videopark formatına (DFADX...) dönüştürmeye çalışır.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        
        // Sitenin kabul ettiği ana sayfa URL'si
        const slug = (info.name || "").toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const targetUrl = `${BASE_URL}/dizi/${slug}`;

        const pageRes = await fetch(targetUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
        });
        const html = await pageRes.text();

        console.error(`[DECRYPTOR] Ana Sayfa Analiz Ediliyor: ${slug}`);

        // 1. ADIM: Sayfa içindeki tüm 8-15 karakterli adayları topla
        // Logdaki "MTc3..." ve "kUEO..." gibi yapıları da kapsar
        const pattern = /[a-zA-Z0-9_-]{8,15}/g;
        const allMatches = html.match(pattern) || [];
        
        // Gereksizleri temizle (Dünkü çalışan yapıya odaklan)
        const candidates = [...new Set(allMatches)].filter(c => 
            !/google|manager|script|Yandex|Active|Object|webkit|search|ads|visitor|bootstrap/i.test(c) &&
            (/[A-Z]/.test(c) || /[0-9]/.test(c))
        );

        console.error(`[DECRYPTOR] ${candidates.length} potansiyel anahtar bulundu.`);

        // 2. ADIM: Her adayı dünkü başarılı yolla test et
        for (let key of candidates.reverse()) {
            try {
                // Dünkü çalışan: https://videopark.top/titan/w/DFADXFgPDU4
                const testUrl = `https://videopark.top/titan/w/${key}`;
                
                const response = await fetch(testUrl, {
                    headers: {
                        'Referer': targetUrl,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                    },
                    timeout: 2000
                });

                const content = await response.text();

                // 3. ADIM: İçerikte video linki (stream_url) var mı?
                if (content.includes('_sd')) {
                    const data = JSON.parse(content.match(/var\s+_sd\s*=\s*({[\s\S]*?});/)[1]);
                    
                    if (data.stream_url) {
                        console.error(`[SUCCESS] Çalışan Anahtar Yakalandı: ${key}`);
                        return [{
                            name: `Jet-Titan (${key.substring(0,4)})`,
                            url: data.stream_url,
                            type: "hls",
                            headers: { 
                                'Referer': 'https://videopark.top/',
                                'User-Agent': 'Mozilla/5.0'
                            }
                        }];
                    }
                }
            } catch (e) { /* Hata varsa sonraki anahtara geç */ }
        }

        console.error("[DECRYPTOR] Hiçbir anahtar video döndürmedi.");
        return [];
    } catch (err) {
        return [];
    }
}

module.exports = { getStreams };DX...) dönüştürmeye çalışır.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        
        // Sitenin kabul ettiği ana sayfa URL'si
        const slug = (info.name || "").toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const targetUrl = `${BASE_URL}/dizi/${slug}`;

        const pageRes = await fetch(targetUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
        });
        const html = await pageRes.text();

        console.error(`[DECRYPTOR] Ana Sayfa Analiz Ediliyor: ${slug}`);

        // 1. ADIM: Sayfa içindeki tüm 8-15 karakterli adayları topla
        // Logdaki "MTc3..." ve "kUEO..." gibi yapıları da kapsar
        const pattern = /[a-zA-Z0-9_-]{8,15}/g;
        const allMatches = html.match(pattern) || [];
        
        // Gereksizleri temizle (Dünkü çalışan yapıya odaklan)
        const candidates = [...new Set(allMatches)].filter(c => 
            !/google|manager|script|Yandex|Active|Object|webkit|search|ads|visitor|bootstrap/i.test(c) &&
            (/[A-Z]/.test(c) || /[0-9]/.test(c))
        );

        console.error(`[DECRYPTOR] ${candidates.length} potansiyel anahtar bulundu.`);

        // 2. ADIM: Her adayı dünkü başarılı yolla test et
        for (let key of candidates.reverse()) {
            try {
                // Dünkü çalışan: https://videopark.top/titan/w/DFADXFgPDU4
                const testUrl = `https://videopark.top/titan/w/${key}`;
                
                const response = await fetch(testUrl, {
                    headers: {
                        'Referer': targetUrl,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                    },
                    timeout: 2000
                });

                const content = await response.text();

                // 3. ADIM: İçerikte video linki (stream_url) var mı?
                if (content.includes('_sd')) {
                    const data = JSON.parse(content.match(/var\s+_sd\s*=\s*({[\s\S]*?});/)[1]);
                    
                    if (data.stream_url) {
                        console.error(`[SUCCESS] Çalışan Anahtar Yakalandı: ${key}`);
                        return [{
                            name: `Jet-Titan (${key.substring(0,4)})`,
                            url: data.stream_url,
                            type: "hls",
                            headers: { 
                                'Referer': 'https://videopark.top/',
                                'User-Agent': 'Mozilla/5.0'
                            }
                        }];
                    }
                }
            } catch (e) { /* Hata varsa sonraki anahtara geç */ }
        }

        console.error("[DECRYPTOR] Hiçbir anahtar video döndürmedi.");
        return [];
    } catch (err) {
        return [];
    }
}

module.exports = { getStreams };
