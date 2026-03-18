/**
 * DiziPal 1543 - HTML Result & Multi-Search Fix
 */

var BASE_URL = 'https://dizipal1543.com';

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[DiziPal] Sorgu Basladi: ${tmdbId}`);

    try {
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        
        // Denenecek isimler listesi
        const searchTerms = [
            (tmdbData.name || tmdbData.title || "").trim(),
            (tmdbData.original_name || tmdbData.original_title || "").trim()
        ].filter((v, i, a) => v && a.indexOf(v) === i);

        let realSlug = "";

        for (const term of searchTerms) {
            console.error(`[DiziPal] Araniyor: ${term}`);
            const searchRes = await fetch(`${BASE_URL}/bg/searchcontent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
                body: `searchterm=${encodeURIComponent(term)}`
            });

            const json = await searchRes.json();
            
            // Logda gordugumuz 'html' alanindan URL'yi cekmeye calisalim (En garantisi budur)
            const htmlContent = json.data?.html || "";
            const slugMatch = htmlContent.match(/href="\/([^"]+)"/);
            
            if (slugMatch) {
                // 'series/the-rookie' veya 'dizi/the-rookie' gibi doner, sadece son kismi aliriz
                realSlug = slugMatch[1].split('/').pop();
                console.error(`[DiziPal] Slug Bulundu: ${realSlug}`);
                break;
            }
            
            // Alternatif: result dizisinden bak
            const firstResult = json.data?.result?.[0];
            if (firstResult?.slug) {
                realSlug = firstResult.slug;
                break;
            }
        }

        if (!realSlug) {
            console.error("[DiziPal] Hicbir terimle slug bulunamadi.");
            return [];
        }

        let targetUrl = `${BASE_URL}/${mediaType === 'tv' ? 'bolum' : 'film'}/${realSlug}`;
        if (mediaType === 'tv') {
            targetUrl += `-${seasonNum}x${episodeNum}`;
        }

        console.error(`[DiziPal] Hedef Adres: ${targetUrl}`);

        const pageRes = await fetch(targetUrl);
        const pageHtml = await pageRes.text();
        
        const encryptedMatch = pageHtml.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        if (!encryptedMatch) {
            console.error("[DiziPal] Sayfada veri yok (404 veya farkli yapi).");
            return [];
        }

        // AES Decrypt adimlarina gecis...
        console.error("[DiziPal] Sifreli veri yakalandi!");
        
        // ... (Bundan sonrasi v3.0.0'daki AES logic ile devam edecek)
        // 

        return []; 

    } catch (err) {
        console.error(`[DiziPal] HATA: ${err.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
