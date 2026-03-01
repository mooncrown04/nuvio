// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// JavaScript versiyonu

var BASE_URL = 'https://www.diziyou.one';
var STORAGE_URL = 'https://storage.diziyou.one';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
};

// Ana sayfa bölümlerini getir
function getMainPage() {
    return fetch(BASE_URL, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var home = [];
            
            // 1. Popüler Dizilerden Son Bölümler
            var populerRegex = /<div[^>]*class="[^"]*dsmobil[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi;
            var populerMatch;
            var populer = [];
            
            while ((populerMatch = populerRegex.exec(html)) !== null) {
                var el = populerMatch[0];
                
                // a etiketini bul
                var anchorMatch = el.match(/<a[^>]+href="([^"]+)"[^>]*>/i);
                if (!anchorMatch) continue;
                
                var fullEpisodeUrl = anchorMatch[1];
                if (!fullEpisodeUrl.startsWith('http')) {
                    fullEpisodeUrl = BASE_URL + fullEpisodeUrl;
                }
                
                // Slug çıkar
                var slug = fullEpisodeUrl
                    .replace(BASE_URL + '/', '')
                    .replace(/-\d+-sezon-\d+-bolum\/?$/, '');
                var href = BASE_URL + '/' + slug + '/';
                
                // Başlık
                var titleMatch = el.match(/<img[^>]+alt="([^"]+)"/i);
                var title = titleMatch ? titleMatch[1].trim() : null;
                if (!title) continue;
                
                // Poster
                var posterMatch = el.match(/<img[^>]+data-src="([^"]+)"/i) || 
                                 el.match(/<img[^>]+src="([^"]+)"/i);
                var poster = posterMatch ? posterMatch[1] : null;
                if (poster && !poster.startsWith('http')) {
                    poster = BASE_URL + poster;
                }
                
                // Tekrar kontrolü
                var duplicate = false;
                for (var i = 0; i < populer.length; i++) {
                    if (populer[i].url === href) {
                        duplicate = true;
                        break;
                    }
                }
                
                if (!duplicate) {
                    populer.push({
                        title: title,
                        url: href,
                        posterUrl: poster,
                        type: 'tv'
                    });
                }
            }
            
            if (populer.length > 0) {
                home.push({ name: 'Popüler Dizilerden Son Bölümler', items: populer });
            }
            
            // 2. Son Eklenen Diziler
            var sonEklenen = extractSeriesList(html, 'dsmobil2', 'Son Eklenen Diziler');
            if (sonEklenen) home.push(sonEklenen);
            
            // 3. Efsane Diziler
            var efsane = extractSeriesList(html, 'incontent', 'Efsane Diziler');
            if (efsane) home.push(efsane);
            
            // 4. Dikkat Çeken Diziler
            var dikkat = extractSeriesList(html, 'incontentyeni', 'Dikkat Çeken Diziler');
            if (dikkat) home.push(dikkat);
            
            return home;
        });
}

// Yardımcı fonksiyon - dizi listesi çıkar
function extractSeriesList(html, containerClass, listName) {
    var containerRegex = new RegExp('<div[^>]*class="[^"]*' + containerClass + '[^"]*"[^>]*>[\\s\\S]*?</div>\\s*</div>', 'gi');
    var containerMatch = containerRegex.exec(html);
    if (!containerMatch) return null;
    
    var container = containerMatch[0];
    var items = [];
    
    var seriesRegex = /<div[^>]*id="list-series-main"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi;
    var seriesMatch;
    
    while ((seriesMatch = seriesRegex.exec(container)) !== null) {
        var el = seriesMatch[0];
        
        var hrefMatch = el.match(/<div[^>]*class="[^"]*cat-img-main[^"]*"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"/i);
        var href = hrefMatch ? hrefMatch[1] : null;
        if (!href) continue;
        if (!href.startsWith('http')) href = BASE_URL + href;
        
        var posterMatch = el.match(/<div[^>]*class="[^"]*cat-img-main[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i);
        var poster = posterMatch ? posterMatch[1] : null;
        if (poster && !poster.startsWith('http')) poster = BASE_URL + poster;
        
        var titleMatch = el.match(/<div[^>]*class="[^"]*cat-title-main[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
        var title = titleMatch ? titleMatch[1].trim() : null;
        if (!title) continue;
        
        items.push({
            title: title,
            url: href,
            posterUrl: poster,
            type: 'tv'
        });
    }
    
    return items.length > 0 ? { name: listName, items: items } : null;
}

// Arama fonksiyonu
function search(query) {
    var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
    
    return fetch(searchUrl, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var results = [];
            var regex = /<div[^>]*id="list-series"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi;
            var match;
            
            while ((match = regex.exec(html)) !== null) {
                var el = match[0];
                
                var titleMatch = el.match(/<div[^>]*id="categorytitle"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
                var title = titleMatch ? titleMatch[1] : null;
                if (!title) continue;
                
                var hrefMatch = el.match(/<div[^>]*id="categorytitle"[^>]*>[\s\S]*?<a[^>]+href="([^"]+)"/i);
                var href = hrefMatch ? hrefMatch[1] : null;
                if (!href) continue;
                if (!href.startsWith('http')) href = BASE_URL + href;
                
                var posterMatch = el.match(/<img[^>]+src="([^"]+)"/i);
                var poster = posterMatch ? posterMatch[1] : null;
                if (poster && !poster.startsWith('http')) poster = BASE_URL + poster;
                
                results.push({
                    title: title,
                    url: href,
                    posterUrl: poster,
                    type: 'tv'
                });
            }
            
            return results;
        });
}

// Detay sayfasını yükle
function load(url) {
    return fetch(url, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            // Başlık
            var titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
            var title = titleMatch ? titleMatch[1].trim() : null;
            if (!title) return null;
            
            // Poster
            var posterMatch = html.match(/<div[^>]*class="[^"]*category_image[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/i);
            var poster = posterMatch ? posterMatch[1] : null;
            if (poster && !poster.startsWith('http')) poster = BASE_URL + poster;
            
            // Açıklama
            var descMatch = html.match(/<div[^>]*class="[^"]*diziyou_desc[^"]*"[^>]*>([^<]+)/i);
            var description = descMatch ? descMatch[1].trim() : null;
            
            // Yıl
            var yearMatch = html.match(/<span[^>]*class="[^"]*dizimeta[^"]*"[^>]*>Yapım Yılı<\/span>\s*([^<]+)/i);
            var year = yearMatch ? parseInt(yearMatch[1].trim()) : null;
            
            // Etiketler
            var tags = [];
            var genreRegex = /<div[^>]*class="[^"]*genres[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi;
            var genreMatch;
            while ((genreMatch = genreRegex.exec(html)) !== null) {
                tags.push(genreMatch[1]);
            }
            
            // Oyuncular
            var actorsMatch = html.match(/<span[^>]*class="[^"]*dizimeta[^"]*"[^>]*>Oyuncular<\/span>\s*([^<]+)/i);
            var actors = actorsMatch ? actorsMatch[1].trim().split(', ') : [];
            
            // Fragman
            var trailerMatch = html.match(/<iframe[^>]*class="[^"]*trailer-video[^"]*"[^>]+src="([^"]+)"/i);
            var trailer = trailerMatch ? trailerMatch[1] : null;
            
            // Bölümler
            var episodes = [];
            var epRegex = /<div[^>]*class="[^"]*bolumust[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/a>/gi;
            var epMatch;
            
            while ((epMatch = epRegex.exec(html)) !== null) {
                var epEl = epMatch[0];
                var epContainer = epMatch[1];
                
                var epNameMatch = epContainer.match(/<div[^>]*class="[^"]*baslik[^"]*"[^>]*>([^<]+)/i);
                var epName = epNameMatch ? epNameMatch[1].trim() : null;
                if (!epName) continue;
                
                var epHrefMatch = epEl.match(/<a[^>]+href="([^"]+)"/i);
                var epHref = epHrefMatch ? epHrefMatch[1] : null;
                if (!epHref) continue;
                if (!epHref.startsWith('http')) epHref = BASE_URL + epHref;
                
                // Sezon ve bölüm numarası
                var epNumMatch = epName.match(/(\d+)\.\s*Bölüm/i);
                var epNum = epNumMatch ? parseInt(epNumMatch[1]) : null;
                
                var seasonMatch = epName.match(/(\d+)\.\s*Sezon/i);
                var seasonNum = seasonMatch ? parseInt(seasonMatch[1]) : 1;
                
                var displayNameMatch = epContainer.match(/<div[^>]*class="[^"]*bolumismi[^"]*"[^>]*>([^<]+)/i);
                var displayName = displayNameMatch ? 
                    displayNameMatch[1].trim().replace(/[()]/g, '').trim() : epName;
                
                episodes.push({
                    name: displayName,
                    url: epHref,
                    season: seasonNum,
                    episode: epNum
                });
            }
            
            return {
                title: title,
                url: url,
                posterUrl: poster,
                plot: description,
                year: year,
                tags: tags,
                actors: actors,
                trailer: trailer,
                episodes: episodes,
                type: 'tv'
            };
        });
}

// Stream linklerini getir
function loadLinks(data) {
    console.log('[DiziYou] Loading:', data);
    
    return fetch(data, { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            // iframe'den itemId çıkar
            var iframeMatch = html.match(/<iframe[^>]*id="diziyouPlayer"[^>]+src="[^"]*\/([^\/]+)\.html"/i);
            var itemId = iframeMatch ? iframeMatch[1] : null;
            if (!itemId) {
                console.log('[DiziYou] itemId not found');
                return { streams: [], subtitles: [] };
            }
            
            console.log('[DiziYou] itemId:', itemId);
            
            var subtitles = [];
            var streams = [];
            
            // Seçenekleri bul
            var optionRegex = /<span[^>]*class="[^"]*diziyouOption[^"]*"[^>]*id="([^"]+)"/gi;
            var optionMatch;
            
            while ((optionMatch = optionRegex.exec(html)) !== null) {
                var optId = optionMatch[1];
                
                if (optId === 'turkceAltyazili') {
                    subtitles.push({
                        lang: 'Turkish',
                        url: STORAGE_URL + '/subtitles/' + itemId + '/tr.vtt'
                    });
                    streams.push({
                        name: 'Orjinal Dil',
                        url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8'
                    });
                }
                
                if (optId === 'ingilizceAltyazili') {
                    subtitles.push({
                        lang: 'English',
                        url: STORAGE_URL + '/subtitles/' + itemId + '/en.vtt'
                    });
                    // Orjinal dil zaten eklendi
                }
                
                if (optId === 'turkceDublaj') {
                    streams.push({
                        name: 'Türkçe Dublaj',
                        url: STORAGE_URL + '/episodes/' + itemId + '_tr/play.m3u8'
                    });
                }
            }
            
            // Eğer hiç seçenek yoksa varsayılan ekle
            if (streams.length === 0) {
                streams.push({
                    name: 'Varsayılan',
                    url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8'
                });
            }
            
            return {
                streams: streams,
                subtitles: subtitles,
                headers: {
                    'Referer': BASE_URL + '/'
                }
            };
        });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getMainPage: getMainPage,
        search: search,
        load: load,
        loadLinks: loadLinks,
        name: 'DiziYou',
        baseUrl: BASE_URL
    };
} else {
    global.DiziYou = {
        getMainPage: getMainPage,
        search: search,
        load: load,
        loadLinks: loadLinks,
        name: 'DiziYou',
        baseUrl: BASE_URL
    };
}