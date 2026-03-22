/**
 * Nuvio Local Scraper - FilmciBaba (V28 - SmartTV User-Agent)
 */

const config = {
    name: "FilmciBaba",
    baseUrl: "https://izle.plus",
    apiUrl: "https://api.themoviedb.org/3",
    apiKey: "500330721680edb6d5f7f12ba7cd9023",
    id: "999b5a3c-bb95-571e-bd12-f5778eaecbfe"
};

// SmartTV User-Agent'ları (beload.php bunları gördüğünde video URL döndürüyor)
const TV_USER_AGENTS = [
    "Mozilla/5.0 (SMART-TV; Linux; Tizen 2.3) AppleWebKit/538.1 (KHTML, like Gecko) Version/2.3 TV Safari/538.1",
    "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/38.0.2125.122 Safari/537.36 WebAppManager",
    "Mozilla/5.0 (CrKey armv7l 1.5.16041) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux armv7l) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.152 Safari/537.36 OPR/29.0.1803.0 OMI/4.5.22.37.ALSAN3.3",
    "Mozilla/5.0 (Linux; Android 5.0; Nexus Player Build/LMY47D) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.152 Safari/537.36",
    "Mozilla/5.0 (PlayStation 4 3.11) AppleWebKit/537.73 (KHTML, like Gecko)",
    "Mozilla/5.0 (X11; U; Linux i686; en-US) AppleWebKit/533.4 (KHTML, like Gecko) Chrome/5.0.375.127 Large Screen Safari/533.4 GoogleTV/162671",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36" // Fallback
];

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

function decodeBase64(str) {
    try {
        if (!str || str.length < 4) return null;
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) str += '=';
        let decoded = atob(str);
        if (/^[A-Za-z0-9+/=]+$/.test(decoded) && decoded.length > 20) {
            try {
                const second = atob(decoded);
                if (second.includes('http')) return second;
            } catch (e) {}
        }
        return decoded;
    } catch (e) {
        return null;
    }
}

function extractVideoUrls(text) {
    const results = [];
    
    // Direkt m3u8/mp4
    const directUrls = text.match(/https?:\/\/[^"'\s]+\.(?:m3u8|mp4|ts|m4s)(?:\?[^"'\s]*)?/gi) || [];
    results.push(...directUrls);
    
    // Base64 bloklar
    const base64Blocks = text.match(/["']([A-Za-z0-9+/=_-]{50,})["']/g) || [];
    for (const block of base64Blocks) {
        const encoded = block.replace(/["']/g, '');
        const decoded = decodeBase64(encoded);
        if (decoded && decoded.includes('http')) {
            const urls = decoded.match(/https?:\/\/[^"'\s]+/g) || [];
            results.push(...urls);
        }
    }
    
    // JSON içindeki URL'ler
    try {
        const jsonMatches = text.match(/\{[\s\S]*?\}/g) || [];
        for (const jsonStr of jsonMatches) {
            try {
                const obj = JSON.parse(jsonStr);
                if (obj.file || obj.url || obj.src || obj.stream) {
                    results.push(obj.file || obj.url || obj.src || obj.stream);
                }
                if (obj.sources && Array.isArray(obj.sources)) {
                    for (const s of obj.sources) {
                        if (typeof s === 'string') results.push(s);
                        else if (s.file || s.src) results.push(s.file || s.src);
                    }
                }
            } catch (e) {}
        }
    } catch (e) {}
    
    // String concatenation
    const concatPattern = /["'](https?:\/\/)["']\s*\+\s*["']([^"']+)["'](?:\s*\+\s*["']([^"']+)["'])?/g;
    let match;
    while ((match = concatPattern.exec(text)) !== null) {
        let url = match[1] + match[2];
        if (match[3]) url += match[3];
        if (url.includes('.m3u8') || url.includes('.mp4')) {
            results.push(url);
        }
    }
    
    return [...new Set(results)].filter(url => 
        url && url.startsWith('http') && 
        (url.includes('.m3u8') || url.includes('.mp4') || url.includes('.ts') || url.includes('stream'))
    );
}

async function getStreams(input) {
    try {
        console.error("[FilmciBaba] Sorgu Basladi...");
        
        let rawId = (typeof input === 'object' ? (input.imdbId || input.tmdbId) : input)?.toString();
        if (!rawId) throw new Error("Gecersiz ID");
        
        let imdbId = rawId.startsWith("tt") ? rawId : "tt" + rawId;
        let movie = null;
        
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

        if (!movie) throw new Error("Icerik bulunamadi.");

        const movieTitle = movie.title || movie.name;
        const releaseYear = (movie.release_date || movie.first_air_date || "").substring(0, 4);
        
        console.error("[FilmciBaba] Film:", movieTitle, releaseYear);

        const slug = createSlug(movieTitle);
        const targetUrl = `${config.baseUrl}/${slug}/`;
        
        // Normal tarayıcı UA (izle.plus için)
        const normalUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
        
        console.error("[FilmciBaba] Sayfa yukleniyor:", targetUrl);
        
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': normalUA,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const html = await response.text();
        
        const setCookie = response.headers.get('set-cookie');
        const cookie = setCookie ? setCookie.split(';')[0] : "";
        console.error("[FilmciBaba] Cookie:", cookie ? "Var" : "Yok");

        // Embed URL'lerini bul
        const iframeMatches = html.match(/<iframe[^>]+src=["']([^"']+)["']/gi) || [];
        const srcMatches = iframeMatches.map(tag => {
            const match = tag.match(/src=["']([^"']+)["']/);
            return match ? match[1] : null;
        }).filter(Boolean);
        
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
        
        allMatches = allMatches.map(url => 
            url.startsWith('//') ? 'https:' + url : url
        );
        
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
                console.error("[FilmciBaba] Isleniyor:", link);
                
                // Önce normal UA ile embed sayfasını çek
                const embedHeaders = {
                    'User-Agent': normalUA,
                    'Referer': targetUrl,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'tr-TR,tr;q=0.9'
                };
                
                if (cookie) embedHeaders['Cookie'] = cookie;
                
                const embedRes = await fetch(link, { headers: embedHeaders });
                
                if (!embedRes.ok) {
                    console.error("[FilmciBaba] Embed hatasi:", embedRes.status);
                    continue;
                }
                
                const embedHtml = await embedRes.text();
                
                // beload.php'yi bul
                const beloadMatch = embedHtml.match(/src=["']?(\/beload\.php[^"'\s]*)["']?/i);
                let videoUrls = [];
                
                if (beloadMatch) {
                    const beloadPath = beloadMatch[1];
                    const beloadUrl = beloadPath.startsWith('http') 
                        ? beloadPath 
                        : 'https://hotstream.club' + beloadPath;
                    
                    console.error("[FilmciBaba] beload.php bulundu:", beloadUrl);
                    
                    // FARKLI TV USER-AGENT'LERİ DENE!
                    for (const tvUA of TV_USER_AGENTS) {
                        console.error("[FilmciBaba] TV UA deneniyor:", tvUA.substring(0, 50) + "...");
                        
                        const beloadRes = await fetch(beloadUrl, {
                            headers: {
                                'User-Agent': tvUA,
                                'Referer': link,
                                'Accept': '*/*',
                                'Accept-Language': 'tr-TR,tr;q=0.9'
                            }
                        });
                        
                        if (beloadRes.ok) {
                            const beloadData = await beloadRes.text();
                            console.error("[FilmciBaba] beload.php yanit uzunluk:", beloadData.length);
                            
                            // Eğer yanıt kısaysa ve JSON ise
                            if (beloadData.length < 1000) {
                                console.error("[FilmciBaba] beload.php yanit:", beloadData.substring(0, 500));
                            }
                            
                            // URL'leri çıkar
                            const urls = extractVideoUrls(beloadData);
                            if (urls.length > 0) {
                                console.error("[FilmciBaba] URL bulundu! UA:", tvUA.substring(0, 30));
                                videoUrls.push(...urls);
                                break; // Başarılı UA bulundu, döngüden çık
                            }
                        }
                    }
                }
                
                // Fallback: Embed HTML'den dene
                if (videoUrls.length === 0) {
                    videoUrls = extractVideoUrls(embedHtml);
                }
                
                // Son çare: Orijinal link
                if (videoUrls.length === 0 && (link.includes('/list/') || link.includes('.m3u8'))) {
                    videoUrls.push(link);
                }
                
                if (videoUrls.length === 0) {
                    console.error("[FilmciBaba] Video URL bulunamadi");
                    continue;
                }
                
                for (const videoUrl of videoUrls) {
                    console.error("[FilmciBaba] Video URL:", videoUrl.substring(0, 100));
                    
                    const headers = {
                        'User-Agent': normalUA,
                        'Referer': link,
                        'Origin': 'https://hotstream.club'
                    };
                    
                    if (cookie) headers['Cookie'] = cookie;
                    
                    let pipeUrl = `${videoUrl}|User-Agent=${encodeURIComponent(normalUA)}&Referer=${encodeURIComponent(link)}`;
                    if (cookie) pipeUrl += `&Cookie=${encodeURIComponent(cookie)}`;

                    streams.push({
                        name: "FilmciBaba",
                        title: `${movieTitle} ${releaseYear ? `(${releaseYear})` : ''}`,
                        url: pipeUrl,
                        rawUrl: videoUrl,
                        isM3u8: videoUrl.includes('.m3u8') || videoUrl.includes('/list/') || videoUrl.includes('playlist'),
                        headers: headers
                    });
                }
                
            } catch (err) {
                console.error("[FilmciBaba] Link hatasi:", err.message);
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
