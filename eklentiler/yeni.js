/**
 * Nuvio Local Scraper - FilmciBaba (V24-FIXED)
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

function decodeBase64(str) {
    try {
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) str += '=';
        return atob(str);
    } catch (e) {
        return null;
    }
}

function extractFromJS(jsCode) {
    const results = [];
    
    let match = jsCode.match(/var\s+(?:source|src|url|file|videoUrl|stream)\s*=\s*["']([^"']+)["']/i);
    if (match) results.push(match[1]);
    
    const atobMatches = jsCode.match(/atob\(["']([A-Za-z0-9+/=_-]+)["']\)/g) || [];
    for (const m of atobMatches) {
        const encoded = m.match(/atob\(["']([^"']+)["']\)/)?.[1];
        if (encoded) {
            const decoded = decodeBase64(encoded);
            if (decoded && (decoded.includes('http') || decoded.includes('.m3u8'))) {
                results.push(decoded);
            }
        }
    }
    
    const evalMatches = jsCode.match(/eval\(atob\(["']([A-Za-z0-9+/=_-]+)["']\)\)/g) || [];
    for (const m of evalMatches) {
        const encoded = m.match(/eval\(atob\(["']([^"']+)["']\)\)/)?.[1];
        if (encoded) {
            const decoded = decodeBase64(encoded);
            if (decoded) {
                const innerMatches = decoded.match(/https?:\/\/[^"'\s]+\.m3u8/g) || 
                                    decoded.match(/https?:\/\/[^"'\s]+/g) || [];
                results.push(...innerMatches);
            }
        }
    }
    
    const jsonMatches = jsCode.match(/JSON\.parse\(atob\(["']([A-Za-z0-9+/=_-]+)["']\)\)/g) || [];
    for (const m of jsonMatches) {
        const encoded = m.match(/JSON\.parse\(atob\(["']([^"']+)["']\)\)/)?.[1];
        if (encoded) {
            try {
                const decoded = decodeBase64(encoded);
                const json = JSON.parse(decoded);
                if (json.file || json.src || json.url || json.stream) {
                    results.push(json.file || json.src || json.url || json.stream);
                }
                if (json.sources && Array.isArray(json.sources)) {
                    for (const src of json.sources) {
                        if (typeof src === 'string') results.push(src);
                        else if (src.file || src.src) results.push(src.file || src.src);
                    }
                }
            } catch (e) {}
        }
    }
    
    const sourcesMatch = jsCode.match(/sources\s*:\s*(\[[^\]]+\])/);
    if (sourcesMatch) {
        try {
            const fixed = sourcesMatch[1]
                .replace(/'/g, '"')
                .replace(/(\w+):/g, '"$1":')
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']');
            const sources = JSON.parse(fixed);
            for (const src of sources) {
                if (typeof src === 'string') results.push(src);
                else if (src.file || src.src) results.push(src.file || src.src);
            }
        } catch (e) {}
    }
    
    return [...new Set(results)];
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
        
        const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
        
        console.error("[FilmciBaba] Sayfa yukleniyor:", targetUrl);
        
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
        
        const setCookie = response.headers.get('set-cookie');
        const cookie = setCookie ? setCookie.split(';')[0] : "";
        console.error("[FilmciBaba] Cookie:", cookie ? "Var" : "Yok");

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
                
                const embedHeaders = {
                    'User-Agent': ua,
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
                
                let videoUrls = extractFromJS(embedHtml);
                
                if (videoUrls.length === 0) {
                    const videoPatterns = [
                        /["'](https:\/\/[^"']*\.m3u8[^"']*)["']/gi,
                        /["'](https:\/\/[^"']*\.mp4[^"']*)["']/gi,
                        /src:\s*["']([^"']+)["']/gi,
                        /file:\s*["']([^"']+)["']/gi
                    ];
                    
                    for (const pattern of videoPatterns) {
                        const matches = [...embedHtml.matchAll(pattern)];
                        for (const match of matches) {
                            if (match[1] && !videoUrls.includes(match[1])) {
                                videoUrls.push(match[1]);
                            }
                        }
                    }
                }
                
                if (videoUrls.length === 0 && (link.includes('/list/') || link.includes('.m3u8'))) {
                    videoUrls.push(link);
                }
                
                if (videoUrls.length === 0) {
                    console.error("[FilmciBaba] Video URL bulunamadi");
                    continue;
                }
                
                for (const videoUrl of videoUrls) {
                    console.error("[FilmciBaba] Video URL:", videoUrl);
                    
                    const headers = {
                        'User-Agent': ua,
                        'Referer': link,
                        'Origin': 'https://hotstream.club'
                    };
                    
                    if (cookie) headers['Cookie'] = cookie;
                    
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
