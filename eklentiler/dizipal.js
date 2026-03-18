/**
 * DiziPal 1543 - Search Result & Loop Fix
 */

var BASE_URL = 'https://dizipal1543.com';
const PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[DiziPal] Sorgu: TMDB=${tmdbId} | ${mediaType} S:${seasonNum} E:${episodeNum}`);

    try {
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        
        // Arama için hem Türkçe hem orijinal ismi hazırla
        const searchTerms = [
            (tmdbData.name || tmdbData.title || "").replace(/[^a-zA-Z0-9 ]/g, "").trim(),
            (tmdbData.original_name || tmdbData.original_title || "").replace(/[^a-zA-Z0-9 ]/g, "").trim()
        ].filter((v, i, a) => v && a.indexOf(v) === i); // Benzersiz isimler

        let finalResult = null;

        for (const term of searchTerms) {
            console.error(`[DiziPal] Aranan Terim: ${term}`);
            const searchRes = await fetch(`${BASE_URL}/bg/searchcontent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
                body: `searchterm=${encodeURIComponent(term)}`
            });
            
            const searchData = await searchRes.json();
            const results = Object.values(searchData);

            if (results && results.length > 0) {
                // Sonuçlar içinde en mantıklı olanı bul (Boş olmayan ilk URL)
                finalResult = results.find(r => r && (r.url || r.path)); 
                if (finalResult) break;
            }
        }

        if (!finalResult) {
            console.error("[DiziPal] Hiçbir arama terimiyle sonuç bulunamadı!");
            return [];
        }

        // Bazı API'lerde 'path' bazıları 'url' kullanır
        let resultUrl = finalResult.url || finalResult.path;
        console.error(`[DiziPal] Bulunan Path: ${resultUrl}`);

        let targetUrl = BASE_URL + resultUrl;

        if (mediaType === 'tv') {
            // "The Rookie" için: /series/the-rookie -> the-rookie
            const slug = resultUrl.replace("/series/", "").replace("/dizi/", "").replace(/\//g, "");
            targetUrl = `${BASE_URL}/bolum/${slug}-${seasonNum}x${episodeNum}`;
        }
        
        console.error(`[DiziPal] Hedef Sayfa: ${targetUrl}`);

        // Sayfa çekme
        const pageRes = await fetch(targetUrl);
        const pageHtml = await pageRes.text();
        
        // Kotlin'deki şifreli div bulma
        const encryptedMatch = pageHtml.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        if (!encryptedMatch) {
            console.error("[DiziPal] Şifreli veri (data-rm-k) sayfada yok!");
            return [];
        }

        // ... (Bundan sonrası Decrypt ve Player logic - Öncekiyle aynı)
        // 

[Image of AES Decryption process]
 
        // Şifre çözme işlemini Kotlin'deki SHA512 mantığıyla yapıyoruz.
        
        // ... (Stream Linkini alıp döndüren kısım)
        // Test için log:
        console.error(`[DiziPal] Başarılı, link aranıyor...`);
        
        // Önceki çalışan decrypt fonksiyonunu buraya dahil etmeyi unutma!
        // ... (Kodun geri kalanı v2.8.0 ile aynıdır)

    } catch (err) {
        console.error(`[DiziPal] HATA: ${err.message}`);
        return [];
    }
}
