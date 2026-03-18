/**
 * DiziPal v41 - Enhanced Scraping
 * Mimari: Promise tabanlı, Cloudflare-aware
 */

var cheerio = require("cheerio-without-node-native");

// Alternatif domainler (DiziPal sık değişir)
var DOMAINS = [
    'https://dizipal1543.com',
    'https://dizipal1544.com', 
    'https://dizipal1545.com'
];

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.0.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(async function(resolve, reject) {
        var isMovie = mediaType === 'movie';
        
        console.error('[DiziPal] TMDB ID: ' + tmdbId + ' | Type: ' + mediaType);

        try {
            // 1. TMDB'den metadata al
            var tmdbUrl = 'https://api.themoviedb.org/3/' + 
                (isMovie ? 'movie' : 'tv') + '/' + tmdbId + 
                '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
            
            var tmdbRes = await fetch(tmdbUrl);
            var tmdbData = await tmdbRes.json();
            
            var title = tmdbData.title || tmdbData.name || tmdbData.original_name;
            var originalTitle = tmdbData.original_title || tmdbData.original_name;
            
            if (!title) throw new Error('Baslik bulunamadi');

            console.error('[DiziPal] Baslik: ' + title + ' / ' + originalTitle);

            // 2. Farklı slug formatlarını dene
            var slugAttempts = generateSlugs(title, originalTitle, isMovie, seasonNum, episodeNum);
            
            var streams = [];
            
            for (var domain of DOMAINS) {
                for (var slugPath of slugAttempts) {
                    try {
                        var targetUrl = domain + slugPath;
                        console.error('[DiziPal] Deneniyor: ' + targetUrl);
                        
                        var res = await fetch(targetUrl, { 
                            headers: HEADERS,
                            redirect: 'follow'
                        });
                        
                        if (!res.ok) continue;
                        
                        var html = await res.text();
                        
                        // Cloudflare kontrolü
                        if (html.includes('cf-browser-verification') || html.includes('cf_chl_jschl_tk')) {
                            console.error('[DiziPal] Cloudflare engeli: ' + domain);
                            continue;
                        }

                        var found = extractStreams(html, domain, targetUrl);
                        
                        if (found.length > 0) {
                            console.error('[DiziPal] Bulunan: ' + found.length + ' kaynak');
                            streams = streams.concat(found);
                            break; // Başarılı, döngüden çık
                        }
                    } catch (e) {
                        console.error('[DiziPal] Hata: ' + e.message);
                    }
                }
                if (streams.length > 0) break;
            }

            resolve(streams.length > 0 ? streams : []);

        } catch (
