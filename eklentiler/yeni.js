/**
 * Nuvio Local Scraper - FilmciBaba (V27 - Full beload.php Parser)
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
        if (!str || str.length < 4) return null;
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        while (str.length % 4) str += '=';
        let decoded = atob(str);
        // Çift base64 kontrolü
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

// Gelişmiş beload.php parser
function parseBeload(jsCode) {
    const results = [];
    
    console.error("[FilmciBaba] beload.php uzunluk:", jsCode.length);
    console.error("[FilmciBaba] beload.php ilk 1000 karakter:", jsCode.substring(0, 1000));
    
    // 1. Direkt m3u8/mp4 URL'leri
    const directUrls = jsCode.match(/https?:\/\/[^"'\s]+\.(?:m3u8|mp4|ts|m4s)(?:\?[^"'\s]*)?/gi) || [];
    results.push(...directUrls);
    console.error("[FilmciBaba] Direkt URL bulunan:", directUrls.length);
    
    // 2. String concatenation (çok yaygın: "https://" + "cdn..." + "/playlist.m3u8")
    const concatPattern = /["'](https?:\/\/)["']\s*\+\s*["']([^"']+)["'](?:\s*\+\s*["']([^"']+)["'])?/g;
    let match;
    while ((match = concatPattern.exec(jsCode)) !== null) {
        let url = match[1] + match[2];
        if (match[3]) url += match[3];
        if (url.includes('.m3u8') || url.includes('.mp4')) {
            results.push(url);
        }
    }
    
    // 3. Hex encoded strings
    const hexPattern = /\\x([0-9a-fA-F]{2})/g;
    if (hexPattern.test(jsCode)) {
        try {
            let hexDecoded = jsCode.replace(/\\x([0-9a-fA-F]{2})/g, (m, p1) => 
                String.fromCharCode(parseInt(p1, 16))
            );
            const hexUrls = hexDecoded.match(/https?:\/\/[^"'\s]+\.(?:m3u8|mp4)/gi) || [];
            results.push(...hexUrls);
        } catch (e) {}
    }
    
    // 4. Unicode escapes
    const unicodePattern = /\\u([0-9a-fA-F]{4})/g;
    if (unicodePattern.test(jsCode)) {
        try {
            let unicodeDecoded = jsCode.replace(/\\u([0-9a-fA-F]{4})/g, (m, p1) => 
                String.fromCharCode(parseInt(p1, 16))
            );
            const unicodeUrls = unicodeDecoded.match(/https?:\/\/[^"'\s]+\.(?:m3u8|mp4)/gi) || [];
            results.push(...unicodeUrls);
        } catch (e) {}
    }
    
    // 5. Base64 encoded blocks (uzun stringler)
    const base64Blocks = jsCode.match(/["']([A-Za-z0-9+/=_-]{50,})["']/g) || [];
    for (const block of base64Blocks) {
        const encoded = block.replace(/["']/g, '');
        const decoded = decodeBase64(encoded);
        if (decoded && decoded.includes('http')) {
            const urls = decoded.match(/https?:\/\/[^"'\s]+/g) || [];
            results.push(...urls);
        }
    }
    
    // 6. Array/Dizi içinde URL'ler
    const arrayPattern = /\[\s*["'](https?:\/\/[^"']+)["']\s*\]/g;
    while ((match = arrayPattern.exec(jsCode)) !== null) {
        results.push(match[1]);
    }
    
    // 7. Object property'leri
    const objPattern = /(?:file|src|url|stream|source|video|hls|dash|mp4|m3u8)\s*:\s*["']([^"']+)["']/gi;
    while ((match = objPattern.exec(jsCode)) !== null) {
        if (match[1].includes('http')) {
            results.push(match[1]);
        }
    }
    
    // 8. fetch/XMLHttpRequest URL'leri
    const fetchPattern = /fetch\(["']([^"']+)["']\)/g;
    while ((match = fetchPattern.exec(jsCode)) !== null) {
        if (match[1].includes('http')) results.push(match[1]);
    }
    
    // 9. WebSocket URL'leri (bazen HLS proxy olarak kullanılır)
    const wsPattern = /wss?:\/\/[^"'\s]+/g;
    const wsMatches = jsCode.match(wsPattern) || [];
    results.push(...wsMatches);
    
    // 10. eval(atob(...)) içindeki kod
    const evalAtobPattern = /eval\((atob\(["']([A-Za-z0-9+/=_-]+)["']\))\)/;
    const evalMatch = jsCode.match(evalAtobPattern);
    if (evalMatch) {
        try {
            const decoded = decodeBase64(evalMatch[2]);
            if (decoded) {
                const innerUrls = decoded.match(/https?:\/\/[^"'\s]+\.(?:m3u8|mp4)/gi) || [];
                results.push(...innerUrls);
            }
        } catch (e) {}
    }
    
    // 11. JSONP callback'leri
    const jsonpPattern = /callback\((\{[\s\S]*?\})\)/;
    const jsonpMatch = jsCode.match(jsonpPattern);
    if (jsonpMatch) {
        try {
            const json = JSON.parse(jsonpMatch[1]);
            if (json.file || json.url || json.src) {
                results.push(json.file || json.url || json.src);
            }
            if (json.sources) {
                for (const s of json.sources) {
                    if (typeof s === 'string') results.push(s);
                    else if (s.file || s.src) results.push(s.file || s.src);
                }
            }
        } catch (e) {}
    }
    
    // 12. JWPlayer/Video.js setup config
    const setupPattern = /setup\((\{[\s\S]*?\})\)/;
    const setupMatch = jsCode.match(setupPattern);
    if (setupMatch) {
        try {
            let configStr = setupMatch[1]
                .replace(/'/g, '"')
                .replace(/(\w+):/g, '"$1":')
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']');
            const playerConfig = JSON.parse(configStr);
            if (playerConfig.file) results.push(playerConfig.file);
            if (playerConfig.sources) {
                for (const s of playerConfig.sources) {
                    if (typeof s === 'string') results.push(s);
                    else if (s.file) results.push(s.file);
                }
            }
            if (playerConfig.hls) results.push(playerConfig.hls);
            if (playerConfig.playlist) results.push(playerConfig.playlist);
        } catch (e) {}
    }
    
    // 13. document.write veya innerHTML içindeki URL'ler
    const docWritePattern = /document\.write\(["']([^"']+)["']\)/;
    const docMatch = jsCode.match(docWritePattern);
    if (docMatch) {
        const urls = docMatch[1].match(/https?:\/\/[^"'\s]+/g) || [];
        results.push(...urls);
    }
    
    // 14. iframe src'leri (dinamik oluşturulmuş)
    const iframeSrcPattern = /iframe\.src\s*=\s*["']([^"']+)["']/;
    const iframeMatch = jsCode.match(iframeSrcPattern);
    if (iframeMatch) {
        results.push(iframeMatch[1]);
    }
    
    // 15. location.href veya window.open
    const redirectPattern = /(?:location\.href|window\.open)\(["']([^"']+)["']\)/;
    const redirectMatch = jsCode.match(redirectPattern);
    if (redirectMatch) {
        results.push(redirectMatch[1]);
    }
    
    // Unique ve filtrele
    const unique = [...new Set(results)].filter(url => 
        url && 
        typeof url === 'string' &&
        url.startsWith('http') && 
        (url.includes('.m3u8') || url.includes('.mp4') || url.includes('.ts') || 
         url.includes('stream') || url.includes('playlist') || url.includes('manifest'))
    );
    
    console.error("[FilmciBaba] Toplam bulunan URL:", unique.length);
    return unique;
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
                
                // beload.php'yi bul ve çek
                const beloadMatch = embedHtml.match(/src=["']?(\/beload\.php[^"'\s]*)["']?/i);
                let videoUrls = [];
                
                if (beloadMatch) {
                    const beloadPath = beloadMatch[1];
                    const beloadUrl = beloadPath.startsWith('http') 
                        ? beloadPath 
                        : 'https://hotstream.club' + beloadPath;
                    
                    console.error("[FilmciBaba] beload.php bulundu:", beloadUrl);
                    
                    const beloadRes = await fetch(beloadUrl, {
                        headers: {
                            'User-Agent': ua,
                            'Referer': link,
                            'Accept': '*/*',
                            'Accept-Language': 'tr-TR,tr;q=0.9'
                        }
                    });
                    
                    if (beloadRes.ok) {
                        const beloadData = await beloadRes.text();
                        // Tam beload.php parse işlemi
                        videoUrls = parseBeload(beloadData);
                    } else {
                        console.error("[FilmciBaba] beload.php hatasi:", beloadRes.status);
                    }
                }
                
                // Fallback: Embed HTML'den de dene
                if (videoUrls.length === 0) {
                    videoUrls = parseBeload(embedHtml);
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
