/**
 * DiziPal 1543 - Stealth GET & URL Search
 */

var BASE_URL = 'https://dizipal1543.com';

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[DiziPal] Sorgu: ${tmdbId} | Hafiza: ${mediaType}`);

    try {
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        const query = (tmdbData.name || tmdbData.title || "").trim();

        // ADIM 1: POST yerine GET ile arama sayfasına git (Bot korumasını aşma ihtimali daha yüksek)
        console.error(`[DiziPal] GET Aramasi Baslatildi: ${query}`);
        const searchUrl = `${BASE_URL}/arama?q=${encodeURIComponent(query)}`;
        
        const response = await fetch(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': BASE_URL
            }
        });

        const html = await response.text();
        
        // ADIM 2: HTML içinde linki ara
        // DiziPal arama sonuçlarında linkler genelde 'series/the-rookie' veya 'dizi/the-rookie' şeklindedir
        const patterns = [
            new RegExp(`href="\/([^"]*${mediaType === 'tv' ? 'series|dizi' : 'movie|film'}[^"]*)"`, 'i'),
            new RegExp(`href="\/([^"]*${query.toLowerCase().replace(/\s+/g, '-')}[^"]*)"`, 'i')
        ];

        let foundPath = "";
        for (let pattern of patterns) {
            const match = html.match(pattern);
            if (match) {
                foundPath = match[1];
                break;
            }
        }

        // Eğer hala bulamadıysak, ana sayfadaki son eklenenler arasında mı diye bak
        if (!foundPath) {
             const fallbackMatch = html.match(/\/(?:series|dizi|film|movie)\/[a-zA-Z0-9-.]+/);
             if (fallbackMatch) foundPath = fallbackMatch[0].replace(/^\//, "");
        }

        if (!foundPath) {
            console.error("[DiziPal] GET sonucunda da link bulunamadi. Site yapisi veya koruma engeli.");
            // Alternatif: Ham HTML'in bir kısmını logla ki ne gördüğümüzü anlayalım
            console.error(`[DiziPal] HTML Kesit: ${html.substring(0, 200)}`);
            return [];
        }

        const slug = foundPath.split('/').pop();
        let targetUrl = `${BASE_URL}/${mediaType === 'tv' ? 'bolum' : 'film'}/${slug}`;
        if (mediaType === 'tv') targetUrl += `-${seasonNum}x${episodeNum}`;

        console.error(`[DiziPal] Hedef URL: ${targetUrl}`);

        const pageRes = await fetch(targetUrl);
        const pageHtml = await pageRes.text();
        
        const encryptedMatch = pageHtml.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        if (encryptedMatch) {
            console.error("[DiziPal] SIFRELI VERI YAKALANDI! AES baslatiliyor.");
            // ... AES DECRYPT MANTIGI ...
        } else {
            console.error("[DiziPal] Bolum sayfasina ulasildi ama video divi bulunamadi.");
        }

        return [];

    } catch (err) {
        console.error(`[DiziPal] Hata: ${err.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
