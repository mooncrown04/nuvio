// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene JavaScript - Düzeltilmiş Arama ve Domain

// ==================== CONFIG ====================
// Python kodundan: fullhdfilmizlesene.de
// Güncel domain: fullhdfilmizlesene.live
const BASE_URL = 'https://www.fullhdfilmizlesene.live';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

// ==================== HELPER FUNCTIONS ====================

function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function(char) {
        const code = char.charCodeAt(0);
        const base = code < 97 ? 65 : 97;
        return String.fromCharCode(((code - base + 13) % 26) + base);
    });
}

function base64Decode(str) {
    try {
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(str, 'base64').toString('utf-8');
        }
        if (typeof window !== 'undefined' && window.atob) {
            return window.atob(str);
        }
        throw new Error('Base64 decoder not available');
    } catch (e) {
        return null;
    }
}

function decodeString(encoded) {
    if (!encoded || typeof encoded !== 'string') return null;
    try {
        const rot13Decoded = rot13(encoded);
        return base64Decode(rot13Decoded);
    } catch (e) {
        return null;
    }
}

function decodeHex(hexString) {
    try {
        if (hexString.includes('\\x')) {
            const parts = hexString.split('\\x').filter(x => x);
            const bytes = parts.map(x => parseInt(x, 16));
            return String.fromCharCode.apply(null, bytes);
        }
        const bytes = hexString.match(/.{2}/g).map(x => parseInt(x, 16));
        return String.fromCharCode.apply(null, bytes);
    } catch (e) {
        return null;
    }
}

function fixUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    return BASE_URL + (url.startsWith('/') ? '' : '/') + url;
}

// ==================== EXTRACTORS ====================

const Extractors = {
    rapidvid: async function(url, referer) {
        const results = [];
        try {
            console.log('[RapidVid] Fetching:', url);
            const response = await fetch(url, {
                headers: Object.assign({}, HEADERS, { 'Referer': referer })
            });
            
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const text = await response.text();
            
            let escapedHex = null;
            const fileMatch = text.match(/file": "(.*)",/);
            
            if (fileMatch) {
                escapedHex = fileMatch[1];
            } else {
                const evalMatch = text.match(/eval\(function[\s\S]*?var played = \d+;/);
                if (evalMatch) {
                    const unpacked = evalMatch[1];
                    const fileMatch2 = unpacked.match(/file":"(.*)","label/);
                    if (fileMatch2) {
                        escapedHex = fileMatch2[1].replace(/\\\\x/g, '\\x');
                    }
                }
            }
            
            if (escapedHex) {
                const decoded = decodeHex(escapedHex);
                if (decoded) {
                    results.push({ url: decoded, quality: '720p', type: 'M3U8' });
                }
            }
        } catch (e) {
            console.error('[RapidVid] Error:', e.message);
        }
        return results;
    },
    
    turboimgz: async function(url, referer) {
        const results = [];
        try {
            console.log('[TurboImgz] Fetching:', url);
            const response = await fetch(url, {
                headers: Object.assign({}, HEADERS, { 'Referer': referer })
            });
            
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const text = await response.text();
            
            const fileMatch = text.match(/file: "(.*)",/);
            if (fileMatch) {
                results.push({ url: fileMatch[1], quality: '720p', type: 'M3U8' });
            }
        } catch (e) {
            console.error('[TurboImgz] Error:', e.message);
        }
        return results;
    },
    
    trstx: async function(url, referer) {
        const results = [];
        const baseUrl = 'https://trstx.org';
        
        try {
            console.log('[Trstx] Fetching:', url);
            const response = await fetch(url, {
                headers: Object.assign({}, HEADERS, { 'Referer': referer })
            });
            
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const text = await response.text();
            
            const fileMatch = text.match(/file":"([^"]+)/);
            if (!fileMatch) throw new Error('File not found');
            
            const postLink = fileMatch[1].replace(/\\/g, '');
            console.log('[Trstx] Post link:', postLink);
            
            const postResponse = await fetch(baseUrl + '/' + postLink, {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 
                    'Referer': referer,
                    'Content-Type': 'application/x-www-form-urlencoded'
                })
            });
            
            if (!postResponse.ok) throw new Error('POST failed');
            const postData = await postResponse.json();
            
            for (let i = 1; i < postData.length; i++) {
                const item = postData[i];
                if (!item.file || !item.title) continue;
                
                const vidUrl = baseUrl + '/playlist/' + item.file.substring(1) + '.txt';
                
                try {
                    const vidResponse = await fetch(vidUrl, {
                        method: 'POST',
                        headers: Object.assign({}, HEADERS, { 'Referer': referer })
                    });
                    
                    if (vidResponse.ok) {
                        const videoUrl = await vidResponse.text();
                        results.push({ url: videoUrl.trim(), quality: item.title, type: 'M3U8' });
                    }
                } catch (vidErr) {
                    console.error('[Trstx] Playlist error:', vidErr.message);
                }
            }
        } catch (e) {
            console.error('[Trstx] Error:', e.message);
        }
        return results;
    },
    
    sobreatsesuyp: async function(url, referer) {
        const results = [];
        const baseUrl = 'https://sobreatsesuyp.com';
        
        try {
            console.log('[Sobreatsesuyp] Fetching:', url);
            const response = await fetch(url, {
                headers: Object.assign({}, HEADERS, { 'Referer': referer })
            });
            
            if (!response.ok) throw new Error('HTTP ' + response.status);
            const text = await response.text();
            
            const fileMatch = text.match(/file":"([^"]+)/);
            if (!fileMatch) throw new Error('File not found');
            
            const postLink = fileMatch[1].replace(/\\/g, '');
            
            const postResponse = await fetch(baseUrl + '/' + postLink, {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 
                    'Referer': referer,
                    'Content-Type': 'application/x-www-form-urlencoded'
                })
            });
            
            if (!postResponse.ok) throw new Error('POST failed');
            const postData = await postResponse.json();
            
            for (let i = 1; i < postData.length; i++) {
                const item = postData[i];
                if (!item.file || !item.title) continue;
                
                const vidUrl = baseUrl + '/playlist/' + item.file.substring(1) + '.txt';
                
                try {
                    const vidResponse = await fetch(vidUrl, {
                        method: 'POST',
                        headers: Object.assign({}, HEADERS, { 'Referer': referer })
                    });
                    
                    if (vidResponse.ok) {
                        const videoUrl = await vidResponse.text();
                        results.push({ url: videoUrl.trim(), quality: item.title, type: 'M3U8' });
                    }
                } catch (vidErr) {
                    console.error('[Sobreatsesuyp] Playlist error:', vidErr.message);
                }
            }
        } catch (e) {
            console.error('[Sobreatsesuyp] Error:', e.message);
        }
        return results;
    },
    
    direct: async function(url, referer) {
        const results = [];
        if (url.match(/\.(m3u8|mp4)($|\?)/i)) {
            results.push({
                url: url,
                quality: '720p',
                type: url.includes('.m3u8') ? 'M3U8' : 'VIDEO'
            });
        }
        return results;
    }
};

function detectExtractor(url) {
    if (url.includes('rapidvid.net') || url.includes('vidmoxy.com')) return Extractors.rapidvid;
    if (url.includes('turbo.imgz.me')) return Extractors.turboimgz;
    if (url.includes('trstx.org')) return Extractors.trstx;
    if (url.includes('sobreatsesuyp.com')) return Extractors.sobreatsesuyp;
    return Extractors.direct;
}

// ==================== ANA FONKSIYONLAR ====================

async function extractMovieStreams(movieUrl) {
    console.log('[FullHD] Loading movie page:', movieUrl);
    
    try {
        const response = await fetch(movieUrl, {
            headers: HEADERS,
            redirect: 'follow'
        });
        
        if (!response.ok) {
            throw new Error('Failed to load: ' + response.status);
        }
        
        const html = await response.text();
        
        // Başlık çıkar - daha fazla pattern
        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                          html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"]+)["']/i) ||
                          html.match(/<div[^>]*class=["']izle-titles["'][^>]*>([^<]+)<\/div>/i);
        
        const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Unknown';
        
        // Yıl çıkar
        const yearMatch = html.match(/(\d{4})/);
        const year = yearMatch ? yearMatch[1] : null;
        
        console.log('[FullHD] Movie:', title, year ? '(' + year + ')' : '');
        
        // SCX verisini çıkar
        const scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) {
            console.log('[FullHD] No SCX data found');
            return [];
        }
        
        let scxData;
        try {
            scxData = JSON.parse(scxMatch[1]);
        } catch (e) {
            console.error('[FullHD] SCX parse error:', e.message);
            return [];
        }
        
        const allStreams = [];
        
        for (const key of Object.keys(scxData)) {
            const sourceData = scxData[key];
            if (!sourceData?.sx?.t) continue;
            
            const t = sourceData.sx.t;
            console.log('[FullHD] Processing key:', key);
            
            const links = [];
            
            if (Array.isArray(t)) {
                t.forEach((encoded, idx) => {
                    const decoded = decodeString(encoded);
                    if (decoded) {
                        links.push({ 
                            quality: key + (t.length > 1 ? ' #' + (idx + 1) : ''), 
                            url: decoded 
                        });
                    }
                });
            } else if (typeof t === 'object' && t !== null) {
                Object.entries(t).forEach(([qual, encoded]) => {
                    const decoded = decodeString(encoded);
                    if (decoded) {
                        links.push({ quality: qual, url: decoded });
                    }
                });
            }
            
            console.log('[FullHD] Key', key, 'has', links.length, 'links');
            
            for (const link of links) {
                const extractorFn = detectExtractor(link.url);
                
                try {
                    const extracted = await extractorFn(link.url, movieUrl);
                    
                    extracted.forEach(stream => {
                        allStreams.push({
                            name: '⌜ FullHD ⌟ | ' + key.toUpperCase() + (stream.quality ? ' - ' + stream.quality : ''),
                            title: title + (year ? ' (' + year + ')' : '') + ' · ' + (stream.quality || '720p'),
                            url: stream.url,
                            headers: {
                                'User-Agent': HEADERS['User-Agent'],
                                'Referer': movieUrl,
                                'Origin': BASE_URL
                            },
                            type: stream.type,
                            provider: 'fullhdfilmizlesene'
                        });
                    });
                } catch (extractErr) {
                    console.error('[FullHD] Extractor error for', key, ':', extractErr.message);
                }
            }
        }
        
        console.log('[FullHD] Total streams found:', allStreams.length);
        return allStreams;
        
    } catch (e) {
        console.error('[FullHD] Movie extract error:', e.message);
        return [];
    }
}

// ==================== ARAMA - DÜZELTILMIŞ ====================

async function searchMovie(query) {
    // URL encode daha agresif
    const encodedQuery = encodeURIComponent(query)
        .replace(/%20/g, '+')  // Boşlukları + yap
        .replace(/%C3%A7/g, 'c')  // ç -> c
        .replace(/%C4%B1/g, 'i')  // ı -> i
        .replace(/%C5%9F/g, 's')  // ş -> s
        .replace(/%C3%B6/g, 'o')  // ö -> o
        .replace(/%C3%BC/g, 'u')  // ü -> u
        .replace(/%C4%9F/g, 'g'); // ğ -> g
    
    const searchUrl = BASE_URL + '/arama/' + encodedQuery;
    console.log('[FullHD] Searching:', query, 'URL:', searchUrl);
    
    try {
        const response = await fetch(searchUrl, {
            headers: HEADERS,
            redirect: 'follow'
        });
        
        if (!response.ok) {
            console.error('[FullHD] Search HTTP error:', response.status);
            throw new Error('Search failed: ' + response.status);
        }
        
        const html = await response.text();
        const results = [];
        
        // Daha esnek arama pattern'leri
        const patterns = [
            // Pattern 1: li.film (orijinal)
            /<li[^>]*class=["'][^"']*film[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi,
            // Pattern 2: div.film
            /<div[^>]*class=["'][^"']*film[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
            // Pattern 3: article
            /<article[^>]*>([\s\S]*?)<\/article>/gi,
            // Pattern 4: a[href*="film"]
            /<a[^>]*href=["'][^"']*\/film\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi
        ];
        
        let match;
        
        // Her patterni dene
        for (const pattern of patterns) {
            while ((match = pattern.exec(html)) !== null) {
                const itemHtml = match[1] || match[0];
                
                // Başlık ara - birden fazla pattern
                const titleMatch = itemHtml.match(/<span[^>]*class=["'][^"']*film-title[^"']*["'][^>]*>([^<]+)<\/span>/i) ||
                                  itemHtml.match(/<a[^>]*title=["']([^"']+)["']/i) ||
                                  itemHtml.match(/alt=["']([^"']+)["']/i) ||
                                  itemHtml.match(/<h[2-4][^>]*>([^<]+)<\/h[2-4]>/i);
                
                if (!titleMatch) continue;
                
                const filmTitle = titleMatch[1].trim();
                
                // URL ara
                const hrefMatch = itemHtml.match(/<a[^>]+href=["']([^"']+)["']/i);
                if (!hrefMatch) continue;
                
                const href = fixUrl(hrefMatch[1]);
                
                // Poster ara
                const posterMatch = itemHtml.match(/<img[^>]+data-src=["']([^"']+)["']/i) ||
                                   itemHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
                
                // Duplicate kontrolü
                const isDuplicate = results.some(r => r.url === href || r.title === filmTitle);
                if (!isDuplicate) {
                    results.push({
                        title: filmTitle,
                        url: href,
                        posterUrl: posterMatch ? fixUrl(posterMatch[1]) : null,
                        type: 'movie'
                    });
                }
            }
        }
        
        console.log('[FullHD] Search results:', results.length);
        
        // Debug: İlk 3 sonucu göster
        if (results.length > 0) {
            console.log('[FullHD] First 3 results:');
            results.slice(0, 3).forEach((r, i) => {
                console.log('  ', i + 1, r.title, '->', r.url);
            });
        } else {
            // Debug: HTML'den bir snippet göster
            console.log('[FullHD] No results. HTML snippet:', html.substring(0, 500));
        }
        
        return results;
        
    } catch (e) {
        console.error('[FullHD] Search error:', e.message);
        return [];
    }
}

function findBestMatch(results, query) {
    if (!results || results.length === 0) return null;
    
    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    console.log('[FullHD] Finding best match for:', query, 'in', results.length, 'results');
    
    // Tam eşleşme
    for (const r of results) {
        if (r.title.toLowerCase().trim() === queryLower) {
            console.log('[FullHD] Exact match found:', r.title);
            return r;
        }
    }
    
    // Tüm kelimeler eşleşsin
    for (const r of results) {
        const titleLower = r.title.toLowerCase();
        if (queryWords.every(w => titleLower.includes(w))) {
            console.log('[FullHD] All words match:', r.title);
            return r;
        }
    }
    
    // İçeren
    for (const r of results) {
        if (r.title.toLowerCase().includes(queryLower)) {
            console.log('[FullHD] Contains match:', r.title);
            return r;
        }
    }
    
    // İlk sonuç
    if (results.length > 0) {
        console.log('[FullHD] Using first result:', results[0].title);
        return results[0];
    }
    
    return null;
}

// ==================== PUBLIC API ====================

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log('[FullHD] getStreams called:', { tmdbId, mediaType });
    
    if (mediaType !== 'movie') {
        console.log('[FullHD] Only movies supported');
        return [];
    }
    
    try {
        const tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + 
                       '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
        
        console.log('[FullHD] Fetching TMDB:', tmdbUrl);
        
        const tmdbRes = await fetch(tmdbUrl);
        if (!tmdbRes.ok) throw new Error('TMDB fetch failed: ' + tmdbRes.status);
        
        const tmdbData = await tmdbRes.json();
        const title = tmdbData.title || tmdbData.original_title;
        
        if (!title) {
            console.log('[FullHD] No title found');
            return [];
        }
        
        console.log('[FullHD] TMDB title:', title);
        
        // Film ara
        const searchResults = await searchMovie(title);
        let bestMatch = findBestMatch(searchResults, title);
        
        // Orijinal title dene
        if (!bestMatch && tmdbData.original_title && tmdbData.original_title !== title) {
            console.log('[FullHD] Trying original title:', tmdbData.original_title);
            const searchResults2 = await searchMovie(tmdbData.original_title);
            bestMatch = findBestMatch(searchResults2, tmdbData.original_title);
        }
        
        if (!bestMatch) {
            console.log('[FullHD] No match found');
            return [];
        }
        
        console.log('[FullHD] Best match:', bestMatch.title, bestMatch.url);
        
        // Streamleri çıkar
        const streams = await extractMovieStreams(bestMatch.url);
        return streams;
        
    } catch (e) {
        console.error('[FullHD] getStreams error:', e.message);
        return [];
    }
}

// ==================== EXPORT ====================

if (typeof window !== 'undefined') {
    window.FullHDFilmizlesene = { getStreams };
}

if (typeof global !== 'undefined') {
    global.FullHDFilmizlesene = { getStreams };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
}

console.log('[FullHD] Module loaded. getStreams available:', typeof getStreams === 'function');
