var BASE_URL = 'https://www.diziyou.one';
var STORAGE_URL = 'https://storage.diziyou.one';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': BASE_URL + '/'
};

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

                // Debug: Başlık bilgisi
                var debugInfo = 'TMDB:' + title.substring(0, 15);

                // DiziYou'da ara
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(title), { headers: HEADERS })
                    .then(function(r) { return r.text(); })
                    .then(function(html) {
                        // İlk sonucu al
                        var match = html.match(/<a[^>]+href="([^"]+)"[^>]*>[\s\S]*?<div[^>]*id="categorytitle"[^>]*>([\s\S]*?)<\/div>/i);
                        
                        if (!match) {
                            return [{
                                name: '⌜ DiziYou ⌟ | HATA',
                                title: debugInfo + ' | DiziYou\'da bulunamadı',
                                url: 'http://example.com/test.m3u8',
                                quality: '720p',
                                size: 'NO_MATCH',
                                provider: 'diziyou',
                                type: 'hls'
                            }];
                        }
                        
                        var seriesUrl = match[1].startsWith('http') ? match[1] : BASE_URL + match[1];
                        var seriesTitle = match[2].replace(/<[^>]+>/g, '').trim();
                        
                        // Dizi sayfasına git
                        return fetch(seriesUrl, { headers: HEADERS })
                            .then(function(r) { return r.text(); })
                            .then(function(seriesHtml) {
                                // Bölümleri bul - tüm bölümleri al
                                var episodeRegex = /<div[^>]*class="[^"]*bolumust[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/a>/gi;
                                var episodeMatches = seriesHtml.match(episodeRegex) || [];
                                
                                if (episodeMatches.length === 0) {
                                    return [{
                                        name: '⌜ DiziYou ⌟ | HATA',
                                        title: debugInfo + ' | Bölüm bulunamadı',
                                        url: 'http://example.com/test.m3u8',
                                        quality: '720p',
                                        size: 'NO_EPISODES',
                                        provider: 'diziyou',
                                        type: 'hls'
                                    }];
                                }

                                // İstenen sezon ve bölümü bul veya ilk bölümü al
                                var targetEpisode = null;
                                
                                for (var i = 0; i < episodeMatches.length; i++) {
                                    var epHtml = episodeMatches[i];
                                    
                                    // Bölüm bilgilerini çıkar
                                    var epNameMatch = epHtml.match(/<div[^>]*class="[^"]*bolumismi[^"]*"[^>]*>([^<]*)<\/div>/i);
                                    var epName = epNameMatch ? epNameMatch[1].trim() : '';
                                    
                                    var epTitleMatch = epHtml.match(/<div[^>]*class="[^"]*baslik[^"]*"[^>]*>([^<]*)<\/div>/i);
                                    var epTitle = epTitleMatch ? epTitleMatch[1].trim() : '';
                                    
                                    // Sezon ve bölüm numarası
                                    var seasonMatch = (epName + ' ' + epTitle).match(/(\d+)\.\s*Sezon/i);
                                    var episodeMatch = (epName + ' ' + epTitle).match(/(\d+)\.\s*Bölüm/i);
                                    
                                    var epSeason = seasonMatch ? parseInt(seasonMatch[1]) : 1;
                                    var epEpisode = episodeMatch ? parseInt(episodeMatch[1]) : null;
                                    
                                    // Eşleşme kontrolü
                                    if (epSeason === seasonNum && epEpisode === episodeNum) {
                                        // Parent anchor'ı bul
                                        var beforeMatch = seriesHtml.substring(0, seriesHtml.indexOf(epHtml)).match(/<a[^>]+href="([^"]+)"[^>]*>[^<]*$/);
                                        var afterMatch = seriesHtml.substring(seriesHtml.indexOf(epHtml) + epHtml.length).match(/^[\s\S]*?<a[^>]+href="([^"]+)"/);
                                        
                                        var epHref = beforeMatch ? beforeMatch[1] : (afterMatch ? afterMatch[1] : null);
                                        
                                        if (epHref) {
                                            targetEpisode = {
                                                url: epHref.startsWith('http') ? epHref : BASE_URL + epHref,
                                                name: epName || epTitle,
                                                season: epSeason,
                                                episode: epEpisode
                                            };
                                            break;
                                        }
                                    }
                                }
                                
                                // Eşleşme yoksa ilk bölümü al
                                if (!targetEpisode && episodeMatches.length > 0) {
                                    var firstEpHtml = episodeMatches[0];
                                    var beforeMatch = seriesHtml.substring(0, seriesHtml.indexOf(firstEpHtml)).match(/<a[^>]+href="([^"]+)"[^>]*>[^<]*$/);
                                    var afterMatch = seriesHtml.substring(seriesHtml.indexOf(firstEpHtml) + firstEpHtml.length).match(/^[\s\S]*?<a[^>]+href="([^"]+)"/);
                                    
                                    var epHref = beforeMatch ? beforeMatch[1] : (afterMatch ? afterMatch[1] : null);
                                    
                                    if (epHref) {
                                        targetEpisode = {
                                            url: epHref.startsWith('http') ? epHref : BASE_URL + epHref,
                                            name: 'İlk Bölüm',
                                            season: 1,
                                            episode: 1
                                        };
                                    }
                                }
                                
                                if (!targetEpisode) {
                                    return [{
                                        name: '⌜ DiziYou ⌟ | HATA',
                                        title: debugInfo + ' | Hedef bölüm bulunamadı',
                                        url: 'http://example.com/test.m3u8',
                                        quality: '720p',
                                        size: 'NO_TARGET_EP',
                                        provider: 'diziyou',
                                        type: 'hls'
                                    }];
                                }

                                // Bölüm sayfasına git
                                return fetch(targetEpisode.url, { headers: HEADERS })
                                    .then(function(r) { return r.text(); })
                                    .then(function(epHtml) {
                                        // iframe'den itemId çıkar
                                        var iframeMatch = epHtml.match(/<iframe[^>]+id="[^"]*diziyouPlayer[^"]*"[^>]+src="([^"]+)"/i);
                                        
                                        if (!iframeMatch) {
                                            // Alternatif: data-src dene
                                            iframeMatch = epHtml.match(/<iframe[^>]+data-src="([^"]+)"/i);
                                        }
                                        
                                        if (!iframeMatch) {
                                            return [{
                                                name: '⌜ DiziYou ⌟ | HATA',
                                                title: debugInfo + ' | Player bulunamadı',
                                                url: 'http://example.com/test.m3u8',
                                                quality: '720p',
                                                size: 'NO_IFRAME',
                                                provider: 'diziyou',
                                                type: 'hls'
                                            }];
                                        }
                                        
                                        var iframeSrc = iframeMatch[1];
                                        var itemId = iframeSrc.split('/').pop().replace('.html', '');
                                        
                                        // Stream seçeneklerini kontrol et
                                        var hasTurkceAltyazili = epHtml.includes('turkceAltyazili') || epHtml.includes('id="turkceAltyazili"');
                                        var hasTurkceDublaj = epHtml.includes('turkceDublaj') || epHtml.includes('id="turkceDublaj"');
                                        var hasIngilizceAltyazili = epHtml.includes('ingilizceAltyazili') || epHtml.includes('id="ingilizceAltyazili"');
                                        
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
                                                title: 'S' + targetEpisode.season + 'E' + targetEpisode.episode + ' · 720p',
                                                url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8',
                                                quality: '720p',
                                                size: 'HLS [ID:' + itemId + ']',
                                                headers: HEADERS,
                                                subtitles: subtitles,
                                                provider: 'diziyou',
                                                type: 'hls'
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
                                                title: 'S' + targetEpisode.season + 'E' + targetEpisode.episode + ' · 720p',
                                                url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8',
                                                quality: '720p',
                                                size: 'HLS [ID:' + itemId + ']',
                                                headers: HEADERS,
                                                subtitles: subtitles,
                                                provider: 'diziyou',
                                                type: 'hls'
                                            });
                                        }
                                        
                                        // Türkçe Dublaj
                                        if (hasTurkceDublaj) {
                                            streams.push({
                                                name: '⌜ DiziYou ⌟ | Dublaj',
                                                title: 'S' + targetEpisode.season + 'E' + targetEpisode.episode + ' · 720p',
                                                url: STORAGE_URL + '/episodes/' + itemId + '_tr/play.m3u8',
                                                quality: '720p',
                                                size: 'HLS [ID:' + itemId + '_tr]',
                                                headers: HEADERS,
                                                subtitles: subtitles,
                                                provider: 'diziyou',
                                                type: 'hls'
                                            });
                                        }
                                        
                                        // Hiçbir seçenek yoksa varsayılan
                                        if (streams.length === 0) {
                                            streams.push({
                                                name: '⌜ DiziYou ⌟ | Varsayılan',
                                                title: 'S' + targetEpisode.season + 'E' + targetEpisode.episode + ' · 720p',
                                                url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8',
                                                quality: '720p',
                                                size: 'HLS [ID:' + itemId + ']',
                                                headers: HEADERS,
                                                subtitles: [],
                                                provider: 'diziyou',
                                                type: 'hls'
                                            });
                                        }
                                        
                                        return streams;
                                    });
                            });
                    });
            })
            .then(function(streams) { resolve(streams); })
            .catch(function(err) {
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
