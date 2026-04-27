/* * SERVİS: STREAMIMDB (DEBUG MODU)
 * AÇIKLAMA: Tüm istekleri sabit bir test linkine yönlendirir ve ham verileri loglar.
 * Sürüm: 9.0.0-DEBUG-RAW-DATA
 */

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        // 1. TMDB İsteği ve Ham Veri Loglama
        const typePath = (mediaType === 'movie') ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${typePath}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`;
        
        const tmdbRes = await fetch(tmdbUrl);
        const rawTmdbData = await tmdbRes.json();
        
        // KRİTİK: TMDB'den gelen tüm ham veri
        console.error('[DEBUG] TMDB HAM VERI:', JSON.stringify(rawTmdbData));

        // 2. Yönlendirme ve Sabit Link Testi
        // Kullanıcı isteği ne olursa olsun bu linke zorluyoruz
        const targetUrl = "https://streamimdb.me/embed/tt1270797";
        console.error('[DEBUG] Hedef Linke Zorlanıyor:', targetUrl);

        // 3. Hedef Siteden Ham Yanıt Başlıklarını Alalım
        try {
            const checkRes = await fetch(targetUrl, { 
                method: 'GET',
                headers: { 'User-Agent': 'Mozilla/5.0' } 
            });

            // KRİTİK: Siteden gelen HTTP yanıtı ve Content-Type
            console.error('[DEBUG] Site Yanıt Kodu:', checkRes.status);
            console.error('[DEBUG] Site Content-Type:', checkRes.headers.get('content-type'));
            
            // Sayfanın ilk 500 karakterini çekip ham metne bakalım (Hata mesajı var mı?)
            const rawHtmlSample = await checkRes.text();
            console.error('[DEBUG] Site Ham Metin (İlk 500 Karakter):', rawHtmlSample.substring(0, 500));

            return [{
                name: "TEST MODU: " + (rawTmdbData.title || rawTmdbData.name || "Bilinmeyen"),
                title: `⌜ DEBUG ⌟ | STREAMIMDB TEST`,
                url: targetUrl,
                quality: "Auto",
                headers: {
                    'Referer': 'https://streamimdb.me/',
                    'User-Agent': 'Mozilla/5.0'
                },
                provider: 'streamimdb'
            }];

        } catch (linkErr) {
            console.error('[DEBUG] Siteye Erişilirken Hata Oluştu:', linkErr.message);
            return [];
        }

    } catch (e) {
        console.error('[DEBUG] Genel Sistem Hatası:', e.message);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
