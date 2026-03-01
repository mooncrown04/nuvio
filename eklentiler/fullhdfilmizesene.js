// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene JavaScript versiyonu - Tüm Extractor'lar Entegre

const FullHDFilmizlesene = (function() {
    'use strict';
    
    // ==================== CONFIG ====================
    const BASE_URL = 'https://www.fullhdfilmizlesene.de';
    
    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': BASE_URL + '/'
    };

    // ==================== STRING CODEC (ROT13 + Base64) ====================
    const StringCodec = {
        rot13: function(str) {
            return str.replace(/[a-zA-Z]/g, function(char) {
                const code = char.charCodeAt(0);
                const base = code < 97 ? 65 : 97;
                return String.fromCharCode(((code - base + 13) % 26) + base);
            });
        },
        
        decode: function(encoded) {
            if (!encoded || typeof encoded !== 'string') return null;
            try {
                const rot13Decoded = this.rot13(encoded);
                // Base64 decode
                if (typeof Buffer !== 'undefined') {
                    return Buffer.from(rot13Decoded, 'base64').toString('utf-8');
                }
                return atob(rot13Decoded);
            } catch (e) {
                return null;
            }
        }
    };

    // ==================== HEX CODEC ====================
    const HexCodec = {
        decode: function(hexString) {
            try {
                // \xHH formatını çöz
                const hexParts = hexString.split('\\x').filter(x => x);
                const bytes = hexParts.map(x => parseInt(x, 16));
                return String.fromCharCode.apply(null, bytes);
            } catch (e) {
                // Direkt hex çözümlemesi dene
                try {
                    const bytes = hexString.match(/.{2}/g).map(x => parseInt(x, 16));
                    return String.fromCharCode.apply(null, bytes);
                } catch (e2) {
                    return null;
                }
            }
        }
    };

    // ==================== PACKER (Eval Unpack) ====================
    const Packer = {
        unpack: function(packed) {
            // Basit packer çözümleme
            // Gerçek implementasyon daha karmaşık olabilir
            try {
                // p,a,c,k,e,d patterni
                const match = packed.match(/eval\(function\(p,a,c,k,e,d\)\{.*?\}\('([^']+)',(\d+),(\d+),'([^']+)'/);
                if (!match) return packed;
                
                let [_, p, a, c, k] = match;
                a = parseInt(a);
                c = parseInt(c);
                k = k.split('|');
                
                // Basit deobfuscation
                return packed; // Şimdilik orijinali dön, gerekirse geliştirilecek
            } catch (e) {
                return packed;
            }
        }
    };

    // ==================== EXTRACTOR'LAR ====================
    
    const Extractors = {
        // RapidVid / VidMoxy (Aynı yapı)
        rapidvid: {
            name: 'RapidVid',
            domains: ['rapidvid.net', 'vidmoxy.com'],
            
            extract: async function(url, referer) {
                const results = [];
                
                try {
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
                        // Yöntem 2: Eval unpack
                        const evalMatch = text.match(/\};\s*(eval\(function[\s\S]*?)var played = \d+;/);
                        if (evalMatch) {
                            const unpacked = Packer.unpack(Packer.unpack(evalMatch[1]));
                            const fileMatch2 = unpacked.match(/file":"(.*)","label/);
                            if (fileMatch2) {
                                escapedHex = fileMatch2[1];
                            }
                        }
                    }
                    
                    if (escapedHex) {
                        const decoded = HexCodec.decode(escapedHex);
                        if (decoded) {
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
        },
        
        // TurboImgz
        turboimgz: {
            name: 'TurboImgz',
            domains: ['turbo.imgz.me'],
            
            extract: async function(url, referer) {
                const results = [];
                
                try {
                    const response = await fetch(url, {
                        headers: Object.assign({}, HEADERS, { 'Referer': referer })
                    });
                    
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    const text = await response.text();
                    
                    const fileMatch = text.match(/file: "(.*)",/);
                    if (fileMatch) {
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
        },
        
        // Trstx
        trstx: {
            name: 'Trstx',
            domains: ['trstx.org'],
            baseUrl: 'https://trstx.org',
            
            extract: async function(url, referer) {
                const results = [];
                
                try {
                    // İlk istek - file değerini al
                    const response = await fetch(url, {
                        headers: Object.assign({}, HEADERS, { 'Referer': referer })
                    });
                    
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    const text = await response.text();
                    
                    const fileMatch = text.match(/file":"([^"]+)/);
                    if (!fileMatch) throw new Error('File not found');
                    
                    const postLink = fileMatch[1].replace(/\\/g, '');
                    
                    // POST isteği
                    const postResponse = await fetch(this.baseUrl + '/' + postLink, {
                        method: 'POST',
                        headers: Object.assign({}, HEADERS, { 
                            'Referer': referer,
                            'Content-Type': 'application/x-www-form-urlencoded'
                        })
                    });
                    
                    if (!postResponse.ok) throw new Error('POST failed');
                    const postData = await postResponse.json();
                    
                    // İlk elemanı atla, gerisini işle
                    for (let i = 1; i < postData.length; i++) {
                        const item = postData[i];
                        if (!item.file || !item.title) continue;
                        
                        const vidUrl = this.baseUrl + '/playlist/' + item.file.substring(1) + '.txt';
                        
                        const vidResponse = await fetch(vidUrl, {
                            method: 'POST',
                            headers: Object.assign({}, HEADERS, { 'Referer': referer })
                        });
                        
                        if (vidResponse.ok) {
                            const videoUrl = await vidResponse.text();
                            results.push({
                                url: videoUrl,
                                quality: item.title,
                                type: 'M3U8'
                            });
                        }
                    }
                } catch (e) {
                    console.error('[Trstx] Error:', e.message);
                }
                
                return results;
            }
        },
        
        // Sobreatsesuyp
        sobreatsesuyp: {
            name: 'Sobreatsesuyp',
            domains: ['sobreatsesuyp.com'],
            baseUrl: 'https://sobreatsesuyp.com',
            
            extract: async function(url, referer) {
                const results = [];
                
                try {
                    const response = await fetch(url, {
                        headers: Object.assign({}, HEADERS, { 'Referer': referer })
                    });
                    
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    const text = await response.text();
                    
                    const fileMatch = text.match(/file":"([^"]+)/);
                    if (!fileMatch) throw new Error('File not found');
                    
                    const postLink = fileMatch[1].replace(/\\/g, '');
                    
                    const postResponse = await fetch(this.baseUrl + '/' + postLink, {
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
                        
                        const vidUrl = this.baseUrl + '/playlist/' + item.file.substring(1) + '.txt';
                        
                        const vidResponse = await fetch(vidUrl, {
                            method: 'POST',
                            headers: Object.assign({}, HEADERS, { 'Referer': referer })
                        });
                        
                        if (vidResponse.ok) {
                            const videoUrl = await vidResponse.text();
                            results.push({
                                url: videoUrl,
                                quality: item.title,
                                type: 'M3U8'
                            });
                        }
                    }
                } catch (e) {
                    console.error('[Sobreatsesuyp] Error:', e.message);
                }
                
                return results;
            }
        },
        
        // Proton / Fast (Direkt linkler)
        direct: {
            name: 'Direct',
            domains: ['proton', 'fast'],
            
            extract: async function(url, referer) {
                const results = [];
                
                // Direkt m3u8/mp4 linkleri
                if (url.match(/\.(m3u8|mp4)($|\?)/i)) {
                    results.push({
                        url: url,
                        quality: '720p',
                        type: url.includes('.m3u8') ? 'M3U8' : 'VIDEO'
                    });
                }
                
                return results;
            }
        }
    };

    // ==================== ANA FONKSIYONLAR ====================

    function detectExtractor(url) {
        if (url.includes('rapidvid.net') || url.includes('vidmoxy.com')) return 'rapidvid';
        if (url.includes('turbo.imgz.me')) return 'turboimgz';
        if (url.includes('trstx.org')) return 'trstx';
        if (url.includes('sobreatsesuyp.com')) return 'sobreatsesuyp';
        return 'direct';
    }

    async function extractFromPage(movieUrl) {
        console.log('[FullHD] Loading:', movieUrl);
        
        try {
            const response = await fetch(movieUrl, {
                headers: HEADERS,
                redirect: 'follow'
            });
            
            if (!response.ok) {
                throw new Error('Failed to load: ' + response.status);
            }
            
            const html = await response.text();
            
            // Başlık ve yıl çıkar
            const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                              html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"]+)["']/i);
            const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : 'Unknown';
            
            const yearMatch = html.match(/(\d{4})/);
            const year = yearMatch ? yearMatch[1] : null;
            
            // SCX verisini çıkar
            const scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) {
                console.log('[FullHD] No SCX data found');
                return { title, year, streams: [] };
            }
            
            const scxData = JSON.parse(scxMatch[1]);
            const scxKeys = Object.keys(scxData);
            
            const allStreams = [];
            
            for (const key of scxKeys) {
                const sourceData = scxData[key];
                if (!sourceData?.sx?.t) continue;
                
                const t = sourceData.sx.t;
                
                // Linkleri topla
                const links = [];
                if (Array.isArray(t)) {
                    t.forEach(encoded => {
                        const decoded = StringCodec.decode(encoded);
                        if (decoded) links.push({ quality: key, url: decoded });
                    });
                } else if (typeof t === 'object') {
                    Object.entries(t).forEach(([qual, encoded]) => {
                        const decoded = StringCodec.decode(encoded);
                        if (decoded) links.push({ quality: qual, url: decoded });
                    });
                }
                
                // Her link için extractor çalıştır
                for (const link of links) {
                    const extractorName = detectExtractor(link.url);
                    const extractor = Extractors[extractorName];
                    
                    if (!extractor) {
                        console.log('[FullHD] No extractor for:', link.url);
                        continue;
                    }
                    
                    console.log('[FullHD] Using', extractor.name, 'for', key);
                    
                    try {
                        const extracted = await extractor.extract(link.url, movieUrl);
                        
                        extracted.forEach(stream => {
                            allStreams.push({
                                name: `⌜ FullHD ⌟ | ${key.toUpperCase()}${stream.quality ? ' - ' + stream.quality : ''}`,
                                title: `${title}${year ? ' (' + year + ')' : ''} · ${stream.quality || '720p'}`,
                                url: stream.url,
                                headers: Object.assign({}, HEADERS, {
                                    'Referer': movieUrl,
                                    'Origin': BASE_URL
                                }),
                                type: stream.type,
                                provider: 'fullhdfilmizlesene'
                            });
                        });
                    } catch (e) {
                        console.error('[FullHD] Extractor error:', e.message);
                    }
                }
            }
            
            console.log('[FullHD] Total streams:', allStreams.length);
            return { title, year, streams: allStreams };
            
        } catch (e) {
            console.error('[FullHD] Page extract error:', e.message);
            return { title: 'Unknown', year: null, streams: [] };
        }
    }

    async function searchMovie(query) {
        const searchUrl = `${BASE_URL}/arama/${encodeURIComponent(query)}`;
        console.log('[FullHD] Searching:', query);
        
        try {
            const response = await fetch(searchUrl, {
                headers: HEADERS
            });
            
            if (!response.ok) throw new Error('Search failed');
            
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
                        url: hrefMatch[1].startsWith('http') ? hrefMatch[1] : BASE_URL + hrefMatch[1],
                        posterUrl: posterMatch ? (posterMatch[1].startsWith('http') ? posterMatch[1] : BASE_URL + posterMatch[1]) : null,
                        type: 'movie'
                    });
                }
            }
            
            return results;
            
        } catch (e) {
            console.error('[FullHD] Search error:', e.message);
            return [];
        }
    }

    function findBestMatch(results, query) {
        if (!results.length) return null;
        
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
        
        // Tam eşleşme
        for (const r of results) {
            if (r.title.toLowerCase() === queryLower) return r;
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
        if (mediaType !== 'movie') {
            console.log('[FullHD] Only movies supported');
            return [];
        }
        
        try {
            const tmdbRes = await fetch(
                `https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`
            );
            
            if (!tmdbRes.ok) throw new Error('TMDB fetch failed');
            
            const tmdbData = await tmdbRes.json();
            const title = tmdbData.title || tmdbData.original_title;
            
            if (!title) {
                console.log('[FullHD] No title found');
                return [];
            }
            
            console.log('[FullHD] TMDB title:', title);
            
            const searchResults = await searchMovie(title);
            const bestMatch = findBestMatch(searchResults, title);
            
            if (!bestMatch) {
                // Orijinal title dene
                if (tmdbData.original_title && tmdbData.original_title !== title) {
                    const searchResults2 = await searchMovie(tmdbData.original_title);
                    const bestMatch2 = findBestMatch(searchResults2, tmdbData.original_title);
                    if (bestMatch2) {
                        const result = await extractFromPage(bestMatch2.url);
                        return result.streams;
                    }
                }
                return [];
            }
            
            const result = await extractFromPage(bestMatch.url);
            return result.streams;
            
        } catch (e) {
            console.error('[FullHD] getStreams error:', e.message);
            return [];
        }
    }

    // Export
    return { getStreams };
})();

// Node.js veya Browser için export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FullHDFilmizlesene;
} else if (typeof window !== 'undefined') {
    window.FullHDFilmizlesene = FullHDFilmizlesene;
}
