// Vidlink Scraper for Nuvio Local Scrapers
// React Native compatible version - Standalone (no external dependencies)
// Converted to Promise-based syntax for sandbox compatibility

// Constants
const TMDB_API_KEY = "68e094699525b18a70bab2f86b1fa706";
const ENC_DEC_API = "https://enc-dec.app/api";
const VIDLINK_API = "https://vidlink.pro/api/b";

// Required headers for Vidlink requests
const VIDLINK_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Connection": "keep-alive",
    "Referer": "https://vidlink.pro/",
    "Origin": "https://vidlink.pro"
};

// Helper function to make HTTP requests with default headers
function makeRequest(url, options = {}) {
    const defaultHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
        'Accept': 'application/json,*/*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        ...options.headers
    };

    return fetch(url, {
        method: options.method || 'GET',
        headers: defaultHeaders,
        ...options
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response;
    })
    .catch(error => {
        console.error(`[Vidlink] Request failed for ${url}: ${error.message}`);
        throw error;
    });
}

// M3U8 Parsing Functions

// Parse M3U8 content and extract quality streams
function parseM3U8(content, baseUrl) {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const streams = [];
    let currentStream = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.startsWith('#EXT-X-STREAM-INF:')) {
            currentStream = { bandwidth: null, resolution: null, url: null };
            
            const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
            if (bandwidthMatch) {
                currentStream.bandwidth = parseInt(bandwidthMatch[1]);
            }
            
            const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
            if (resolutionMatch) {
                currentStream.resolution = resolutionMatch[1];
            }
        } else if (currentStream && !line.startsWith('#')) {
            currentStream.url = resolveUrl(line, baseUrl);
            streams.push(currentStream);
            currentStream = null;
        }
    }
    return streams;
}

// Resolve relative URLs against base URL
function resolveUrl(url, baseUrl) {
    if (url.startsWith('http')) {
        return url;
    }
    try {
        return new URL(url, baseUrl).toString();
    } catch (error) {
        console.error(`[Vidlink] Could not resolve URL: ${url} against ${baseUrl}`);
        return url;
    }
}

// Determine quality from resolution
function getQualityFromResolution(resolution) {
    if (!resolution) return 'Auto';
    
    const [width, height] = resolution.split('x').map(Number);
    
    if (height >= 2160) return '4K';
    if (height >= 1440) return '1440p';
    if (height >= 1080) return '1080p';
    if (height >= 720) return '720p';
    if (height >= 480) return '480p';
    if (height >= 360) return '360p';
    return '240p';
}

// Fetch and parse M3U8 playlist to extract quality variants
function fetchAndParseM3U8(playlistUrl, mediaInfo) {
    console.log(`[Vidlink] Fetching M3U8 playlist: ${playlistUrl.substring(0, 80)}...`);
    
    return makeRequest(playlistUrl, { headers: VIDLINK_HEADERS })
        .then(response => response.text())
        .then(m3u8Content => {
            console.log(`[Vidlink] Parsing M3U8 content`);
            const parsedStreams = parseM3U8(m3u8Content, playlistUrl);
            
            if (parsedStreams.length === 0) {
                console.log('[Vidlink] No quality variants found, returning master playlist');
                // Fallback: return the master playlist as Auto quality
                return [{
                    name: 'Vidlink - Auto',
                    title: mediaInfo.title,
                    url: playlistUrl,
                    quality: 'Auto',
                    size: 'Unknown',
                    headers: VIDLINK_HEADERS,
                    provider: 'vidlink'
                }];
            }
            
            console.log(`[Vidlink] Found ${parsedStreams.length} quality variants`);
            
            // Convert parsed streams to Nuvio format
            const streams = parsedStreams.map(stream => {
                const quality = getQualityFromResolution(stream.resolution);
                return {
                    name: `Vidlink - ${quality}`,
                    title: mediaInfo.title,
                    url: stream.url,
                    quality: quality,
                    size: 'Unknown',
                    headers: VIDLINK_HEADERS,
                    provider: 'vidlink'
                };
            });
            
            return streams;
        })
        .catch(error => {
            console.error(`[Vidlink] Error fetching/parsing M3U8: ${error.message}`);
            // Fallback: return the master playlist URL
            return [{
                name: 'Vidlink - Auto',
                title: mediaInfo.title,
                url: playlistUrl,
                quality: 'Auto',
                size: 'Unknown',
                headers: VIDLINK_HEADERS,
                provider: 'vidlink'
            }];
        });
}

// Helper function to get TMDB info
function getTmdbInfo(tmdbId, mediaType) {
    const url = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    
    return makeRequest(url)
    .then(response => response.json())
    .then(data => {
        const title = mediaType === 'tv' ? data.name : data.title;
        const year = mediaType === 'tv' ? data.first_air_date?.substring(0, 4) : data.release_date?.substring(0, 4);
        
        if (!title) {
            throw new Error('Could not extract title from TMDB response');
        }
        
        console.log(`[Vidlink] TMDB Info: "${title}" (${year})`);
        return { title, year, data };
    });
}

// Encrypt TMDB ID using enc-dec.app API
function encryptTmdbId(tmdbId) {
    console.log(`[Vidlink] Encrypting TMDB ID: ${tmdbId}`);
    
    return makeRequest(`${ENC_DEC_API}/enc-vidlink?text=${tmdbId}`)
    .then(response => response.json())
    .then(data => {
        if (data && data.result) {
            console.log(`[Vidlink] Successfully encrypted TMDB ID`);
            return data.result;
        } else {
            throw new Error('Invalid encryption response format');
        }
    })
    .catch(error => {
        console.error(`[Vidlink] Encryption failed: ${error.message}`);
        throw error;
    });
}


/**
 * Vidlink Scraper - Nuvio Provider
 * Optimized for Language in Quality & Global Export
 */

// 1. YARDIMCI FONKSİYONLAR (EN ÜSTTE)
function extractLanguage(data, url = "") {
    try {
        if (!data && !url) return "EN";
        const dataString = data ? JSON.stringify(data) : "";
        const urlString = url || "";
        const searchString = (dataString + urlString).toLowerCase();
        
        if (searchString.includes("turkish") || searchString.includes("dublaj") || 
            searchString.includes(" tr") || searchString.includes("-tr") || 
            searchString.includes("/tr/")) return "TR";
            
        if (searchString.includes("multi") || searchString.includes("dual")) return "MULTI";
    } catch (e) {
        return "EN";
    }
    return "EN";
}

function extractQuality(streamData) {
    if (!streamData) return 'Unknown';
    const qualityFields = ['quality', 'resolution', 'label', 'name'];
    for (const field of qualityFields) {
        if (streamData[field]) {
            const quality = streamData[field].toString().toLowerCase();
            if (quality.includes('2160') || quality.includes('4k')) return '4K';
            if (quality.includes('1440') || quality.includes('2k')) return '1440p';
            if (quality.includes('1080') || quality.includes('fhd')) return '1080p';
            if (quality.includes('720') || quality.includes('hd')) return '720p';
            if (quality.includes('480') || quality.includes('sd')) return '480p';
            if (quality.includes('360')) return '360p';
            const match = quality.match(/(\d{3,4})[pP]?/);
            if (match) {
                const res = parseInt(match[1]);
                if (res >= 2160) return '4K';
                if (res >= 1080) return '1080p';
                if (res >= 720) return '720p';
                return '480p';
            }
        }
    }
    return 'Unknown';
}

// 2. ANA İŞLEME MANTIĞI
function processVidlinkResponse(data, mediaInfo) {
    const streams = [];
    try {
        if (!data) return [];

        // Format: stream.qualities (Objekt)
        if (data.stream && data.stream.qualities) {
            Object.entries(data.stream.qualities).forEach(([key, qData]) => {
                if (qData.url) {
                    const baseQ = extractQuality({ quality: key });
                    const lang = extractLanguage(qData, qData.url);
                    streams.push({
                        name: `Vidlink`,
                        title: mediaInfo.title,
                        url: qData.url,
                        quality: `${baseQ} [${lang}]`,
                        headers: typeof VIDLINK_HEADERS !== 'undefined' ? VIDLINK_HEADERS : {},
                        provider: 'vidlink'
                    });
                }
            });

            if (data.stream.playlist) {
                const lang = extractLanguage(data.stream, data.stream.playlist);
                streams.push({
                    _isPlaylist: true,
                    url: data.stream.playlist,
                    mediaInfo: { ...mediaInfo, lang: lang }
                });
            }
        } 
        // Format: data.url (Single)
        else if (data.url) {
            const baseQ = extractQuality(data);
            const lang = extractLanguage(data, data.url);
            streams.push({
                name: `Vidlink`,
                title: mediaInfo.title,
                url: data.url,
                quality: `${baseQ} [${lang}]`,
                headers: typeof VIDLINK_HEADERS !== 'undefined' ? VIDLINK_HEADERS : {},
                provider: 'vidlink'
            });
        }
        
        // Format: data.streams veya data.links (Array)
        const arrayData = data.streams || data.links;
        if (Array.isArray(arrayData)) {
            arrayData.forEach((item, index) => {
                if (item.url) {
                    const baseQ = extractQuality(item);
                    const lang = extractLanguage(item, item.url);
                    streams.push({
                        name: `Vidlink ${index + 1}`,
                        title: mediaInfo.title,
                        url: item.url,
                        quality: `${baseQ} [${lang}]`,
                        headers: typeof VIDLINK_HEADERS !== 'undefined' ? VIDLINK_HEADERS : {},
                        provider: 'vidlink'
                    });
                }
            });
        }
    } catch (error) {
        console.error(`[Vidlink] Process Error: ${error.message}`);
    }
    return streams;
}

// 3. GETSTREAMS FONKSİYONU
function getStreams(tmdbId, mediaType = 'movie', seasonNum = null, episodeNum = null) {
    // Burada TMDB info çekme ve fetch işlemleri senin mevcut yapına göre devam eder
    // Örn: return fetch(...).then(res => res.json()).then(data => processVidlinkResponse(data, info));
    // Örnek akışın (Senin orijinal yapın):
    console.log(`[Vidlink] getStreams called for ${tmdbId}`);
    
    // NOT: Bu fonksiyonun içi senin orijinal kodundaki fetch/encrypt mantığıyla aynı kalmalı.
    // Sadece yukarıdaki processVidlinkResponse'u çağırdığından emin ol.
}

// 4. KRİTİK EXPORT BLOĞU (LOGDAKİ HATAYI ÇÖZEN KISIM)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
}

// Nuvio ve Android ortamları için global kayıt
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
} else if (typeof global !== 'undefined') {
    global.getStreams = getStreams;
}
