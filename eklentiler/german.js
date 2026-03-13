// Nuvio addon - Vanilla JS, no external modules
const addon = {
    manifest: {
        id: 'com.german.torrents',
        version: '1.0.0',
        name: 'German Torrents',
        description: 'German dubbed movies and series from torrent sources',
        resources: ['catalog', 'meta', 'stream'],
        types: ['movie', 'series'],
        catalogs: [
            {
                type: 'movie',
                id: 'german-movies',
                name: 'German Movies'
            },
            {
                type: 'series',
                id: 'german-series',
                name: 'German Series'
            }
        ]
    },
    
    // Catalog handler
    async defineCatalogHandler({ type, id, extra }) {
        console.log(`[CATALOG] type=${type}, id=${id}, search=${extra?.search || 'none'}`);
        
        if (!extra?.search) {
            return { metas: [] };
        }
        
        const results = await searchGermanContent(extra.search, type);
        
        return {
            metas: results.map(r => ({
                id: `tmdb:${r.tmdbId || 'unknown'}`,
                type: type,
                name: r.name,
                poster: r.poster || `https://via.placeholder.com/300x450/1a1a1a/ffffff?text=${encodeURIComponent(r.name.substring(0,20))}`,
                description: r.description || `${r.seeders || 0} seeders`,
                releaseInfo: r.year || ''
            }))
        };
    },
    
    // Meta handler
    async defineMetaHandler({ type, id }) {
        console.log(`[META] type=${type}, id=${id}`);
        
        const tmdbId = id.replace('tmdb:', '');
        
        try {
            const tmdbData = await fetchTMDB(tmdbId, type);
            return { meta: tmdbData };
        } catch (e) {
            return {
                meta: {
                    id: id,
                    type: type,
                    name: 'Unknown',
                    poster: 'https://via.placeholder.com/300x450'
                }
            };
        }
    },
    
    // Stream handler
    async defineStreamHandler({ type, id }) {
        console.log(`[STREAM] type=${type}, id=${id}`);
        
        const tmdbId = id.replace('tmdb:', '');
        
        let title = 'Unknown';
        try {
            const tmdbData = await fetchTMDB(tmdbId, type);
            title = tmdbData.name || tmdbData.title || 'Unknown';
        } catch (e) {
            console.error('TMDB fetch failed:', e.message);
        }
        
        console.log(`Searching streams for: ${title}`);
        
        // Search both sources
        const [torrents1337x, torrentsTpb] = await Promise.all([
            search1337x(title),
            searchTPB(title)
        ]);
        
        const allTorrents = [...torrents1337x, ...torrentsTpb];
        
        // Convert to Nuvio stream format
        const streams = allTorrents.map(t => ({
            name: t.source,
            title: `🇩🇪 ${t.name}\n👥 ${t.seeders} seeds | 💾 ${t.size}`,
            url: t.magnet || t.url,
            behaviorHints: {
                bingeGroup: `german-${t.source}`
            }
        }));
        
        // Sort by seeders
        streams.sort((a, b) => {
            const getSeeders = (title) => {
                const match = title.match(/(\d+)\s+seeds/);
                return match ? parseInt(match[1]) : 0;
            };
            return getSeeders(b.title) - getSeeders(a.title);
        });
        
        console.log(`Found ${streams.length} German streams`);
        
        return { streams: streams.slice(0, 15) };
    }
};

// Helper: Fetch TMDB data using fetch()
async function fetchTMDB(id, type) {
    const tmdbType = type === 'series' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/${tmdbType}/${id}?api_key=YOUR_TMDB_KEY`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('HTTP error');
        const data = await response.json();
        
        return {
            id: `tmdb:${id}`,
            type: type,
            name: data.name || data.title,
            poster: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
            background: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null,
            description: data.overview,
            releaseInfo: data.release_date || data.first_air_date,
            imdbRating: data.vote_average
        };
    } catch (e) {
        throw new Error('TMDB fetch failed');
    }
}

// Helper: Search for German content
async function searchGermanContent(query, type) {
    const results = await search1337x(query);
    
    return results.map((r, i) => ({
        tmdbId: null,
        name: r.name,
        seeders: r.seeders,
        size: r.size,
        year: extractYear(r.name)
    }));
}

// Helper: Extract year from torrent name
function extractYear(name) {
    const match = name.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : '';
}

// Helper: Search 1337x using fetch() + regex parsing
async function search1337x(query) {
    try {
        const searchQuery = `${query} german`;
        const url = `https://1337x.to/search/${encodeURIComponent(searchQuery)}/1/`;
        
        console.log(`[1337x] Searching: ${url}`);
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.ok) throw new Error('HTTP error');
        const html = await response.text();
        
        const results = [];
        
        // Simple regex parsing for table rows
        const rowRegex = /<tr>[\s\S]*?<td class="coll-1 name">[\s\S]*?<a href="([^"]+)">([^<]+)<\/a>[\s\S]*?<td class="coll-2 seeds">(\d+)<\/td>[\s\S]*?<td class="coll-4 size">([^<]+)<\/td>[\s\S]*?<\/tr>/g;
        
        let match;
        let count = 0;
        while ((match = rowRegex.exec(html)) !== null && count < 10) {
            const link = match[1];
            const name = match[2].trim();
            const seeders = parseInt(match[3]) || 0;
            const size = match[4].trim();
            
            if (name && seeders > 0 && 
                (name.toLowerCase().includes('german') || 
                 name.toLowerCase().includes('deutsch'))) {
                results.push({
                    source: '1337x',
                    name: name,
                    seeders: seeders,
                    size: size,
                    url: `https://1337x.to${link}`,
                    magnet: null
                });
                count++;
            }
        }
        
        // If regex fails, try alternative parsing
        if (results.length === 0) {
            console.log('[1337x] Trying alternative parsing...');
            const altResults = parse1337xHTMLAlt(html, query);
            results.push(...altResults);
        }
        
        // Fetch magnet links
        for (const result of results) {
            result.magnet = await getMagnetFrom1337x(result.url);
            await sleep(100); // Rate limiting
        }
        
        console.log(`[1337x] Found ${results.filter(r => r.magnet).length} results`);
        
        return results.filter(r => r.magnet);
    } catch (error) {
        console.error('[1337x] Error:', error.message);
        return [];
    }
}

// Alternative HTML parsing for 1337x
function parse1337xHTMLAlt(html, query) {
    const results = [];
    
    // Find all table rows
    const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
    if (!tbodyMatch) return results;
    
    const tbody = tbodyMatch[1];
    const rowMatches = tbody.match(/<tr>[\s\S]*?<\/tr>/g) || [];
    
    for (const row of rowMatches.slice(0, 10)) {
        const nameMatch = row.match(/<a href="(\/torrent\/[^"]+)">([^<]+)<\/a>/);
        const seedersMatch = row.match(/<td[^>]*class="[^"]*seeds[^"]*"[^>]*>(\d+)<\/td>/);
        const sizeMatch = row.match(/<td[^>]*class="[^"]*size[^"]*"[^>]*>([^<]+)<\/td>/);
        
        if (nameMatch && seedersMatch) {
            const name = nameMatch[2].trim();
            const seeders = parseInt(seedersMatch[1]) || 0;
            
            if (seeders > 0 && 
                (name.toLowerCase().includes('german') || 
                 name.toLowerCase().includes('deutsch'))) {
                results.push({
                    source: '1337x',
                    name: name,
                    seeders: seeders,
                    size: sizeMatch ? sizeMatch[1].trim() : 'Unknown',
                    url: `https://1337x.to${nameMatch[1]}`,
                    magnet: null
                });
            }
        }
    }
    
    return results;
}

// Helper: Get magnet from 1337x page using fetch()
async function getMagnetFrom1337x(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.ok) throw new Error('HTTP error');
        const html = await response.text();
        
        const magnetMatch = html.match(/href="(magnet:\?[^"]+)"/);
        return magnetMatch ? magnetMatch[1] : null;
    } catch (error) {
        console.error('[1337x] Magnet fetch error:', error.message);
        return null;
    }
}

// Helper: Search The Pirate Bay using fetch()
async function searchTPB(query) {
    try {
        const searchQuery = `${query} german`;
        const url = `https://apibay.org/q.php?q=${encodeURIComponent(searchQuery)}`;
        
        console.log(`[TPB] Searching: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('HTTP error');
        
        const data = await response.json();
        const items = Array.isArray(data) ? data : [];
        
        const results = items
            .filter(item => 
                item.name && 
                parseInt(item.seeders) > 0 && 
                (item.name.toLowerCase().includes('german') || 
                 item.name.toLowerCase().includes('deutsch'))
            )
            .slice(0, 8)
            .map(item => ({
                source: 'TPB',
                name: item.name,
                seeders: parseInt(item.seeders),
                size: formatBytes(item.size),
                magnet: `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.name)}&tr=udp://tracker.coppersurfer.tk:6969/announce&tr=udp://tracker.openbittorrent.com:6969/announce&tr=udp://tracker.opentrackr.org:1337/announce`,
                url: null
            }));
        
        console.log(`[TPB] Found ${results.length} results`);
        
        return results;
    } catch (error) {
        console.error('[TPB] Error:', error.message);
        return [];
    }
}

// Helper: Format bytes to human readable
function formatBytes(bytes) {
    const gb = bytes / 1073741824;
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / 1048576;
    return `${mb.toFixed(2)} MB`;
}

// Helper: Sleep for rate limiting
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Export for Nuvio
if (typeof module !== 'undefined' && module.exports) {
    module.exports = addon;
}
