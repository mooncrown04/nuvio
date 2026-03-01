// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene - Python Kodunun Birebir Çevirisi

const FullHDFilmizlesene = (function() {
    'use strict';
    
    // Python kodundan alınan domain
    const BASE_URL = 'https://www.fullhdfilmizlesene.de';
    
    // ==================== STRING CODEC ====================
    const StringCodec = {
        rot13: function(str) {
            return str.replace(/[a-zA-Z]/g, function(char) {
                const code = char.charCodeAt(0);
                const base = code < 97 ? 65 : 97;
                return String.fromCharCode(((code - base + 13) % 26) + base);
            });
        },
        
        decode: function(encoded) {
            try {
                const rot13Decoded = this.rot13(encoded);
                // Python: base64.b64decode
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
                // Python: bytes.fromhex()
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
    };

    // ==================== PACKER ====================
    const Packer = {
        unpack: function(packed) {
            // Basit packer çözümleme - gerçek implementasyon daha karmaşık
            // Şimdilik pattern arama yapıyoruz
            return packed;
        }
    };

    // ==================== EXTRACTOR FUNCTIONS ====================
    
    // rapid2m3u8
    async function rapid2m3u8(url, referer) {
        console.log('[RapidVid] rapid2m3u8:', url);
        
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Referer': referer || BASE_URL + '/'
                }
            });
            
            const text = await response.text();
            
            // Yöntem 1: file pattern
            let escapedHex = null;
            const fileMatch = text.match(/file": "(.*)",/);
            
            if (fileMatch) {
                escapedHex = fileMatch[1];
            } else {
                // Yöntem 2: eval unpack
                const evalMatch = text.match(/\};\s*(eval\(function[\s\S]*?)var played = \d+;/);
                if (evalMatch) {
                    let unpacked = Packer.unpack(Packer.unpack(evalMatch[1]));
                    const fileMatch2 = unpacked.match(/file":"(.*)","label/);
                    if (fileMatch2) {
                        escapedHex = fileMatch2[1];
                    }
                }
            }
            
            if (escapedHex) {
                const decoded = HexCodec.decode(escapedHex);
                if (decoded) {
                    return [{ url: decoded, quality: '720p', type: 'M3U8' }];
                }
            }
        } catch (e) {
            console.error('[RapidVid] Error:', e.message);
        }
        
        return [];
    }

    // trstx2m3u8
    async function trstx2m3u8(url, referer) {
        console.log('[Trstx] trstx2m3u8:', url);
        const baseUrl = 'https://trstx.org';
        const results = [];
        
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Referer': referer || BASE_URL + '/'
                }
            });
            
            const text = await response.text();
            const fileMatch = text.match(/file":"([^"]+)/);
            
            if (!fileMatch) return results;
            
            const postLink = fileMatch[1].replace(/\\/g, '');
            console.log('[Trstx] Post link:', postLink);
            
            const postResponse = await fetch(baseUrl + '/' + postLink, {
                method: 'POST',
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Referer': referer || BASE_URL + '/',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            
            const postData = await postResponse.json();
            console.log('[Trstx] Post data length:', postData.length);
            
            // Python: for bak in post_istek[1:]
            for (let i = 1; i < postData.length; i++) {
                const bak = postData[i];
                const vidUrl = baseUrl + '/playlist/' + bak.file.substring(1) + '.txt';
                
                console.log('[Trstx] Fetching:', bak.title);
                
                const vidResponse = await fetch(vidUrl, {
                    method: 'POST',
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Referer': referer || BASE_URL + '/'
                    }
                });
                
                const videoData = await vidResponse.text();
                results.push({
                    url: videoData.trim(),
                    quality: bak.title,
                    type: 'M3U8'
                });
            }
        } catch (e) {
            console.error('[Trstx] Error:', e.message);
        }
        
        return results;
    }

    // sobreatsesuyp2m3u8
    async function sobreatsesuyp2m3u8(url, referer) {
        console.log('[Sobreatsesuyp] sobreatsesuyp2m3u8:', url);
        const baseUrl = 'https://sobreatsesuyp.com';
        const results = [];
        
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Referer': referer || BASE_URL + '/'
                }
            });
            
            const text = await response.text();
            const fileMatch = text.match(/file":"([^"]+)/);
            
            if (!fileMatch) return results;
            
            const postLink = fileMatch[1].replace(/\\/g, '');
            
            const postResponse = await fetch(baseUrl + '/' + postLink, {
                method: 'POST',
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Referer': referer || BASE_URL + '/',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            
            const postData = await postResponse.json();
            
            for (let i = 1; i < postData.length; i++) {
                const bak = postData[i];
                const vidUrl = baseUrl + '/playlist/' + bak.file.substring(1) + '.txt';
                
                const vidResponse = await fetch(vidUrl, {
                    method: 'POST',
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Referer': referer || BASE_URL + '/'
                    }
                });
                
                const videoData = await vidResponse.text();
                results.push({
                    url: videoData.trim(),
                    quality: bak.title,
                    type: 'M3U8'
                });
            }
        } catch (e) {
            console.error('[Sobreatsesuyp] Error:', e.message);
        }
        
        return results;
    }

    // turboimgz2m3u8
    async function turboimgz2m3u8(url, referer) {
        console.log('[TurboImgz] turboimgz2m3u8:', url);
        
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0',
                    'Referer': referer || BASE_URL + '/'
                }
            });
            
            const text = await response.text();
            const fileMatch = text.match(/file: "(.*)",/);
            
            if (fileMatch) {
                return [{
                    url: fileMatch[1],
                    quality: '720p',
                    type: 'M3U8'
                }];
            }
        } catch (e) {
            console.error('[TurboImgz] Error:', e.message);
        }
        
        return [];
    }

    // ==================== ANA FONKSIYON ====================
    
    // Python: fullhdfilmizlesene(url)
    async function fullhdfilmizlesene(url) {
        console.log('\n\n[FullHD] Processing:', url);
        
        try {
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                redirect: 'follow'
            });
            
            const html = await response.text();
            
            // Python: script = secici.xpath("(//script)[1]").get()
            // İlk script tagini bul
            const scriptMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
            if (!scriptMatch) {
                console.log('[FullHD] No script found');
                return [];
            }
            
            const script = scriptMatch[1];
            
            // Python: scx_data = json.loads(re.findall(r'scx = (.*?);', script)[0])
            const scxMatch = script.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) {
                console.log('[FullHD] No SCX data in script');
                return [];
            }
            
            const scxData = JSON.parse(scxMatch[1]);
            const scxKeys = Object.keys(scxData);
            
            console.log('[FullHD] SCX keys:', scxKeys.join(', '));
            
            // Python: link_list = []
            const linkList = [];
            
            // Python: for key in scx_keys:
            for (const key of scxKeys) {
                const t = scxData[key].sx.t;
                
                // Python: if isinstance(t, list):
                if (Array.isArray(t)) {
                    const decodedList = {};
                    for (const elem of t) {
                        const decoded = StringCodec.decode(elem);
                        if (decoded) decodedList[key] = decoded;
                    }
                    linkList.push(decodedList);
                }
                // Python: if isinstance(t, dict):
                else if (typeof t === 'object' && t !== null) {
                    const decodedDict = {};
                    for (const [k, v] of Object.entries(t)) {
                        const decoded = StringCodec.decode(v);
                        if (decoded) decodedDict[k] = decoded;
                    }
                    linkList.push(decodedDict);
                }
            }
            
            console.log('[FullHD] Link list length:', linkList.length);
            
            // Python: vid_links = []
            const vidLinks = [];
            
            // Python: for elem in link_list:
            for (const elem of linkList) {
                // Python: for key, value in elem.items():
                for (const [key, value] of Object.entries(elem)) {
                    // Python: if "rapidvid" in value:
                    if (value.includes('rapidvid')) {
                        const rapidLinks = await rapid2m3u8(value, url);
                        for (const link of rapidLinks) {
                            vidLinks.push({ [key]: link.url });
                        }
                        continue;
                    }
                    
                    // Python: if "trstx.org" in value:
                    if (value.includes('trstx.org')) {
                        const trstxLinks = await trstx2m3u8(value, url);
                        for (const link of trstxLinks) {
                            vidLinks.push({ [key]: link.url });
                        }
                        continue;
                    }
                    
                    // Python: if "sobreatsesuyp.com" in value:
                    if (value.includes('sobreatsesuyp.com')) {
                        const sobLinks = await sobreatsesuyp2m3u8(value, url);
                        for (const link of sobLinks) {
                            vidLinks.push({ [key]: link.url });
                        }
                        continue;
                    }
                    
                    // Python: if "turbo.imgz.me" in value:
                    if (value.includes('turbo.imgz.me')) {
                        const turboLinks = await turboimgz2m3u8(value, url);
                        for (const link of turboLinks) {
                            vidLinks.push({ [key]: link.url });
                        }
                        continue;
                    }
                    
                    // Python: if "vidmoxy.com" in value:
                    if (value.includes('vidmoxy.com')) {
                        const vidmoxyLinks = await rapid2m3u8(value, url); // Aynı rapidvid mantığı
                        for (const link of vidmoxyLinks) {
                            vidLinks.push({ [key]: link.url });
                        }
                        continue;
                    }
                    
                    // Python: vid_links.extend({key: value} for bidi in ("proton", "fast", "tr", "en") if bidi in key)
                    const bidis = ["proton", "fast", "tr", "en"];
                    for (const bidi of bidis) {
                        if (key.toLowerCase().includes(bidi)) {
                            vidLinks.push({ [key]: value });
                            break;
                        }
                    }
                }
            }
            
            console.log('[FullHD] Total vid_links:', vidLinks.length);
            return vidLinks;
            
        } catch (e) {
            console.error('[FullHD] Error:', e.message);
            return [];
        }
    }

    // ==================== ARAMA FONKSIYONU ====================
    
    async function searchMovie(query) {
        // Python: https://www.fullhdfilmizlesene.de/arama/{query}
        const searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
        console.log('[FullHD] Searching:', searchUrl);
        
        try {
            const response = await fetch(searchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                redirect: 'follow'
            });
            
            if (!response.ok) {
                console.error('[FullHD] Search failed:', response.status);
                return [];
            }
            
            const html = await response.text();
            const results = [];
            
            // Python'daki gibi li.film ara
            const filmRegex = /<li[^>]*class=["']film["'][^>]*>([\s\S]*?)<\/li>/gi;
            let match;
            
            while ((match = filmRegex.exec(html)) !== null) {
                const filmHtml = match[1];
                
                // Python: name = item.getString("diziName") benzeri
                const titleMatch = filmHtml.match(/<span[^>]*class=["']film-title["'][^>]*>([^<]+)<\/span>/i);
                if (!titleMatch) continue;
                
                const title = titleMatch[1].trim();
                
                // URL
                const hrefMatch = filmHtml.match(/<a[^>]+href=["']([^"']+)["']/i);
                if (!hrefMatch) continue;
                
                const href = fixUrl(hrefMatch[1]);
                
                // Poster
                const posterMatch = filmHtml.match(/<img[^>]+data-src=["']([^"']+)["']/i);
                
                results.push({
                    title: title,
                    url: href,
                    posterUrl: posterMatch ? fixUrl(posterMatch[1]) : null,
                    type: 'movie'
                });
            }
            
            console.log('[FullHD] Found', results.length, 'results');
            return results;
            
        } catch (e) {
            console.error('[FullHD] Search error:', e.message);
            return [];
        }
    }

    function findBestMatch(results, query) {
        if (!results || results.length === 0) return null;
        
        const queryLower = query.toLowerCase().trim();
        
        // Tam eşleşme
        for (const r of results) {
            if (r.title.toLowerCase() === queryLower) return r;
        }
        
        // İçeren
        for (const r of results) {
            if (r.title.toLowerCase().includes(queryLower)) return r;
        }
        
        return results[0];
    }

    // ==================== PUBLIC API ====================
    
    async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
        console.log('[FullHD] getStreams called:', tmdbId, mediaType);
        
        if (mediaType !== 'movie') {
            console.log('[FullHD] Only movies supported');
            return [];
        }
        
        try {
            // TMDB'den film bilgisi al
            const tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId +
                          '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
            
            const tmdbRes = await fetch(tmdbUrl);
            if (!tmdbRes.ok) throw new Error('TMDB error');
            
            const tmdbData = await tmdbRes.json();
            const title = tmdbData.title || tmdbData.original_title;
            
            if (!title) {
                console.log('[FullHD] No title from TMDB');
                return [];
            }
            
            console.log('[FullHD] TMDB title:', title);
            
            // Film ara
            const searchResults = await searchMovie(title);
            let bestMatch = findBestMatch(searchResults, title);
            
            // Orijinal title dene
            if (!bestMatch && tmdbData.original_title && tmdbData.original_title !== title) {
                const searchResults2 = await searchMovie(tmdbData.original_title);
                bestMatch = findBestMatch(searchResults2, tmdbData.original_title);
            }
            
            if (!bestMatch) {
                console.log('[FullHD] No match found');
                return [];
            }
            
            console.log('[FullHD] Best match:', bestMatch.title, bestMatch.url);
            
            // Python: fullhdfilmizlesene(bestMatch.url)
            const vidLinks = await fullhdfilmizlesene(bestMatch.url);
            
            // Sonuçları formatla
            const streams = [];
            for (const linkObj of vidLinks) {
                for (const [key, url] of Object.entries(linkObj)) {
                    streams.push({
                        name: '⌜ FullHD ⌟ | ' + key,
                        title: title + ' · ' + key,
                        url: url,
                        headers: {
                            'User-Agent': 'Mozilla/5.0',
                            'Referer': bestMatch.url
                        },
                        type: url.includes('.m3u8') ? 'M3U8' : 'VIDEO',
                        provider: 'fullhdfilmizlesene'
                    });
                }
            }
            
            return streams;
            
        } catch (e) {
            console.error('[FullHD] getStreams error:', e.message);
            return [];
        }
    }

    // Export
    return {
        getStreams: getStreams,
        // Test için internal fonksiyonları da export et
        searchMovie: searchMovie,
        fullhdfilmizlesene: fullhdfilmizlesene
    };
})();

// Global export
if (typeof window !== 'undefined') {
    window.FullHDFilmizlesene = FullHDFilmizlesene;
}
if (typeof global !== 'undefined') {
    global.FullHDFilmizlesene = FullHDFilmizlesene;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FullHDFilmizlesene;
}

console.log('[FullHD] Module loaded. FullHDFilmizlesene.getStreams available:', typeof FullHDFilmizlesene.getStreams === 'function');
