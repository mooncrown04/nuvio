var BASE_URL = 'https://www.diziyou.one';
var STORAGE_URL = 'https://storage.diziyou.one';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
};

function findFirst(html, pattern) {
    var regex = new RegExp(pattern, 'i');
    var match = regex.exec(html);
    return match ? match : null;
}

function searchDiziYou(title) {
    var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(title);
    console.log('[DiziYou] Search URL:', searchUrl);

    return fetch(searchUrl, { 
        headers: HEADERS,
        redirect: 'follow'
    })
    .then(function(res) { 
        console.log('[DiziYou] Search status:', res.status);
        return res.text(); 
    })
    .then(function(html) {
        // Debug: HTML'den bir parça göster
        console.log('[DiziYou] HTML length:', html.length);
        console.log('[DiziYou] HTML preview:', html.substring(0, 500));

        var results = [];
        
        // Yöntem 1: list-series içinde ara
        var listSeriesMatch = html.match(/<div[^>]*id="list-series"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
        if (listSeriesMatch) {
            console.log('[DiziYou] Found list-series');
            var seriesHtml = listSeriesMatch[1];
            
            // Her bir dizi kartını bul
            var cardPattern = /<div[^>]*id="list-series-main"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
            var cards;
            while ((cards = cardPattern.exec(seriesHtml)) !== null) {
                var card = cards[1];
                
                // Link ve başlık
                var linkMatch = card.match(/<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<div[^>]*class="[^"]*cat-title-main[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
                if (!linkMatch) continue;
                
                var href = linkMatch[1];
                var titleDiv = linkMatch[2];
                var seriesTitle = titleDiv.replace(/<[^>]+>/g, '').trim();
                
                // Poster
                var posterMatch = card.match(/<img[^>]+src="([^"]+)"/i);
                var poster = posterMatch ? posterMatch[1] : null;
                
                if (href && seriesTitle) {
                    results.push({
                        title: seriesTitle,
                        url: href.startsWith('http') ? href : BASE_URL + href,
                        poster: poster
                    });
                    console.log('[DiziYou] Found series:', seriesTitle);
                }
            }
        }
        
        // Yöntem 2: Genel arama sonuçları (list-series yoksa)
        if (results.length === 0) {
            console.log('[DiziYou] Trying alternative search pattern');
            var altPattern = /<article[^>]*>([\s\S]*?)<\/article>/gi;
            var altMatch;
            while ((altMatch = altPattern.exec(html)) !== null) {
                var article = altMatch[1];
                var linkMatch = article.match(/<a[^>]+href="([^"]+)"[^>]*title="([^"]+)"/i);
                if (linkMatch) {
                    results.push({
                        title: linkMatch[2].trim(),
                        url: linkMatch[1].startsWith('http') ? linkMatch[1] : BASE_URL + linkMatch[1],
                        poster: null
                    });
                }
            }
        }

        console.log('[DiziYou] Total results:', results.length);
        return results;
    });
}

function findBestMatch(results, query) {
    if (!results || results.length === 0) return null;
    var queryLower = query.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Tam eşleşme
    for (var i = 0; i < results.length; i++) {
        var resultClean = results[i].title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (resultClean === queryLower) return results[i];
    }
    
    // İçeren eşleşme
    for (var j = 0; j < results.length; j++) {
        var resultClean = results[j].title.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (resultClean.includes(queryLower)) return results[j];
    }
    
    // İlk sonuç
    return results[0];
}

function loadSeriesPage(url) {
    console.log('[DiziYou] Loading series:', url);

    return fetch(url, { 
        headers: HEADERS,
        redirect: 'follow'
    })
    .then(function(res) { 
        console.log('[DiziYou] Series page status:', res.status);
        return res.text(); 
    })
    .then(function(html) {
        console.log('[DiziYou] Series HTML length:', html.length);
        
        var episodes = [];
        
        // Yöntem 1: bolumust class'ını bul
        var bolumPattern = /<div[^>]*class="[^"]*bolumust[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
        var bolumMatches = html.match(bolumPattern) || [];
        console.log('[DiziYou] Found bolumust elements:', bolumMatches.length);
        
        // Tüm HTML'de bölüm linklerini ara
        var allLinks = html.match(/<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<div[^>]*class="[^"]*bolumust[^"]*"[^>]*>/gi) || [];
        console.log('[DiziYou] Found episode links:', allLinks.length);
        
        for (var i = 0; i < allLinks.length; i++) {
            var linkHtml = allLinks[i];
            
            // URL çıkar
            var hrefMatch = linkHtml.match(/href="([^"]+)"/i);
            if (!hrefMatch) continue;
            
            var epHref = hrefMatch[1];
            
            // Bölüm adını bul - sonraki HTML'den
            var afterLink = html.substring(html.indexOf(linkHtml) + linkHtml.length);
            var nameMatch = afterLink.match(/<div[^>]*class="[^"]*bolumismi[^"]*"[^>]*>([^<]*)<\/div>/i);
            var titleMatch = afterLink.match(/<div[^>]*class="[^"]*baslik[^"]*"[^>]*>([^<]*)<\/div>/i);
            
            var epName = nameMatch ? nameMatch[1].trim() : (titleMatch ? titleMatch[1].trim() : 'Bölüm ' + (i + 1));
            
            // Sezon ve bölüm numarası
            var seasonMatch = epName.match(/(\d+)\.\s*Sezon/i);
            var episodeMatch = epName.match(/(\d+)\.\s*Bölüm/i);
            
            var seasonNum = seasonMatch ? parseInt(seasonMatch[1]) : 1;
            var episodeNum = episodeMatch ? parseInt(episodeMatch[1]) : (i + 1);
            
            episodes.push({
                url: epHref.startsWith('http') ? epHref : BASE_URL + epHref,
                name: epName,
                season: seasonNum,
                episode: episodeNum
            });
            
            console.log('[DiziYou] Episode found:', epName, 'URL:', epHref.substring(0, 50));
        }

        // Dizi bilgileri
        var titleMatch = findFirst(html, '<h1[^>]*>([^<]*)<\\/h1>');
        var posterMatch = findFirst(html, '<div[^>]*class="[^"]*category_image[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"');
        var descMatch = findFirst(html, '<div[^>]*class="[^"]*diziyou_desc[^"]*"[^>]*>([^<]*)<\\/div>');

        console.log('[DiziYou] Total episodes parsed:', episodes.length);

        return {
            title: titleMatch ? titleMatch[1].trim() : '',
            poster: posterMatch ? posterMatch[1] : null,
            description: descMatch ? descMatch[1].trim() : '',
            episodes: episodes
        };
    });
}

function extractStreams(episodeUrl) {
    console.log('[DiziYou] Episode URL:', episodeUrl);

    return fetch(episodeUrl, { 
        headers: HEADERS,
        redirect: 'follow'
    })
    .then(function(res) { 
        console.log('[DiziYou] Episode page status:', res.status);
        return res.text(); 
    })
    .then(function(html) {
        console.log('[DiziYou] Episode HTML length:', html.length);

        // iframe'den itemId çıkar - birden fazla yöntem dene
        var iframeMatch = html.match(/<iframe[^>]+id="[^"]*diziyouPlayer[^"]*"[^>]+src="([^"]+)"/i);
        
        if (!iframeMatch) {
            // Alternatif 1: data-src
            iframeMatch = html.match(/<iframe[^>]+data-src="([^"]+)"/i);
        }
        
        if (!iframeMatch) {
            // Alternatif 2: herhangi bir iframe
            iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
        }
        
        if (!iframeMatch) {
            console.log('[DiziYou] No iframe found, HTML preview:', html.substring(html.indexOf('iframe') - 100, html.indexOf('iframe') + 200));
            return null;
        }
        
        var iframeSrc = iframeMatch[1];
        console.log('[DiziYou] Iframe src:', iframeSrc);
        
        var itemId = iframeSrc.split('/').pop().replace('.html', '');
        console.log('[DiziYou] Item ID:', itemId);

        // Stream seçeneklerini kontrol et
        var hasTurkceAltyazili = html.includes('turkceAltyazili') || html.includes('id="turkceAltyazili"') || html.includes('Türkçe Altyazılı');
        var hasTurkceDublaj = html.includes('turkceDublaj') || html.includes('id="turkceDublaj"') || html.includes('Türkçe Dublaj');
        var hasIngilizceAltyazili = html.includes('ingilizceAltyazili') || html.includes('id="ingilizceAltyazili"') || html.includes('İngilizce Altyazılı');

        console.log('[DiziYou] Options - TR Alt:', hasTurkceAltyazili, 'TR Dub:', hasTurkceDublaj, 'EN Alt:', hasIngilizceAltyazili);

        var streams = [];
        var subtitles = [];

        // Türkçe Altyazılı
        if (hasTurkceAltyazili) {
            subtitles.push({ 
                label: 'türkçee', 
                url: STORAGE_URL + '/subtitles/' + itemId + '/tr.vtt' 
            });
            streams.push({
                name: '⌜ DiziYou ⌟ | Orjinal (TR Alt)',
                url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8',
                quality: '720p',
                subtitles: subtitles
            });
        }

        // İngilizce Altyazılı
        if (hasIngilizceAltyazili && !hasTurkceAltyazili) {
            subtitles.push({ 
                label: 'ingilizcee', 
                url: STORAGE_URL + '/subtitles/' + itemId + '/en.vtt' 
            });
            streams.push({
                name: '⌜ DiziYou ⌟ | Orjinal (EN Alt)',
                url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8',
                quality: '720p',
                subtitles: subtitles
            });
        }

        // Türkçe Dublaj
        if (hasTurkceDublaj) {
            streams.push({
                name: '⌜ DiziYou ⌟ | Dublaj',
                url: STORAGE_URL + '/episodes/' + itemId + '_tr/play.m3u8',
                quality: '720p',
                subtitles: subtitles
            });
        }

        // Eğer hiçbir şey bulunamazsa varsayılan
        if (streams.length === 0) {
            console.log('[DiziYou] No options found, using default');
            streams.push({
                name: '⌜ DiziYou ⌟ | Varsayılan',
                url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8',
                quality: '720p',
                subtitles: []
            });
        }

        return {
            streams: streams,
            subtitles: subtitles,
            itemId: itemId
        };
    });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'tv') {
            resolve([{
                name: '⌜ DiziYou ⌟ | HATA',
                title: 'Sadece TV dizileri desteklenir',
                url: 'http://example.com/test.m3u8',
                quality: '720p',
                size: 'TV_ONLY',
                provider: 'diziyou',
                type: 'hls'
            }]);
            return;
        }

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.name || data.original_name || '';
                var year = (data.first_air_date || '').substring(0, 4);
                
                console.log('[DiziYou] TMDB title:', title);

                if (!title) {
                    return [{
                        name: '⌜ DiziYou ⌟ | HATA',
                        title: 'TMDB\'de başlık bulunamadı',
                        url: 'http://example.com/test.m3u8',
                        quality: '720p',
                        size: 'NO_TMDB_TITLE',
                        provider: 'diziyou',
                        type: 'hls'
                    }];
                }

                // DiziYou'da ara
                return searchDiziYou(title)
                    .then(function(results) {
                        if (!results || results.length === 0) {
                            // Alternatif: orijinal ismi dene
                            var originalName = data.original_name || '';
                            if (originalName && originalName !== title) {
                                console.log('[DiziYou] Trying original name:', originalName);
                                return searchDiziYou(originalName);
                            }
                            return [];
                        }
                        return results;
                    })
                    .then(function(results) {
                        if (!results || results.length === 0) {
                            return [{
                                name: '⌜ DiziYou ⌟ | HATA',
                                title: title.substring(0, 30) + ' | DiziYou\'da bulunamadı',
                                url: 'http://example.com/test.m3u8',
                                quality: '720p',
                                size: 'NO_MATCH',
                                provider: 'diziyou',
                                type: 'hls'
                            }];
                        }

                        var best = findBestMatch(results, title);
                        console.log('[DiziYou] Best match:', best.title, best.url);

                        return loadSeriesPage(best.url)
                            .then(function(seriesData) {
                                if (!seriesData.episodes || seriesData.episodes.length === 0) {
                                    return [{
                                        name: '⌜ DiziYou ⌟ | HATA',
                                        title: best.title.substring(0, 30) + ' | Bölüm bulunamadı',
                                        url: 'http://example.com/test.m3u8',
                                        quality: '720p',
                                        size: 'NO_EPISODES',
                                        provider: 'diziyou',
                                        type: 'hls'
                                    }];
                                }

                                // İstenen sezon ve bölümü bul
                                var targetEpisode = null;
                                for (var i = 0; i < seriesData.episodes.length; i++) {
                                    var ep = seriesData.episodes[i];
                                    if (ep.season === seasonNum && ep.episode === episodeNum) {
                                        targetEpisode = ep;
                                        break;
                                    }
                                }

                                // Eşleşme yoksa ilk bölümü al
                                if (!targetEpisode) {
                                    targetEpisode = seriesData.episodes[0];
                                    console.log('[DiziYou] Using first episode:', targetEpisode.name);
                                }

                                return extractStreams(targetEpisode.url)
                                    .then(function(streamData) {
                                        if (!streamData) {
                                            return [{
                                                name: '⌜ DiziYou ⌟ | HATA',
                                                title: 'Stream bulunamadı',
                                                url: 'http://example.com/test.m3u8',
                                                quality: '720p',
                                                size: 'NO_STREAM',
                                                provider: 'diziyou',
                                                type: 'hls'
                                            }];
                                        }

                                        return streamData.streams.map(function(stream, idx) {
                                            return {
                                                name: stream.name,
                                                title: 'S' + (targetEpisode.season || seasonNum) + 'E' + (targetEpisode.episode || episodeNum) + ' · ' + stream.quality + ' [ID:' + streamData.itemId + ']',
                                                url: stream.url,
                                                quality: stream.quality,
                                                size: 'HLS',
                                                headers: HEADERS,
                                                subtitles: stream.subtitles || [],
                                                provider: 'diziyou',
                                                type: 'hls'
                                            };
                                        });
                                    });
                            });
                    });
            })
            .then(function(streams) { resolve(streams); })
            .catch(function(err) {
                console.error('[DiziYou] Fatal error:', err);
                resolve([{
                    name: '⌜ DiziYou ⌟ | HATA',
                    title: err.message ? err.message.substring(0, 30) : 'Bilinmeyen hata',
                    url: 'http://example.com/test.m3u8',
                    quality: '720p',
                    size: 'ERROR: ' + (err.message ? err.message.substring(0, 20) : 'Unknown'),
                    provider: 'diziyou',
                    type: 'hls'
                }]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
