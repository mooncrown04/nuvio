/**
 * Nuvio Local Scraper - FilmciBaba (V45 - Device & Auth Spoofing)
 */

const config = {
    name: "FilmciBaba",
    baseUrl: "https://izle.plus",
    apiUrl: "https://api.themoviedb.org/3",
    apiKey: "500330721680edb6d5f7f12ba7cd9023",
    id: "999b5a3c-bb95-571e-bd12-f5778eaecbfe"
};

async function getStreams(input) {
    try {
        console.error("[FilmciBaba] >>> Scraper Baslatildi (Device Check Mode)");
        
        // 1. Cihaz Bilgisi (Android TV / Firestick Taklidi)
        const deviceUA = "Mozilla/5.0 (Linux; Android 9; AFTS Build/PS7242) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.0.0 Mobile Safari/537.36";
        
        let rawId = (typeof input === 'object') ? (input.imdbId || input.tmdbId || input.id) : input;
        if (!rawId) return [];

        // ... TMDB Sorgu Bölümü (Aynı Kalıyor) ...
        const targetUrl = `${config.baseUrl}/ajan-zeta/`; // Test için sabit veya slugify

        // 2. İLK TEMAS: Session Başlatma ve Çerez Toplama
        const initRes = await fetch(targetUrl, { 
            headers: { 'User-Agent': deviceUA } 
        });
        const cookies = initRes.headers.get('set-cookie') || "";
        const html = await initRes.text();

        // 3. EMBED BULMA
        const embedMatch = html.match(/https?:\/\/hotstream\.club\/(?:embed|list|v)\/([a-zA-Z0-9]+)/i);
        if (!embedMatch) {
            console.error("[FilmciBaba] Embed linki bulunamadı. Site yapısı değişmiş olabilir.");
            return [];
        }

        const embedId = embedMatch[1];
        const embedUrl = `https://hotstream.club/embed/${embedId}`;

        // 4. CIHAZ DOĞRULAMA TAKLİDİ (Referer ve Cookie Zinciri)
        // WatchBuddy'nin yaptığı gibi auth/check aşamasını taklit ediyoruz
        const checkRes = await fetch(embedUrl, {
            headers: {
                'User-Agent': deviceUA,
                'Referer': targetUrl,
                'Cookie': cookies,
                'Sec-Fetch-Dest': 'iframe',
                'Sec-Fetch-Mode': 'navigate'
            }
        });
        const embedHtml = await checkRes.text();
        const embedCookies = checkRes.headers.get('set-cookie') || cookies;

        // 5. LIST LINKINI AYIKLAMA
        // Paylaştığın logdaki /list/ formatını arıyoruz
        const listMatch = embedHtml.match(/\/list\/([a-zA-Z0-9+/=_-]+)/i) || 
                         embedHtml.match(/["'](https?:\/\/hotstream\.club\/list\/[^"']+)["']/i);

        let results = [];
        if (listMatch) {
            const finalLink = listMatch[1].startsWith('http') ? listMatch[1] : `https://hotstream.club/list/${listMatch[1]}`;
            
            console.error(`[FilmciBaba] Link Çözüldü: ${finalLink.substring(0, 30)}...`);

            results.push({
                name: "HotStream (Verified Device)",
                url: finalLink,
                headers: { 
                    'User-Agent': deviceUA,
                    'Referer': embedUrl,
                    'Cookie': embedCookies,
                    'Origin': 'https://hotstream.club'
                }
            });
        }

        // 6. FALLBACK: PROXY MANTIĞI (Eğer hala 0 ise)
        if (results.length === 0) {
            // HTML içindeki gizli base64 veya json datayı ara
            const apiRegex = /source\s*:\s*["']([^"']+)["']/i;
            const apiMatch = embedHtml.match(apiRegex);
            if (apiMatch) {
                results.push({
                    name: "HotStream (API-Backup)",
                    url: apiMatch[1],
                    headers: { 'User-Agent': deviceUA, 'Referer': embedUrl }
                });
            }
        }

        console.error(`[FilmciBaba] Bitti. Bulunan: ${results.length}`);
        return results;

    } catch (e) {
        console.error(`[FilmciBaba] Hata: ${e.message}`);
        return [];
    }
}
