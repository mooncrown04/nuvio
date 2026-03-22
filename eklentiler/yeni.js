/**
 * Nuvio Local Scraper - FilmciBaba (V23 - FIXED)
 */

const config = {
    name: "FilmciBaba",
    baseUrl: "https://izle.plus",
    apiUrl: "https://api.themoviedb.org/3",
    apiKey: "500330721680edb6d5f7f12ba7cd9023",
    id: "999b5a3c-bb95-571e-bd12-f5778eaecbfe"
};

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

async function getStreams(input) {
    try {
        console.error("[FilmciBaba] Sorgu Başladı...");
        
        let rawId = (typeof input === 'object' ? (input.imdbId || input.tmdbId) : input)?.toString();
        if (!rawId) throw new Error("Geçersiz ID");
        
        let imdbId = rawId.startsWith("tt") ? rawId : "tt" + rawId;
        let movie = null;
        
        // TMDB Find
        const findUrl = `${config.apiUrl}/find/${imdbId}?api_key=${config.apiKey}&external_source=imdb_id&language=tr-TR`;
        console.error("[FilmciBaba] TMDB Find:", findUrl);
        
        const tmdbRes = await fetch(findUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!tmdbRes.ok) throw new Error(`TMDB Hata: ${tmdbRes.status}`);
        
        const tmdbData = await tmdbRes.json();
        movie = tmdbData.movie_results?.[0] || tmdbData.tv_results?.[0];

        // Fallback
        if (!movie) {
            console.error("[FilmciBaba] Fallback deneniyor...");
            for (const type of ['movie', 'tv']) {
                const res = await fetch(
                    `${config.apiUrl}/${type}/${rawId}?api_key=${config.apiKey}&language=tr-TR`,
                    { headers: { 'Accept': 'application/json' } }
                );
                if (res.ok) {
                    movie = await res.json();
                    break;
                }
            }
        }

        if (!movie) throw new Error("İçerik bulunamadı.");

        const movieTitle = movie.title || movie.name;
        const releaseYear = (movie.release_date || movie.first_air_date || "").substring(0, 4);
        
        console.error("[FilmciBaba] Film:", movieTitle, releaseYear);

        // URL oluştur
        const slug = createSlug(movieTitle);
        const targetUrl = `${config.baseUrl}/${slug}/`;
        
        const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
        
        // Sayfayı çek
        console.error("[FilmciBaba] Sayfa yükleniyor:", targetUrl);
        
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': ua,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const html = await response.text();
        
        // Çerez al
        const setCookie = response.headers.get('set-cookie');
        const cookie = setCookie ? setCookie.split(';')[0] : "";
        console.error("[FilmciBaba] Cookie:", cookie ? "Var" : "Yok");

        // Embed URL'lerini bul - GELİŞTİRİLMİŞ PATTERN
        // Önce iframe src'lerini bul
        const iframeMatches = html.match(/<iframe[^>]+src=["']([^"']+)["']/gi) || [];
        const srcMatches = iframeMatches.map(tag => {
            const match = tag.match(/src=["']([^"']+)["']/);
            return match ? match[1] : null;
        }).filter(Boolean);
        
        // HotStream patternleri
        const hotstreamPatterns = [
            /https:\/\/hotstream\.club\/embed\/[a-zA-Z0-9+/=]+/gi,
            /https:\/\/hotstream\.club\/list\/[a-zA-Z0-9+/=]+/gi,
            /https:\/\/hotstream\.club\/[a-zA-Z0-9+/=]+/gi,
            /\/\/hotstream\.club\/[^"'\s]+/gi
        ];
        
        let allMatches = [...srcMatches];
        
        for (const pattern of hotstreamPatterns) {
            const matches = html.match(pattern) || [];
            allMatches = allMatches.concat(matches);
        }
        
        // // ile başlayanları https:// yap
        allMatches = allMatches.map(url => 
            url.startsWith('//') ? 'https:' + url : url
        );
        
        // Unique ve geçerli URL'ler
        const uniqueLinks = [...new Set(allMatches)].filter(url => 
            url.includes('hotstream') && url.startsWith('http')
        );

        console.error("[FilmciBaba] Bulunan link:", uniqueLinks.length);
        if (uniqueLinks.length === 0) {
            console.error("[FilmciBaba] HTML snippet:", html.substring(0, 3000));
            return [];
        }

        let streams = [];
        
        for (const link of uniqueLinks) {
            try {
                console.error("[FilmciBaba] İşleniyor:", link);
                
                // Önce embed sayfasını çek ve gerçek m3u8/video URL'sini bul
                const embedHeaders = {
                    'User-Agent': ua,
                    'Referer': targetUrl,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'tr-TR,tr;q=0.9'
                };
                
                if (cookie) embedHeaders['Cookie'] = cookie;
                
                // Embed sayfasını al
                const embedRes = await fetch(link, { headers: embedHeaders });
                
                if (!embedRes.ok) {
                    console.error("[FilmciBaba] Embed hatası:", embedRes.status);
                    continue;
                }
                
                const embedHtml = await embedRes.text();
                
                // Video URL'sini bul (m3u8, mp4, veya başka embed)
                const videoPatterns = [
                    /["'](https:\/\/[^"']*\.m3u8[^"']*)["']/gi,
                    /["'](https:\/\/[^"']*\.mp4[^"']*)["']/gi,
                    /src:\s*["']([^"']+)["']/gi,
                    /file:\s*["']([^"']+)["']/gi,
                    /sources:\s*\[\s*{[^}]*file:\s*["']([^"']+)["']/gi,
                    /var\s+source\s*=\s*["']([^"']+)["']/gi,
                    /var\s+videoUrl\s*=\s*["']([^"']+)["']/gi,
                    /var\s+url\s*=\s*["']([^"']+)["']/gi
                ];
                
                let videoUrl = null;
                for (const pattern of videoPatterns) {
                    const matches = [...embedHtml.matchAll(pattern)];
                    for (const match of matches) {
                        const url = match[1];
                        if (url && (url.includes('.m3u8') || url.includes('.mp4') || url.includes('http'))) {
                            videoUrl = url;
                            break;
                        }
                    }
                    if (videoUrl) break;
                }
                
                // Eğer video URL bulunamazsa, orijinal linki kullan (list/embed ise)
                if (!videoUrl) {
                    if (link.includes('/list/') || link.includes('.m3u8')) {
                        videoUrl = link;
                    } else {
                        // JWPlayer veya benzeri olabilir, script'i parse et
                        const scriptMatch = embedHtml.match(/sources:\s*(\[[^\]]+\])/);
                        if (scriptMatch) {
                            try {
                                const sources = JSON.parse(scriptMatch[1].replace(/'/g, '"'));
                                videoUrl = sources[0]?.file || sources[0]?.src;
                            } catch (e) {}
                        }
                    }
                }
                
                if (!videoUrl) {
                    console.error("[FilmciBaba] Video URL bulunamadı");
                    continue;
                }
                
                console.error("[FilmciBaba] Video URL:", videoUrl);
                
                // Final headers
                const headers = {
                    'User-Agent': ua,
                    'Referer': link, // Embed sayfası referer
                    'Origin': 'https://hotstream.club'
                };
                
                if (cookie) headers['Cookie'] = cookie;
                
                // Pipe URL formatı
                let pipeUrl = `${videoUrl}|User-Agent=${encodeURIComponent(ua)}&Referer=${encodeURIComponent(link)}`;
                if (cookie) pipeUrl += `&Cookie=${encodeURIComponent(cookie)}`;

                streams.push({
                    name: "FilmciBaba",
                    title: `${movieTitle} ${releaseYear ? `(${releaseYear})` : ''}`,
                    url: pipeUrl,
                    rawUrl: videoUrl,
                    isM3u8: videoUrl.includes('.m3u8') || videoUrl.includes('/list/'),
                    headers: headers
                });
                
            } catch (err) {
                console.error("[FilmciBaba] Link hatası:", err.message);
            }
        }

        console.error("[FilmciBaba] Toplam stream:", streams.length);
        return streams;

    } catch (error) {
        console.error("[FilmciBaba] Hata:", error.message);
        return [];
    }
}

module.exports = { getStreams, config };
