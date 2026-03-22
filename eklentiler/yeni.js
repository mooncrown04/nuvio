/**
 * Nuvio Local Scraper - FilmciBaba (V25 - Advanced Deobfuscation)
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

// Gelişmiş Base64 decoder (URL-safe ve standart)
function decodeBase64(str) {
    try {
        if (!str || str.length < 4) return null;
        
        // URL-safe karakterleri düzelt
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        
        // Padding ekle
        while (str.length % 4) str += '=';
        
        // Standart base64
        let decoded = atob(str);
        
        // Eğer hala base64 gibi görünüyorsa (tekrar şifrelenmiş olabilir)
        if (/^[A-Za-z0-9+/=]+$/.test(decoded) && decoded.length > 20) {
            try {
                const second = atob(decoded);
                if (second.includes('http') || second.includes('//')) {
                    return second;
                }
            } catch (e) {}
        }
        
        return decoded;
    } catch (e) {
        return null;
    }
}

// Tüm script taglerini çıkar ve birleştir
function extractAllScripts(html) {
    const scripts = [];
    
    // <script> tagleri
    const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const script of scriptMatches) {
        const content = script.replace(/<script[^>]*>|<\/script>/gi, '');
        if (content.trim()) scripts.push(content);
    }
    
    // onclick, onload vb event handlerlar
    const eventMatches = html.match(/\s(on\w+)\s*=\s*["']([^"']+)["']/gi) || [];
    for (const evt of eventMatches) {
        const match = evt.match(/\s(on\w+)\s*=\s*["']([^"']+)["']/i);
        if (match) scripts.push(match[2]);
    }
    
    // data-* attribute'ları
    const dataMatches = html.match(/data-[a-z-]+\s*=\s*["']([^"']+)["']/gi) || [];
    for (const data of dataMatches) {
        const match = data.match(/data-[a-z-]+\s*=\s*["']([^"']+)["']/i);
        if (match && match[1].length > 20) scripts.push(match[1]);
    }
    
    return scripts.join('\n');
}

// Gelişmiş video URL çıkarıcı
function extractVideoUrls(jsCode, html) {
    const results = [];
    
    // 1. Direkt m3u8/mp4 URL'leri
    const directUrls = jsCode.match(/https?:\/\/[^"'\s]+\.(?:m3u8|mp4|ts|m4s)(?:\?[^"'\s]*)?/gi) || [];
    results.push(...directUrls);
    
    // 2. Base64 encoded URL'ler (atob ile)
    const atobPattern = /atob\(["']([A-Za-z0-9+/=_-]+)["']\)/g;
    let match;
    while ((match = atobPattern.exec(jsCode)) !== null) {
        const decoded = decodeBase64(match[1]);
        if (decoded) {
            const urls = decoded.match(/https?:\/\/[^"'\s]+/g) || [];
            results.push(...urls);
            if (decoded.includes('http')) results.push(decoded);
        }
    }
    
    // 3. eval(atob(...)) pattern
    const evalAtobPattern = /eval\((atob\(["']([A-Za-z0-9+/=_-]+)["']\))\)/g;
    while ((match = evalAtobPattern.exec(jsCode)) !== null) {
        try {
            const decoded = decodeBase64(match[2]);
            if (decoded) {
                // Deobfuscated kodu çalıştır ve URL'leri bul
                const urls = decoded.match(/https?:\/\/[^"'\s]+\.(?:m3u8|mp4|ts)/gi) || 
                           decoded.match(/https?:\/\/[^"'\s]+/gi) || [];
                results.push(...urls);
                
                // JSON array olabilir
                if (decoded.includes('[') && decoded.includes(']')) {
                    try {
                        const arr = JSON.parse(decoded);
                        if (Array.isArray(arr)) {
                            for (const item of arr) {
                                if (typeof item === 'string' && item.includes('http')) {
                                    results.push(item);
                                } else if (item && (item.file || item.src || item.url)) {
                                    results.push(item.file || item.src || item.url);
                                }
                            }
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {}
    }
    
    // 4. JSON.parse(atob(...))
    const jsonAtobPattern = /JSON\.parse\((atob\(["']([A-Za-z0-9+/=_-]+)["']\))\)/g;
    while ((match = jsonAtobPattern.exec(jsCode)) !== null) {
        try {
            const decoded = decodeBase64(match[2]);
            if (decoded) {
                const json = JSON.parse(decoded);
                extractUrlsFromObject(json, results);
            }
        } catch (e) {}
    }
    
    // 5. Obfuscated string concatenation
    const concatPattern = /["'](https?)["']\s*\+\s*["']([^"']+)["']/g;
    while ((match = concatPattern.exec(jsCode)) !== null) {
        results.push(match[1] + match[2]);
    }
    
    // 6. Hex encoded
    const hexPattern = /\\x([0-9a-fA-F]{2})/g;
    if (hexPattern.test(jsCode)) {
        try {
            let hexDecoded = jsCode.replace(/\\x([0-9a-fA-F]{2})/g, (m, p1) => 
                String.fromCharCode(parseInt(p1, 16))
            );
            const urls = hexDecoded.match(/https?:\/\/[^"'\s]+/g) || [];
            results.push(...urls);
        } catch (e) {}
    }
    
    // 7. Unicode escape sequences
    const unicodePattern = /\\u([0-9a-fA-F]{4})/g;
    if (unicodePattern.test(jsCode)) {
        try {
            let unicodeDecoded = jsCode.replace(/\\u([0-9a-fA-F]{4})/g, (m, p1) => 
                String.fromCharCode(parseInt(p1, 16))
            );
            const urls = unicodeDecoded.match(/https?:\/\/[^"'\s]+/g) || [];
            results.push(...urls);
        } catch (e) {}
    }
    
    // 8. HTML içindeki data attribute'ları ve meta tagler
    if (html) {
        // video src
        const videoSrc = html.match(/<video[^>]+src\s*=\s*["']([^"']+)["']/i);
        if (videoSrc) results.push(videoSrc[1]);
        
        // source src
        const sourceMatches = html.match(/<source[^>]+src\s*=\s*["']([^"']+)["']/gi) || [];
        for (const src of sourceMatches) {
            const match = src.match(/src\s*=\s*["']([^"']+)["']/i);
            if (match) results.push(match[1]);
        }
        
        // data-url, data-src vb
        const dataUrlMatches = html.match(/data-(?:url|src|video|stream)\s*=\s*["']([^"']+)["']/gi) || [];
        for (const data of dataUrlMatches) {
            const match = data.match(/data-(?:url|src|video|stream)\s*=\s*["']([^"']+)["']/i);
            if (match) results.push(match[1]);
        }
    }
    
    // 9. JWPlayer, Plyr, Video.js config
    const playerPatterns = [
        /jwplayer\("[^"]+"\)\.setup\(\s*(\{[\s\S]*?\})\s*\)/,
        /player\.setup\(\s*(\{[\s\S]*?\})\s*\)/,
        /new\s+Plyr\([^,]+,\s*(\{[\s\S]*?\})\s*\)/,
        /videojs\([^,]+,\s*(\{[\s\S]*?\})\s*\)/
    ];
    
    for (const pattern of playerPatterns) {
        const playerMatch = jsCode.match(pattern);
        if (playerMatch) {
            try {
                let configStr = playerMatch[1]
                    .replace(/'/g, '"')
                    .replace(/(\w+):/g, '"$1":')
                    .replace(/,\s*}/g, '}')
                    .replace(/,\s*]/g, ']');
                const playerConfig = JSON.parse(configStr);
                extractUrlsFromObject(playerConfig, results);
            } catch (e) {}
        }
    }
    
    // 10. fetch/xhr istek URL'leri
    const fetchPattern = /fetch\(["']([^"']+)["']/g;
    while ((match = fetchPattern.exec(jsCode)) !== null) {
        if (match[1].includes('http')) results.push(match[1]);
    }
    
    // 11. WebSocket URL'leri (bazen proxy üzerinden stream olabilir)
    const wsPattern = /ws[s]?:\/\/[^"'\s]+/g;
    const wsMatches = jsCode.match(wsPattern) || [];
    results.push(...wsMatches);
    
    // 12. Çok katmanlı encoding (base64 içinde base64)
    const deepBase64Pattern = /["']([A-Za-z0-9+/=_-]{100,})["']/g;
    while ((match = deepBase64Pattern.exec(jsCode)) !== null) {
        const decoded = decodeBase64(match[1]);
        if (decoded && decoded.includes('http')) {
            results.push(decoded);
            // İçinde başka base64 var mı?
            const innerDecoded = decodeBase64(decoded);
            if (innerDecoded && innerDecoded.includes('http')) {
                results.push(innerDecoded);
            }
        }
    }
    
    return [...new Set(results)].filter(url => 
        url && 
        url.startsWith('http') && 
        (url.includes('.m3u8') || url.includes('.mp4') || url.includes('.ts') || url.includes('stream'))
    );
}

// Recursive object URL extractor
function extractUrlsFromObject(obj, results) {
    if (!obj || typeof obj !== 'object') return;
    
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'string' && val.includes('http')) {
            results.push(val);
        } else if (Array.isArray(val)) {
            for (const item of val) {
                if (typeof item === 'string' && item.includes('http')) {
                    results.push(item);
                } else if (typeof item === 'object') {
                    extractUrlsFromObject(item, results);
                }
            }
        } else if (typeof val === 'object') {
            extractUrlsFromObject(val, results);
        }
    }
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
                
                // Tüm scriptleri çıkar
                const allScripts = extractAllScripts(embedHtml);
                
                // Video URL'lerini bul
                let videoUrls = extractVideoUrls(allScripts, embedHtml);
                
                // Eğer hala bulunamazsa, orijinal linki dene (belki direkt çalışır)
                if (videoUrls.length === 0 && (link.includes('/list/') || link.includes('.m3u8'))) {
                    videoUrls.push(link);
                }
                
                // Embed sayfasındaki iframe'leri kontrol et (nested embed)
                if (videoUrls.length === 0) {
                    const nestedIframe = embedHtml.match(/<iframe[^>]+src=["']([^"']+)["']/i);
                    if (nestedIframe && nestedIframe[1]) {
                        const nestedUrl = nestedIframe[1].startsWith('http') 
                            ? nestedIframe[1] 
                            : 'https:' + nestedIframe[1];
                        
                        console.error("[FilmciBaba] Nested iframe bulundu:", nestedUrl);
                        
                        const nestedRes = await fetch(nestedUrl, {
                            headers: {
                                'User-Agent': ua,
                                'Referer': link
                            }
                        });
                        
                        if (nestedRes.ok) {
                            const nestedHtml = await nestedRes.text();
                            const nestedScripts = extractAllScripts(nestedHtml);
                            videoUrls = extractVideoUrls(nestedScripts, nestedHtml);
                        }
                    }
                }
                
                if (videoUrls.length === 0) {
                    console.error("[FilmciBaba] Video URL bulunamadi, debug HTML:", embedHtml.substring(0, 2000));
                    continue;
                }
                
                for (const videoUrl of videoUrls) {
                    console.error("[FilmciBaba] Video URL bulundu:", videoUrl.substring(0, 100) + "...");
                    
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
