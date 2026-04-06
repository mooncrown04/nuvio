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



// Extract quality from stream data
function extractQuality(streamData) {
    if (!streamData) return 'Unknown';
    
    // Try to extract quality from various possible fields
    const qualityFields = ['quality', 'resolution', 'label', 'name'];
    
    for (const field of qualityFields) {
        if (streamData[field]) {
            const quality = streamData[field].toString().toLowerCase();
            
            // Map common quality indicators
            if (quality.includes('2160') || quality.includes('4k')) return '4K';
            if (quality.includes('1440') || quality.includes('2k')) return '1440p';
            if (quality.includes('1080') || quality.includes('fhd')) return '1080p';
            if (quality.includes('720') || quality.includes('hd')) return '720p';
            if (quality.includes('480') || quality.includes('sd')) return '480p';
            if (quality.includes('360')) return '360p';
            if (quality.includes('240')) return '240p';
            
            // Try to extract number from string
            const match = quality.match(/(\d{3,4})[pP]?/);
            if (match) {
                const resolution = parseInt(match[1]);
                if (resolution >= 2160) return '4K';
                if (resolution >= 1440) return '1440p';
                if (resolution >= 1080) return '1080p';
                if (resolution >= 720) return '720p';
                if (resolution >= 480) return '480p';
                if (resolution >= 360) return '360p';
                return '240p';
            }
        }
    }
    
    return 'Unknown';
}

// Process Vidlink API response
function processVidlinkResponse(data, mediaInfo) {
    const streams = [];
    
    try {
        console.log(`[Vidlink] Processing response data:`, JSON.stringify(data, null, 2));
        
        // Handle Vidlink's specific response format with stream.qualities
        if (data.stream && data.stream.qualities) {
            console.log(`[Vidlink] Processing qualities from stream object`);
            
            Object.entries(data.stream.qualities).forEach(([qualityKey, qualityData]) => {
                if (qualityData.url) {
                    const baseQuality = extractQuality({ quality: qualityKey });
                    // Dil tespitini hem obje hem URL üzerinden yapıyoruz
                    const lang = extractLanguage(qualityData, qualityData.url);
                    
                    const streamTitle = mediaInfo.mediaType === 'tv' && mediaInfo.season && mediaInfo.episode 
                        ? `${mediaInfo.title} S${String(mediaInfo.season).padStart(2, '0')}E${String(mediaInfo.episode).padStart(2, '0')}`
                        : mediaInfo.year 
                            ? `${mediaInfo.title} (${mediaInfo.year})`
                            : mediaInfo.title;
                    
                    streams.push({
                        name: `Vidlink`, // Name alanını temiz bıraktık, zaten görünmüyor dedin
                        title: streamTitle,
                        url: qualityData.url,
                        quality: `${baseQuality} [${lang}]`, // Dil bilgisini kaliteye ekledik
                        size: 'Unknown',
                        headers: VIDLINK_HEADERS,
                        provider: 'vidlink'
                    });
                }
            });
            
            if (data.stream.playlist) {
                const lang = extractLanguage(data.stream, data.stream.playlist);
                const streamTitle = mediaInfo.mediaType === 'tv' && mediaInfo.season && mediaInfo.episode 
                    ? `${mediaInfo.title} S${String(mediaInfo.season).padStart(2, '0')}E${String(mediaInfo.episode).padStart(2, '0')}`
                    : mediaInfo.year 
                        ? `${mediaInfo.title} (${mediaInfo.year})`
                        : mediaInfo.title;
                
                streams.push({
                    _isPlaylist: true,
                    url: data.stream.playlist,
                    mediaInfo: { ...mediaInfo, title: streamTitle, lang: lang }
                });
            }
        }
        // Handle playlist-only responses
        else if (data.stream && data.stream.playlist && !data.stream.qualities) {
            const lang = extractLanguage(data.stream, data.stream.playlist);
            const streamTitle = mediaInfo.mediaType === 'tv' && mediaInfo.season && mediaInfo.episode 
                ? `${mediaInfo.title} S${String(mediaInfo.season).padStart(2, '0')}E${String(mediaInfo.episode).padStart(2, '0')}`
                : mediaInfo.year 
                    ? `${mediaInfo.title} (${mediaInfo.year})`
                    : mediaInfo.title;
            
            streams.push({
                _isPlaylist: true,
                url: data.stream.playlist,
                mediaInfo: { ...mediaInfo, title: streamTitle, lang: lang }
            });
        }
        // Handle single stream URL
        else if (data.url) {
            const baseQuality = extractQuality(data);
            const lang = extractLanguage(data, data.url);
            const streamTitle = mediaInfo.mediaType === 'tv' && mediaInfo.season && mediaInfo.episode 
                ? `${mediaInfo.title} S${String(mediaInfo.season).padStart(2, '0')}E${String(mediaInfo.episode).padStart(2, '0')}`
                : mediaInfo.year 
                    ? `${mediaInfo.title} (${mediaInfo.year})`
                    : mediaInfo.title;
            
            streams.push({
                name: `Vidlink`,
                title: streamTitle,
                url: data.url,
                quality: `${baseQuality} [${lang}]`,
                size: 'Unknown',
                headers: VIDLINK_HEADERS,
                provider: 'vidlink'
            });
        }
        // Handle multiple streams array
        else if (data.streams && Array.isArray(data.streams)) {
            data.streams.forEach((stream, index) => {
                if (stream.url) {
                    const baseQuality = extractQuality(stream);
                    const lang = extractLanguage(stream, stream.url);
                    const streamTitle = mediaInfo.mediaType === 'tv' && mediaInfo.season && mediaInfo.episode 
                        ? `${mediaInfo.title} S${String(mediaInfo.season).padStart(2, '0')}E${String(mediaInfo.episode).padStart(2, '0')}`
                        : mediaInfo.year 
                            ? `${mediaInfo.title} (${mediaInfo.year})`
                            : mediaInfo.title;
                    
                    streams.push({
                        name: `Vidlink Stream ${index + 1}`,
                        title: streamTitle,
                        url: stream.url,
                        quality: `${baseQuality} [${lang}]`,
                        size: stream.size || 'Unknown',
                        headers: VIDLINK_HEADERS,
                        provider: 'vidlink'
                    });
                }
            });
        }
        // Handle links array format
        else if (data.links && Array.isArray(data.links)) {
            data.links.forEach((link, index) => {
                if (link.url) {
                    const baseQuality = extractQuality(link);
                    const lang = extractLanguage(link, link.url);
                    const streamTitle = mediaInfo.mediaType === 'tv' && mediaInfo.season && mediaInfo.episode 
                        ? `${mediaInfo.title} S${String(mediaInfo.season).padStart(2, '0')}E${String(mediaInfo.episode).padStart(2, '0')}`
                        : mediaInfo.year 
                            ? `${mediaInfo.title} (${mediaInfo.year})`
                            : mediaInfo.title;
                    
                    streams.push({
                        name: `Vidlink Link ${index + 1}`,
                        title: streamTitle,
                        url: link.url,
                        quality: `${baseQuality} [${lang}]`,
                        size: link.size || 'Unknown',
                        headers: VIDLINK_HEADERS,
                        provider: 'vidlink'
                    });
                }
            });
        }
        
        console.log(`[Vidlink] Extracted ${streams.length} streams with language metadata`);
        
    } catch (error) {
        console.error(`[Vidlink] Error processing response: ${error.message}`);
    }
    
    return streams;
}

// Yardımcı Fonksiyon: URL desteği eklendi
function extractLanguage(data, url = "") {
    if (!data && !url) return "EN";
    const searchString = (JSON.stringify(data) + url).toLowerCase();
    
    if (searchString.includes("turkish") || searchString.includes("dublaj") || 
        searchString.includes(" tr") || searchString.includes("-tr") || 
        searchString.includes("/tr/")) return "TR";
        
    if (searchString.includes("multi") || searchString.includes("dual")) return "MULTI";
    
    return "EN";
}
