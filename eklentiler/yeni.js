/**
 * Nuvio Local Scraper - FilmciBaba (V22-FIXED - Cookie Persistence)
 */

const config = {
    name: "FilmciBaba",
    baseUrl: "https://izle.plus",
    apiUrl: "https://api.themoviedb.org/3",
    apiKey: "500330721680edb6d5f7f12ba7cd9023",
    id: "999b5a3c-bb95-571e-bd12-f5778eaecbfe"
};

// Gelişmiş slug oluşturucu
function createSlug(title) {
    const turkishMap = {
        'ğ': 'g', 'ü': 'u', 'ş': 's', 'ı': 'i', 'ö': 'o', 'ç': 'c',
        'Ğ': 'G', 'Ü': 'U', 'Ş': 'S', 'I': 'I', 'Ö': 'O', 'Ç': 'C'
    };
    
    return title
        .split('')
        .map(char => turkishMap[char] || char)
        .join('')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Cookie parser yardımcı fonksiyonu
function parseCookies(setCookieHeader) {
    if (!setCookieHeader) return "";
    
    // Array veya string olabilir
    const cookies = Array.isArray(setCookieHeader) 
        ? setCookieHeader 
        : [setCookieHeader];
    
    // Sadece name=value kısımlarını al, expires/path gibi attribute'ları at
    return cookies
        .map(cookie => cookie.split(';')[0].trim())
        .filter(cookie => cookie.includes('='))
        .join('; ');
}

async function getStreams(input) {
    try {
        console.error("[FilmciBaba] Sorgu Başladı...");
        
        // ID işleme
        let rawId = (typeof input === 'object' ? (input.imdbId || input.tmdbId) : input)?.toString();
        if (!rawId) throw new Error("Geçersiz ID");
        
        let imdbId = rawId.startsWith("tt") ? rawId : "tt" + rawId;
        
        let movie = null;
        
        // TMDB Find API
        const findUrl = `${config.apiUrl}/find/${imdbId}?api_key=${config.apiKey}&external_source=imdb_id&language=tr-TR`;
        console.error("[FilmciBaba] TMDB Find:", findUrl);
        
        const tmdbRes = await fetch(findUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0'
            }
        });
        
        if (!tmdbRes.ok) {
            throw new Error(`TMDB Find API Hatası: ${tmdbRes.status}`);
        }
        
        const tmdbData = await tmdbRes.json();
        
        movie = (tmdbData.movie_results?.[0]) || 
                (tmdbData.tv_results?.[0]) ||
                (tmdbData.tv_episode_results?.[0]);

        // Fallback: Direkt movie/tv sorgusu
        if (!movie) {
            console.error("[FilmciBaba] Fallback sorgusu deneniyor...");
            
            // Önce movie dene
            let fallbackRes = await fetch(
                `${config.apiUrl}/movie/${rawId}?api_key=${config.apiKey}&language=tr-TR`,
                { headers: { 'Accept': 'application/json' } }
            );
            
            if (fallbackRes.ok) {
                movie = await fallbackRes.json();
            } else {
                // TV dene
                fallbackRes = await fetch(
                    `${config.apiUrl}/tv/${rawId}?api_key=${config.apiKey}&language=tr-TR`,
                    { headers: { 'Accept': 'application/json' } }
                );
                if (fallbackRes.ok) {
                    movie = await fallbackRes.json();
                }
            }
        }

        if (!movie || (!movie.title && !movie.name)) {
            throw new Error("İçerik bulunamadı.");
        }

        const movieTitle = movie.title || movie.name;
        const releaseYear = movie.release_date?.substring(0, 4) || 
                           movie.first_air_date?.substring(0, 4) || "";
        
        console.error("[FilmciBaba] Film:", movieTitle, releaseYear ? `(${releaseYear})` : "");

        // Slug oluştur (yıl ekleme opsiyonu)
        let slug = createSlug(movieTitle);
        
        // Bazı siteler yıl ekler: film-adi-2024
        const slugWithYear = releaseYear ? `${slug}-${releaseYear}` : slug;
        
        // Önce yılsız dene, bulamazsan yıllıyı dene
        const possibleUrls = [
            `${config.baseUrl}/${slug}/`,
            `${config.baseUrl}/film/${slug}/`,
            `${config.baseUrl}/${slugWithYear}/`,
            `${config.baseUrl}/film/${slugWithYear}/`,
            `${config.baseUrl}/dizi/${slug}/`,
            `${config.baseUrl}/dizi/${slugWithYear}/`
        ];

        const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
        
        let html = null;
        let finalUrl = null;
        let finalCookie = "";
        
        // URL'leri dene
        for (const targetUrl of possibleUrls) {
            try {
                console.error("[FilmciBaba] Deneniyor:", targetUrl);
                
                const response = await fetch(targetUrl, {
                    method: 'GET',
                    headers: {
                        'User-Agent': ua,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Cache-Control': 'max-age=0'
                    },
                    redirect: 'follow'
                });
                
                if (response.ok) {
                    html = await response.text();
                    
                    // Çerezleri parse et
                    const setCookie = response.headers.get('set-cookie');
                    finalCookie = parseCookies(setCookie);
                    
                    finalUrl = targetUrl;
                    console.error("[FilmciBaba] Başarılı! URL:", targetUrl);
                    console.error("[FilmciBaba] Cookie:", finalCookie ? "Var" : "Yok");
                    break;
                }
            } catch (e) {
                console.error("[FilmciBaba] URL başarısız:", targetUrl, e.message);
                continue;
            }
        }

        if (!html) {
            throw new Error("Film sayfasına ulaşılamadı.");
        }

        // HotStream linklerini bul - gelişmiş regex
        const patterns = [
            /https:\/\/hotstream\.club\/(?:list|embed)\/[a-zA-Z0-9+/=]+/gi,
            /https:\/\/hotstream\.club\/(?:list|embed)\/[a-zA-Z0-9_-]+/gi,
            /["']?(https:\/\/[^"']*hotstream[^"']*)/gi,
            /data-src=["'](https:\/\/hotstream\.club\/[^"']+)["']/gi,
            /iframe[^>]+src=["'](https:\/\/hotstream\.club\/[^"']+)["']/gi
        ];
        
        let allMatches = [];
        for (const pattern of patterns) {
            const matches = html.match(pattern) || [];
            allMatches = allMatches.concat(matches);
        }
        
        // Temizle ve unique yap
        const uniqueLinks = [...new Set(
            allMatches
                .map(link => link.replace(/["']/g, ''))
                .filter(link => link.includes('hotstream'))
        )];

        console.error("[FilmciBaba] Bulunan link sayısı:", uniqueLinks.length);

        if (uniqueLinks.length === 0) {
            console.error("[FilmciBaba] HTML snippet:", html.substring(0, 2000));
            return [];
        }

        let streams = [];
        
        for (const link of uniqueLinks) {
            try {
                // Temel headers
                const headers = {
                    'User-Agent': ua,
                    'Referer': finalUrl,
                    'Origin': config.baseUrl,
                    'Accept': '*/*',
                    'Accept-Language': 'tr-TR,tr;q=0.9',
                    'Connection': 'keep-alive',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'cross-site'
                };
                
                // Cookie ekle
                if (finalCookie) {
                    headers['Cookie'] = finalCookie;
                }

                // Nuvio formatında URL oluştur
                let pipeUrl = `${link}|User-Agent=${encodeURIComponent(ua)}&Referer=${encodeURIComponent(finalUrl)}`;
                
                if (finalCookie) {
                    pipeUrl += `&Cookie=${encodeURIComponent(finalCookie)}`;
                }

                // Ekstra header'lar (bazı player'lar için)
                const extraHeaders = {
                    ...headers,
                    'X-Requested-With': 'XMLHttpRequest'
                };

                streams.push({
                    name: "FilmciBaba (HotStream)",
                    title: `${movieTitle} ${releaseYear ? `(${releaseYear})` : ''}`,
                    url: pipeUrl,
                    rawUrl: link, // Orijinal URL (debug için)
                    isM3u8: link.includes("/list/"),
                    headers: headers,
                    extraHeaders: extraHeaders,
                    metadata: {
                        tmdbId: movie.id,
                        imdbId: imdbId,
                        title: movieTitle,
                        year: releaseYear,
                        poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null
                    }
                });
                
            } catch (linkError) {
                console.error("[FilmciBaba] Link işleme hatası:", link, linkError.message);
            }
        }

        console.error("[FilmciBaba] Toplam stream:", streams.length);
        return streams;

    } catch (error) {
        console.error("[FilmciBaba] Kritik Hata:", error.message);
        console.error("[FilmciBaba] Stack:", error.stack);
        return [];
    }
}

// Test fonksiyonu (debug için)
async function test(imdbId = "tt0137523") { // Fight Club
    console.error("=== TEST BAŞLADI ===");
    const result = await getStreams(imdbId);
    console.error("=== SONUÇ ===");
    console.error(JSON.stringify(result, null, 2));
    return result;
}

module.exports = { getStreams, config, test };
