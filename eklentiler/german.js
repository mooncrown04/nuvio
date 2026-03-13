const axios = require('axios');
const cheerio = require('cheerio');

// Nuvio addon structure
const addon = {
    manifest: require('./manifest.json'),
    
    // Catalog handler
    async defineCatalogHandler({ type, id, extra }) {
        console.log(`[CATALOG] type=${type}, id=${id}, search=${extra?.search || 'none'}`);
        
        if (!extra?.search) {
            return { metas: [] };
        }
        
        // Search for German content
        const results = await searchGermanContent(extra.search, type);
        
        return {
            metas: results.map(r => ({
                id: `tmdb:${r.tmdbId || 'unknown'}`,
                type: type,
                name: r.name,
                poster: r.poster || 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=German+Dub',
                description: r.description || `${r.seeders || 0} seeders`,
                releaseInfo: r.year || ''
            }))
        };
    },
    
    // Meta handler
    async defineMetaHandler({ type, id }) {
        console.log(`[META] type=${type}, id=${id}`);
        
        const tmdbId = id.replace('tmdb:', '');
        
        // Fetch from TMDB
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
        
        // Get title from TMDB
        let title = 'Unknown';
        try {
            const tmdbData = await fetchTMDB(tmdbId, type);
            title = tmdbData.name || tmdbData.title || 'Unknown';
        } catch (e) {
            console.error('TMDB fetch failed:', e.message);
        }
        
        console.log(`Searching streams for: ${title}`);
        
        // Search multiple sources
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

// Helper: Fetch TMDB data
async function fetchTMDB(id, type) {
    const tmdbType = type === 'series' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/${tmdbType}/${id}?api_key=YOUR_TMDB_KEY`;
    
    try {
        const response = await axios.get(url, { timeout: 5000 });
        const data = response.data;
        
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
        tmdbId: null, // We don't have TMDB IDs from torrent sites
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

// Helper: Search 1337x
async function search1337x(query) {
    try {
        const searchQuery = `${query} german`;
        const url = `https://1337x.to/search/${encodeURIComponent(searchQuery)}/1/`;
        
        console.log(`[1337x] Searching: ${url}`);
        
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(response.data);
        const results = [];
        
        $('.table-list tbody tr').slice(0, 10).each((i, elem) => {
            const name = $(elem).find('.name a:nth-child(2)').text().trim();
            const seeders = parseInt($(elem).find('.seeds').text()) || 0;
            const size = $(elem).find('.size').text().trim();
            const link = $(elem).find('.name a:nth-child(2)').attr('href');
            
            if (name && link && seeders > 0 && 
                (name.toLowerCase().includes('german') || 
                 name.toLowerCase().includes('deutsch'))) {
                results.push({
                    source: '1337x',
                    name: name,
                    seeders: seeders,
                    size: size,
                    url: `https://1337x.to${link}`,
                    magnet: null // Will fetch later
                });
            }
        });
        
        // Fetch magnet links
        for (const result of results) {
            result.magnet = await getMagnetFrom1337x(result.url);
        }
        
        console.log(`[1337x] Found ${results.filter(r => r.magnet).length} results`);
        
        return results.filter(r => r.magnet);
    } catch (error) {
        console.error('[1337x] Error:', error.message);
        return [];
    }
}

// Helper: Get magnet from 1337x page
async function getMagnetFrom1337x(url) {
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });
        
        const $ = cheerio.load(response.data);
        return $('a[href^="magnet:?"]').first().attr('href') || null;
    } catch (error) {
        console.error('[1337x] Magnet fetch error:', error.message);
        return null;
    }
}

// Helper: Search The Pirate Bay
async function searchTPB(query) {
    try {
        const searchQuery = `${query} german`;
        const url = `https://apibay.org/q.php?q=${encodeURIComponent(searchQuery)}`;
        
        console.log(`[TPB] Searching: ${url}`);
        
        const response = await axios.get(url, { timeout: 10000 });
        const data = Array.isArray(response.data) ? response.data : [];
        
        const results = data
            .filter(item => 
                item.name && 
                item.seeders > 0 && 
                (item.name.toLowerCase().includes('german') || 
                 item.name.toLowerCase().includes('deutsch'))
            )
            .slice(0, 8)
            .map(item => ({
                source: 'TPB',
                name: item.name,
                seeders: parseInt(item.seeders),
                size: `${(item.size / 1073741824).toFixed(2)} GB`,
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

module.exports = addon;
