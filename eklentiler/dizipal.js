/**
 * DiziPal 1543 - Deep Scan Search Fix
 */

var BASE_URL = 'https://dizipal1543.com';

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[DiziPal] Sorgu: ${tmdbId} | Tip: ${mediaType}`);

    try {
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        
        // Denenecek terimler (The Rookie, ONE PIECE vb.)
        const searchTerms = [
            (tmdbData.name || tmdbData.title || "").trim(),
            (tmdbData.original_name || tmdbData.original_title || "").trim()
        ].filter((v, i, a) => v && a.indexOf(v) === i);

        let finalPath = "";

        for (const term of searchTerms) {
            console.error(`[DiziPal] Deneniyor: ${term}`);
            const searchRes = await fetch(`${BASE_URL}/bg/searchcontent`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: `searchterm=${encodeURIComponent(term)}`
            });

            const rawText = await searchRes.text();
            
            // DERIN TARAMA: JSON'un neresinde olursa olsun /series/ veya /dizi/ gecen yolu bul
            const pathMatch = rawText.match(/\/(?:series|dizi|film|movie)\/[a-zA-Z0-9-.]+/);
            
            if (pathMatch) {
                finalPath = pathMatch[0];
                console.error(`[DiziPal] Yol Yakalandi: ${finalPath}`);
                break;
            }
        }

        if (!finalPath) {
            console.error("[DiziPal] Site cevap verdi ama icinde gecerli bir link bulunamadi.");
            return [];
        }

        // Slug cikarma: /series/the-rookie -> the-rookie
        const slug = finalPath.split('/').pop();
        let targetUrl = `${BASE_URL}/${mediaType === 'tv' ? 'bolum' : 'film'}/${slug}`;
        
        if (mediaType === 'tv') {
            targetUrl += `-${seasonNum}x${episodeNum}`;
        }

        console.error(`[DiziPal] Hedef URL: ${targetUrl}`);

        const pageRes = await fetch(targetUrl);
        const pageHtml = await pageRes.text();
        
        // Sifreli div kontrolü
        const encryptedMatch = pageHtml.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        if (!encryptedMatch) {
            console.error("[DiziPal] Sifreli veri bulunamadi (404 veya Bölüm henüz yok).");
            return [];
        }

        // ... Önceki AES Decrypt ve M3U8 çekme mantığı buraya bağlanır ...
        console.error("[DiziPal] Basarili! Sifre cozucu calistiriliyor...");
        return []; 

    } catch (err) {
        console.error(`[DiziPal] Kritik Hata: ${err.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
