/**
 * Nuvio Local Scraper - FilmciBaba (V24 - Dynamic JS Parser)
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

// Base64 decoder (URL-safe)
function decodeBase64(str) {
    try {
        // URL-safe base64 düzelt
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        // Padding ekle
        while (str.length % 4) str += '=';
        return atob(str);
    } catch (e) {
        return null;
    }
}

// Obfuscated JS parser
function extractFromJS(jsCode) {
    const results = [];
    
    // Pattern 1: "var source = '...'"
    let match = jsCode.match(/var\s+(?:source|src|url|file|videoUrl|stream)\s*=\s*["']([^"']+)["']/i);
    if (match) results.push(match[1]);
    
    // Pattern 2: atob/decode fonksiyonları
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
    
    // Pattern 3: eval(atob(...))
    const evalMatches = jsCode.match(/eval\(atob\(["']([A-Za-z0-9+/=_-]+)["']\)\)/g) || [];
    for (const m of evalMatches) {
        const encoded = m.match(/eval\(atob\(["']([^"']+)["']\)\)/)?.[1];
        if (encoded) {
            const decoded = decodeBase64(encoded);
            if (decoded) {
                // Decoded içinde başka URL'ler ara
                const innerMatches = decoded.match(/https?:\/\/[^"'\s]+\.m3u8/g) || 
                                    decoded.match(/https?:\/\/[^"'\s]+/g) || [];
                results.push(...innerMatches);
            }
        }
    }
    
    // Pattern 4: JSON.parse(atob(...))
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
    
    // Pattern 5: sources: [{file: "..."}]
    const sourcesMatch = jsCode.match(/sources\s*:\s*(\[[^\]]+\])/);
    if (sourcesMatch) {
        try {
            // Tek tırnakları çift yap, JSON parse et
            const fixed = sourcesMatch[1]
                .replace(/'/g, '"')
                .replace(/(\w+):/g, '"$1":')
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']');
            const sources = JSON.parse(f
