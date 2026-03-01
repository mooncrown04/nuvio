// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene JavaScript - Basit ve Çalışan Versiyon

// ==================== CONFIG ====================
const BASE_URL = 'https://www.fullhdfilmizlesene.de';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
};

// ==================== HELPER FUNCTIONS ====================

// ROT13 şifre çözme
function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function(char) {
        const code = char.charCodeAt(0);
        const base = code < 97 ? 65 : 97;
        return String.fromCharCode(((code - base + 13) % 26) + base);
    });
}

// Base64 decode (Node.js ve browser uyumlu)
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
        console.error('[FullHD] Base64 decode error:', e.message);
        return null;
    }
}

// StringCodec.decode - ROT13 + Base64
function decodeString(encoded) {
    if (!encoded || typeof encoded !== 'string') return null;
    try {
        const rot13Decoded = rot13(encoded);
        return base64Decode(rot13Decoded);
    } catch (e) {
        return null;
    }
}

// Hex codec - \xHH formatı
function decodeHex(hexString) {
    try {
        // \xHH formatı
        if (hexString.includes('\\x')) {
            const parts = hexString.split('\\x').filter(x => x);
            const bytes = parts.map(x => parseInt(x, 16));
            return String.fromCharCode.apply(null, bytes);
        }
        // Direkt hex
        const bytes = hexString.match(/.{2}/g).map(x => parseInt(x, 16));
        return String.fromCharCode.apply(null, bytes);
    } catch (e) {
        return null;
    }
}

// URL düzeltme
function fixUrl(url) {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('//')) return 'https:' + url;
    return BASE_URL + (url.startsWith('/') ? '' : '/') + url;
}

// ==================== EXTRACTOR FUNCTIONS ====================

// RapidVid/VidMoxy extractor
async function extractRapidVid(url, referer) {
    const results = [];
    
    try {
        console.log('[RapidVid] Fetching:', url);
        
        const response = await fetch(url, {
            headers: Object.assign({}, HEADERS, { 'Referer': referer })
        });
        
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const text = await response.text();
        
        // Yöntem 1: Direkt file pattern
        let escapedHex = null;
        const fileMatch = text.match(/file": "(.*)",/);
        
        if (fileMatch) {
            escapedHex = fileMatch[1];
        } else {
            // Yöntem 2: Eval unpack (basit)
            const evalMatch = text.match(/eval\(function[\s\S]*?var played = \d+;/);
            if (evalMatch) {
                // Çift unpack dene
                let unpacked = evalMatch[1];
                // Basit deobfuscation - gerçek implementasyon daha karmaşık olabilir
                const fileMatch2 = unpacked.match(/file":"(.*)","label/);
                if (fileMatch2) {
                    escapedHex = fileMatch2[1].replace(/\\\\x/g, '\\x');
                }
            }
        }
        
        if (escapedHex) {
            const decoded = decodeHex(escapedHex);
            if (decoded) {
                console.log('[RapidVid] Found m3u8:', decoded.substring(0, 100));
                results.push({
                    url: decoded,
                    quality: '720p',
                    type: 'M3U8'
                });
            }
        }
    } catch (e) {
        console.error('[RapidVid] Error:', e.message);
    }
    
    return results;
}

// TurboImgz extractor
async function extractTurboImgz(url, referer) {
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
            console.log('[TurboImgz] Found m3u8:', fileMatch[1]);
            results.push({
                url: fileMatch[1],
                quality: '720p',
                type: 'M3U8'
            });
        }
    } catch (e) {
        console.error('[TurboImgz] Error:', e.message);
    }
    
    return results;
}

// Trstx extractor
async function extractTrstx(url, referer) {
    const results = [];
    const baseUrl = 'https://trstx.org';
    
    try {
        console.log('[Trstx] Fetching:', url);
        
        // İlk istek
        const response = await fetch(url, {
            headers: Object.assign({}, HEADERS, { 'Referer': referer })
        });
        
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const text = await response.text();
        
        const fileMatch = text.match(/file":"([^"]+)/);
        if (!fileMatch) throw new Error('File pattern not found');
        
        const postLink = fileMatch[1].replace(/\\/g, '');
        console.log('[Trstx] Post link:', postLink);
        
        // POST isteği
        const postResponse = await fetch(baseUrl + '/' + postLink, {
            method: 'POST',
            headers: Object.assign({}, HEADERS, { 
                'Referer': referer,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
        });
        
        if (!postResponse.ok) throw new Error('POST failed: ' + postResponse.status);
        
        const postData = await postResponse.json();
        console.log('[Trstx] Post data items:', postData.length);
        
        // İlk elemanı atla (genellikle intro/trailer)
        for (let i = 1; i < postData.length; i++) {
            const item = postData[i];
            if (!item.file || !item.title) continue;
            
            const vidUrl = baseUrl + '/playlist/' + item.file.substring(1) + '.txt';
            console.log('[Trstx] Fetching playlist:', item.title);
            
            try {
                const vidResponse = await fetch(vidUrl, {
                    method: 'POST',
                    headers: Object.assign({}, HEADERS, { 'Referer': referer })
                });
                
                if (vidResponse.ok) {
                    const videoUrl = await vidResponse.text();
                    console.log('[Trstx] Found video:', videoUrl.substring(0, 100));
                    results.push({
                        url: videoUrl.trim(),
                        quality: item.title,
                        type: 'M3U8'
                    });
                }
            } catch (vidErr) {
                console.error('[Trstx] Playlist error:', vidErr.message);
            }
        }
    } catch (e) {
        console.error('[Trstx] Error:', e.message);
    }
    
    return results;
}

// Sobreatsesuyp extractor
async function extractSobreatsesuyp(url, referer) {
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
        if (!fileMatch) throw new Error('File pattern not found');
        
        const postLink = fileMatch[1].replace(/\\/g, '');
        console.log('[Sobreatsesuyp] Post link:', postLink);
        
        const postResponse = await fetch(baseUrl + '/' + postLink, {
            method: 'POST',
            headers: Object.assign({}, HEADERS, { 
                'Referer': referer,
                'Content-Type': 'application/x-www-form-urlencoded'
            })
        });
        
        if (!postResponse.ok) throw new Error('POST failed: ' + postResponse.status);
        
        const postData = await postResponse.json();
        console.log('[Sobreatsesuyp] Post data items:', postData.length);
        
        for (let i = 1; i < postData.length; i++) {
            const item = postData[i];
            if (!item.file || !item.title) continue;
            
            const vidUrl = baseUrl + '/playlist/' + item.file.substring(1) + '.txt';
            console.log('[Sobreatsesuyp] Fetching playlist:', item.title);
            
            try {
                const vidResponse = await fetch(vidUrl, {
                    method: 'POST',
                    headers: Object.assign({}, HEADERS, { 'Referer': referer })
                });
                
                if (vidResponse.ok) {
                    const videoUrl = await vidResponse.text();
                    console.log('[Sobreatsesuyp] Found video:', videoUrl.substring(0, 100));
                    results.push({
                        url: videoUrl.trim(),
                        quality: item.title,
                        type: 'M3U8'
                    });
                }
            } catch (vidErr) {
                console.error('[Sobreatsesuyp] Playlist error:', vidErr.message);
            }
        }
    } catch (e) {
        console.error('[Sobreatsesuyp] Error:', e.message);
    }
    
    return results;
}

// Direkt link extractor
async function extractDirect(url, referer) {
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

// ==================== ANA FONKSIYONLAR ====================

function detectExtractor(url) {
    if (url.includes('rapidvid.net') || url.includes('vidmoxy.com')) return extractRapidVid;
    if (url.includes('turbo.imgz.me')) return extractTurboImgz;
    if (url.includes('trstx.org')) return extractTrstx;
    if (url.includes('sobreatsesuyp.com')) return extractSobreatsesuyp;
    return extractDirect;
}

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
        
        // Başlık çıkar
        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                          html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"]+)["']/i);
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
        
        // Her SCX key'i işle
        for (const key of Object.keys(scxData)) {
            const sourceData = scxData[key];
            if (!sourceData || !sourceData.sx || !sourceData.sx.t) continue;
            
            const t = sourceData.sx.t;
            console.log('[FullHD] Processing key:', key);
            
            // Linkleri topla
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
            
            // Her link için extractor çalıştır
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

async function searchMovie(query) {
    const searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
    console.log('[FullHD] Searching:', query);
    
    try {
        const response = await fetch(searchUrl, {
            headers: HEADERS
        });
        
        if (!response.ok) throw new Error('Search failed: ' + response.status);
        
        const html = await response.text();
        const results = [];
        
        const filmRegex = /<li[^>]*class=["'][^"']*film[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
        let match;
        
        while ((match = filmRegex.exec(html)) !== null) {
            const filmHtml = match[1];
            
            const titleMatch = filmHtml.match(/<span[^>]*class=["'][^"']*film-title[^"']*["'][^>]*>([^<]+)<\/span>/i);
            if (!titleMatch) continue;
            
            const title = titleMatch[1].trim();
            const hrefMatch = filmHtml.match(/<a[^>]+href=["']([^"']+)["']/i);
            const posterMatch = filmHtml.match(/<img[^>]+data-src=["']([^"']+)["']/i);
            
            if (hrefMatch) {
                results.push({
                    title: title,
                    url: fixUrl(hrefMatch[1]),
                    posterUrl: posterMatch ? fixUrl(posterMatch[1]) : null,
                    type: 'movie'
                });
            }
        }
        
        console.log('[FullHD] Found', results.length, 'search results');
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
    
    // Tam eşleşme
    for (const r of results) {
        if (r.title.toLowerCase().trim() === queryLower) return r;
    }
    
    // Tüm kelimeler eşleşsin
    for (const r of results) {
        const titleLower = r.title.toLowerCase();
        if (queryWords.every(w => titleLower.includes(w))) return r;
    }
    
    // İçeren
    for (const r of results) {
        if (r.title.toLowerCase().includes(queryLower)) return r;
    }
    
    return results[0];
}

// ==================== PUBLIC API ====================

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log('[FullHD] getStreams called:', { tmdbId, mediaType, seasonNum, episodeNum });
    
    if (mediaType !== 'movie') {
        console.log('[FullHD] Only movies supported, returning empty');
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
            console.log('[FullHD] No title found in TMDB data');
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

// Global olarak tanımla
if (typeof window !== 'undefined') {
    window.FullHDFilmizlesene = { getStreams };
}

if (typeof global !== 'undefined') {
    global.FullHDFilmizlesene = { getStreams };
}

// Module export (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
}

// Direkt çalıştırma için test
console.log('[FullHD] Module loaded, getStreams available:', typeof getStreams === 'function');
