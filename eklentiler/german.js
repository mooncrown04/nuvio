// Nuvio Addon - Resmi API Yapısı
// https://docs.nuvio.io/addon-development/

const ADDON_ID = 'com.german.torrents';
const VERSION = '1.0.0';

// Manifest
const manifest = {
    id: ADDON_ID,
    version: VERSION,
    name: 'German Torrents',
    description: 'German dubbed movies and series',
    resources: ['catalog', 'meta', 'stream'],
    types: ['movie', 'series'],
    catalogs: [
        { type: 'movie', id: 'german-movies', name: 'German Movies' },
        { type: 'series', id: 'german-series', name: 'German Series' }
    ],
    idPrefixes: ['tmdb:']
};

// ========== HANDLERS ==========

// Stream handler - EN ÖNEMLİSİ
async function getStreams(type, id) {
    console.log(`[STREAM] type=${type}, id=${id}`);
    
    const tmdbId = id.replace('tmdb:', '');
    
    // Get title from TMDB
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
        search1337x(title).catch(() => []),
        searchTPB(title).catch(() => [])
    ]);
    
    const allTorrents = [...torrents1337x, ...torrentsTpb];
    
    // Convert to Nuvio stream format
    const streams = allTorrents.map(t => ({
        name: `[${t.source}] German`,
        title: `🇩🇪 ${t.name}\n👥 ${t.seeders} seeds | 💾 ${t.size}`,
        url: t.magnet,
        behaviorHints: {
            bingeGroup: `german-${t.source}`,
            notWebReady: false
        }
    }));
    
    // Sort by seeders
    streams.sort((a, b) => {
        const getSeeders = (str) => {
            const match = str.match(/(\d+)\s+seeds/);
            return match ? parseInt(match[1]) : 0;
        };
        return getSeeders(b.title) - getSeeders(a.title);
    });
    
    console.log(`Found ${streams.length} German streams`);
    
    return streams.slice(0, 15);
}

// Catalog handler
async function getCatalog(type, id, extra) {
    console.log(`[CATALOG] type=${type}, id=${id}, extra=${JSON.stringify(extra)}`);
    
    if (!extra?.search) {
        return { metas: [] };
    }
    
    const results = await searchGermanContent(extra.search, type);
    
    return {
        metas: results.map(r => ({
            id: `tmdb:${r.tmdbId || 'unknown'}`,
            type: type,
            name: r.name,
            poster: r.poster || `https://via.placeholder.com/300x450/1a1a1a/ffffff?text=German`,
            description: `${r.seeders || 0} seeders | ${r.size || 'Unknown'}`,
            releaseInfo: r.year || ''
        }))
    };
}

// Meta handler
async function getMeta(type, id) {
    console.log(`[META] type=${type}, id=${id}`);
    
    const tmdbId = id.replace('tmdb:', '');
    
    try {
        const meta = await fetchTMDB(tmdbId, type);
        return { meta: meta };
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
}

// ========== HELPERS ==========

async function fetchTMDB(id, type) {
    const tmdbType = type === 'series' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/${tmdbType}/${id}?api_key=YOUR_TMDB_KEY_HERE`;
    
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
        year: (data.release_date || data.first_air_date || '').substring(0, 4),
        imdbRating: data.vote_average?.toString()
    };
}

async function searchGermanContent(query, type) {
    const results = await search1337x(query);
    return results.map(r => ({
        tmdbId: null,
        name: r.name,
        seeders: r.seeders,
        size: r.size,
        year: extractYear(r.name)
    }));
}

function extractYear(name) {
    const match = name.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : '';
}

// ========== 1337x SEARCH ==========

async function search1337x(query) {
    try {
        const searchQuery = encodeURIComponent(`${query} german`);
        const url = `https://1337x.to/search/${searchQuery}/1/`;
        
        console.log(`[1337x] Searching: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('HTTP error');
        const html = await response.text();
        
        return parse1337xHTML(html);
    } catch (error) {
        console.error('[1337x] Error:', error.message);
        return [];
    }
}

function parse1337xHTML(html) {
    const results = [];
    
    // Try multiple parsing strategies
    const strategies = [
        // Strategy 1: Standard table parsing
        () => {
            const rows = html.match(/<tr>[\s\S]*?<\/tr>/g) || [];
            return rows.slice(1).map(row => {
                const nameMatch = row.match(/<a href="(\/torrent\/[^"]+)">([^<]+)<\/a>/);
                const seedersMatch = row.match(/<td[^>]*class="[^"]*seeds[^"]*"[^>]*>(\d+)<\/td>/);
                const sizeMatch = row.match(/<td[^>]*class="[^"]*size[^"]*"[^>]*>([^<]+)<\/td>/);
                
                if (nameMatch && seedersMatch) {
                    return {
                        name: nameMatch[2].trim(),
                        seeders: parseInt(seedersMatch[1]) || 0,
                        size: sizeMatch ? sizeMatch[1].trim() : 'Unknown',
                        link: nameMatch[1]
                    };
                }
                return null;
            }).filter(x => x);
        },
        
        // Strategy 2: Alternative parsing
        () => {
            const results = [];
            const regex = /<td class="coll-1 name">[\s\S]*?<a href="([^"]+)">([^<]+)<\/a>[\s\S]*?<td class="coll-2 seeds">(\d+)<\/td>[\s\S]*?<td class="coll-4 size[^"]*">([^<]+)/g;
            let match;
            while ((match = regex.exec(html)) !== null) {
                results.push({
                    name: match[2].trim(),
                    seeders: parseInt(match[3]) || 0,
                    size: match[4].trim(),
                    link: match[1]
                });
            }
            return results;
        }
    ];
    
    for (const strategy of strategies) {
        try {
            const parsed = strategy();
            if (parsed.length > 0) {
                console.log(`[1337x] Parsed ${parsed.length} results`);
                
                // Filter German content
                const filtered = parsed.filter(item => 
                    item.seeders > 0 && 
                    (item.name.toLowerCase().includes('german') || 
                     item.name.toLowerCase().includes('deutsch'))
                );
                
                // Fetch magnets
                return Promise.all(filtered.slice(0, 10).map(async item => {
                    const magnet = await getMagnetFrom1337x(`https://1337x.to${item.link}`);
                    return {
                        source: '1337x',
                        name: item.name,
                        seeders: item.seeders,
                        size: item.size,
                        magnet: magnet
                    };
                }));
            }
        } catch (e) {
            console.log('[1337x] Strategy failed:', e.message);
        }
    }
    
    return [];
}

async function getMagnetFrom1337x(url) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) return null;
        const html = await response.text();
        
        const magnetMatch = html.match(/href="(magnet:\?[^"]+)"/);
        return magnetMatch ? magnetMatch[1] : null;
    } catch (error) {
        console.error('[1337x] Magnet error:', error.message);
        return null;
    }
}

// ========== TPB SEARCH ==========

async function searchTPB(query) {
    try {
        const searchQuery = encodeURIComponent(`${query} german`);
        const url = `https://apibay.org/q.php?q=${searchQuery}`;
        
        console.log(`[TPB] Searching: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
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
                size: formatBytes(parseInt(item.size)),
                magnet: `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.name)}&tr=udp://tracker.coppersurfer.tk:6969/announce&tr=udp://tracker.openbittorrent.com:6969/announce&tr=udp://tracker.opentrackr.org:1337/announce`
            }));
        
        console.log(`[TPB] Found ${results.length} results`);
        return results;
        
    } catch (error) {
        console.error('[TPB] Error:', error.message);
        return [];
    }
}

function formatBytes(bytes) {
    if (!bytes || isNaN(bytes)) return 'Unknown';
    const gb = bytes / 1073741824;
    if (gb >= 1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / 1048576;
    return `${mb.toFixed(2)} MB`;
}

// ========== EXPORT ==========

// Nuvio expects these exact function names
if (typeof module !== 'undefined') {
    module.exports = {
        manifest,
        getStreams,
        getCatalog,
        getMeta
    };
}

// Also expose on globalThis for safety
if (typeof globalThis !== 'undefined') {
    globalThis.manifest = manifest;
    globalThis.getStreams = getStreams;
    globalThis.getCatalog = getCatalog;
    globalThis.getMeta = getMeta;
}
