// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// InatBox JavaScript versiyonu - SineWix/DiziPal yapısı

var API_BASE = 'https://dizibox.cfd';
var AES_KEY = 'ywevdtjrurkwtqgz'; // Master secret and iv key

var API_HEADERS = {
    'Cache-Control': 'no-cache',
    'Content-Length': '37',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Referer': 'https://speedrestapi.com/',
    'X-Requested-With': 'com.bp.box',
    'User-Agent': 'speedrestapi'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'identity',
    'Referer': 'https://speedrestapi.com/',
    'Origin': 'https://speedrestapi.com',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1'
};

// AES Decryption (CryptoJS gerektirir - CDN: https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js)
function decryptAes(encryptedData) {
    try {
        // Split ve ilk kısmı al
        var firstPart = encryptedData.split(':')[0];
        
        // Base64 decode
        var firstDecoded = CryptoJS.enc.Base64.parse(firstPart);
        
        // İlk decryption
        var key = CryptoJS.enc.Utf8.parse(AES_KEY);
        var iv = CryptoJS.enc.Utf8.parse(AES_KEY);
        
        var decrypted1 = CryptoJS.AES.decrypt(
            { ciphertext: firstDecoded },
            key,
            { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
        );
        
        var firstResult = decrypted1.toString(CryptoJS.enc.Utf8);
        
        // İkinci decryption
        var secondPart = firstResult.split(':')[0];
        var secondDecoded = CryptoJS.enc.Base64.parse(secondPart);
        
        var decrypted2 = CryptoJS.AES.decrypt(
            { ciphertext: secondDecoded },
            key,
            { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
        );
        
        return decrypted2.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.error('[InatBox] AES decryption failed:', e.message);
        return null;
    }
}

function makeInatRequest(url) {
    var hostName = new URL(url).hostname;
    
    var headers = Object.assign({}, API_HEADERS, {
        'Host': hostName
    });
    
    var requestBody = '1=' + AES_KEY + '&0=' + AES_KEY;
    
    return fetch(url, {
        method: 'POST',
        headers: headers,
        body: requestBody
    })
    .then(function(res) { return res.text(); })
    .then(function(encryptedResponse) {
        return decryptAes(encryptedResponse);
    })
    .catch(function(err) {
        console.error('[InatBox] Request failed:', err.message);
        return null;
    });
}

function getApiPaths(mediaType) {
    if (mediaType === 'movie') {
        return { genre: 'film', endpoint: 'movie' };
    }
    return { genre: 'dizi', endpoint: 'show' };
}

function resolveMediaFireLink(link) {
    // InatBox'ta MediaFire yok
    return Promise.resolve(link);
}

function buildStreams(videoLinks, title, year, subtitles, chName) {
    var streams = [];
    
    videoLinks.forEach(function(stream) {
        var streamHeaders = Object.assign({}, STREAM_HEADERS, stream.headers || {});
        
        // Kalite belirleme
        var quality = '720p';
        if (stream.url.includes('1080') || stream.quality === '1080p') quality = '1080p';
        else if (stream.url.includes('720') || stream.quality === '720p') quality = '720p';
        else if (stream.url.includes('480') || stream.quality === '480p') quality = '480p';
        else if (stream.url.includes('360') || stream.quality === '360p') quality = '360p';
        
        // Stream tipi belirleme
        var type = 'VIDEO';
        if (stream.url.includes('.m3u8')) type = 'M3U8';
        else if (stream.url.includes('.mpd')) type = 'DASH';
        
        streams.push({
            name: '⌜ InatBox ⌟ | ' + (chName || stream.name || 'Kaynak'),
            title: title + (year ? ' (' + year + ')' : '') + ' · ' + quality,
            url: stream.url,
            quality: quality,
            size: 'Unknown',
            headers: streamHeaders,
            subtitles: subtitles || [],
            provider: 'inatbox',
            type: type
        });
    });
    
    return Promise.resolve(streams);
}

function vkSourceFix(url) {
    if (url.startsWith('act')) {
        return 'https://vk.com/al_video.php?' + url;
    }
    return url;
}

function parseChContent(item) {
    return {
        chName: item.chName || item.getString?.('chName'),
        chUrl: vkSourceFix(item.chUrl || item.getString?.('chUrl')),
        chImg: item.chImg || item.getString?.('chImg'),
        chHeaders: item.chHeaders || item.getString?.('chHeaders'),
        chReg: item.chReg || item.getString?.('chReg'),
        chType: item.chType || item.getString?.('chType')
    };
}

function extractHeaders(chHeaders, chReg) {
    var headers = {};
    
    try {
        if (chHeaders && chHeaders !== 'null') {
            var parsedHeaders = typeof chHeaders === 'string' ? JSON.parse(chHeaders) : chHeaders;
            var headerObj = Array.isArray(parsedHeaders) ? parsedHeaders[0] : parsedHeaders;
            Object.assign(headers, headerObj);
        }
        
        if (chReg && chReg !== 'null') {
            var parsedReg = typeof chReg === 'string' ? JSON.parse(chReg) : chReg;
            var regObj = Array.isArray(parsedReg) ? parsedReg[0] : parsedReg;
            if (regObj.playSH2) {
                headers['Cookie'] = regObj.playSH2;
            }
        }
    } catch (e) {
        console.log('[InatBox] Header parse error:', e.message);
    }
    
    return headers;
}

function fetchDetailAndStreams(inatId, mediaType, seasonNum, episodeNum) {
    // InatBox'ta ID yerine URL kullanıyoruz
    var detailUrl = inatId;
    
    console.log('[InatBox] Detail URL:', detailUrl);

    return makeInatRequest(detailUrl)
        .then(function(jsonResponse) {
            if (!jsonResponse) return [];
            
            try {
                var data = JSON.parse(jsonResponse);
                
                // Dizi tipi kontrolü
                if (data.diziType) {
                    var title = data.diziName;
                    var year = null; // InatBox'ta yıl bilgisi ayrı değil
                    var posterUrl = data.diziImg;
                    
                    if (mediaType === 'tv' && seasonNum && episodeNum) {
                        // Sezon ve bölüm bulma
                        var seasons = Array.isArray(data) ? data : [data];
                        var targetSeason = seasons[seasonNum - 1];
                        
                        if (targetSeason && targetSeason.diziUrl) {
                            return makeInatRequest(targetSeason.diziUrl)
                                .then(function(epJson) {
                                    if (!epJson) return [];
                                    var episodes = JSON.parse(epJson);
                                    var targetEp = episodes[episodeNum - 1];
                                    
                                    if (targetEp) {
                                        var chContent = parseChContent(targetEp);
                                        return processChContent(chContent, title, year);
                                    }
                                    return [];
                                });
                        }
                    } else if (mediaType === 'movie') {
                        // Film için direkt chContent'leri işle
                        var chContents = Array.isArray(data) ? data : [data];
                        var allStreams = [];
                        
                        var processPromises = chContents.map(function(item) {
                            var chContent = parseChContent(item);
                            return processChContent(chContent, title, year)
                                .then(function(streams) {
                                    allStreams = allStreams.concat(streams);
                                });
                        });
                        
                        return Promise.all(processPromises).then(function() {
                            return allStreams;
                        });
                    }
                }
                
                // Canlı yayın veya diğer tipler
                if (data.chType || (Array.isArray(data) && data[0] && data[0].chType)) {
                    var items = Array.isArray(data) ? data : [data];
                    var allStreams = [];
                    var title = items[0].chName || 'InatBox Live';
                    
                    var processPromises = items.map(function(item) {
                        var chContent = parseChContent(item);
                        return processChContent(chContent, title, null)
                            .then(function(streams) {
                                allStreams = allStreams.concat(streams);
                            });
                    });
                    
                    return Promise.all(processPromises).then(function() {
                        return allStreams;
                    });
                }
                
                return [];
            } catch (e) {
                console.error('[InatBox] Parse error:', e.message);
                return [];
            }
        });
}

function processChContent(chContent, title, year) {
    var chType = chContent.chType;
    var contentToProcess = chContent;
    
    // tekli_regex_lb_sh_3 tipi için ek istek
    if (chType === 'tekli_regex_lb_sh_3') {
        return makeInatRequest(chContent.chUrl)
            .then(function(jsonResponse) {
                if (!jsonResponse) return [];
                
                try {
                    var firstItem = JSON.parse(jsonResponse);
                    firstItem.chHeaders = chContent.chHeaders;
                    firstItem.chReg = chContent.chReg;
                    firstItem.chName = chContent.chName;
                    firstItem.chImg = chContent.chImg;
                    firstItem.chType = chContent.chType;
                    
                    var newContent = parseChContent(firstItem);
                    return extractStreamsFromContent(newContent, title, year);
                } catch (e) {
                    return [];
                }
            });
    }
    
    return extractStreamsFromContent(contentToProcess, title, year);
}

function extractStreamsFromContent(chContent, title, year) {
    var sourceUrl = chContent.chUrl;
    var headers = extractHeaders(chContent.chHeaders, chContent.chReg);
    
    var videoLinks = [];
    
    // VK kaynağı
    if (sourceUrl.includes('vk.com')) {
        videoLinks.push({
            name: 'VK',
            url: sourceUrl,
            quality: '720p',
            headers: headers
        });
    }
    // dzen.ru (Yandex) kaynağı
    else if (sourceUrl.includes('dzen.ru')) {
        videoLinks.push({
            name: 'Yandex',
            url: sourceUrl,
            quality: '720p',
            headers: headers
        });
    }
    // Direkt video kaynakları
    else if (sourceUrl.includes('.m3u8') || sourceUrl.includes('.mp4') || sourceUrl.includes('.mpd')) {
        var quality = '720p';
        if (sourceUrl.includes('1080')) quality = '1080p';
        else if (sourceUrl.includes('480')) quality = '480p';
        else if (sourceUrl.includes('360')) quality = '360p';
        
        var type = sourceUrl.includes('.m3u8') ? 'M3U8' : (sourceUrl.includes('.mpd') ? 'DASH' : 'VIDEO');
        
        videoLinks.push({
            name: chContent.chName || 'Direkt',
            url: sourceUrl,
            quality: quality,
            headers: headers,
            type: type
        });
    }
    // Diğer kaynaklar için extractor çağrısı simülasyonu
    else {
        videoLinks.push({
            name: chContent.chName || 'Kaynak',
            url: sourceUrl,
            quality: '720p',
            headers: headers
        });
    }
    
    return buildStreams(videoLinks, title, year, [], chContent.chName);
}

function searchInatBox(title, mediaType) {
    // InatBox'ta global arama yok, ana sayfa kategorilerinden tarama yapılır
    // Bu yüzden tüm kategorileri taramak gerekir
    
    var categories = [
        { url: API_BASE + '/tv/cable.php', type: 'live' },
        { url: API_BASE + '/tv/list2.php', type: 'live' },
        { url: API_BASE + '/tv/sinema.php', type: 'live' },
        { url: API_BASE + '/tv/belgesel.php', type: 'live' },
        { url: API_BASE + '/tv/ulusal.php', type: 'live' },
        { url: API_BASE + '/tv/haber.php', type: 'live' },
        { url: API_BASE + '/tv/cocuk.php', type: 'live' },
        { url: API_BASE + '/tv/dini.php', type: 'live' },
        { url: API_BASE + '/ex/index.php', type: 'tv' },  // EXXEN
        { url: API_BASE + '/ga/index.php', type: 'tv' },  // Gain
        { url: API_BASE + '/max/index.php', type: 'tv' },  // Max-BluTV
        { url: API_BASE + '/nf/index.php', type: 'movie' }, // Netflix
        { url: API_BASE + '/dsny/index.php', type: 'movie' }, // Disney+
        { url: API_BASE + '/amz/index.php', type: 'movie' }, // Amazon Prime
        { url: API_BASE + '/hb/index.php', type: 'movie' }, // HBO Max
        { url: API_BASE + '/tbi/index.php', type: 'tv' },  // Tabii
        { url: API_BASE + '/film/mubi.php', type: 'movie' }, // Mubi
        { url: API_BASE + '/ccc/index.php', type: 'tv' },  // TOD
        { url: API_BASE + '/yabanci-dizi/index.php', type: 'tv' },
        { url: API_BASE + '/yerli-dizi/index.php', type: 'tv' },
        { url: API_BASE + '/film/yerli-filmler.php', type: 'movie' },
        { url: API_BASE + '/film/4k-film-exo.php', type: 'movie' }
    ];
    
    var results = [];
    var queryLower = title.toLowerCase();
    
    var searchPromises = categories.map(function(cat) {
        if (mediaType === 'movie' && cat.type !== 'movie') return Promise.resolve();
        if (mediaType === 'tv' && cat.type !== 'tv' && cat.type !== 'live') return Promise.resolve();
        
        return makeInatRequest(cat.url)
            .then(function(jsonResponse) {
                if (!jsonResponse) return;
                
                try {
                    var items = JSON.parse(jsonResponse);
                    if (!Array.isArray(items)) items = [items];
                    
                    items.forEach(function(item) {
                        var itemTitle = item.diziName || item.chName;
                        var itemType = item.diziType || (item.chType ? 'live' : null);
                        
                        if (!itemTitle) return;
                        
                        // Filtreleme
                        if (itemTitle.toLowerCase().includes(queryLower)) {
                            var resultType = itemType === 'film' ? 'movie' : 
                                            (itemType === 'dizi' ? 'tv' : 
                                             (itemType === 'live' ? 'tv' : 'movie'));
                            
                            // Duplicate kontrolü
                            var duplicate = results.some(function(r) { 
                                return r.title === itemTitle; 
                            });
                            
                            if (!duplicate) {
                                results.push({
                                    title: itemTitle,
                                    url: item.diziUrl || cat.url, // Detay için URL
                                    posterUrl: item.diziImg || item.chImg,
                                    type: resultType,
                                    rawData: item // Tam veriyi sakla
                                });
                            }
                        }
                    });
                } catch (e) {
                    console.log('[InatBox] Search parse error:', e.message);
                }
            });
    });
    
    return Promise.all(searchPromises).then(function() {
        console.log('[InatBox] Search results:', results.length);
        return results;
    });
}

function findBestMatch(results, query) {
    if (!results || results.length === 0) return null;

    var queryLower = query.toLowerCase();

    // Tam eşleşme
    for (var i = 0; i < results.length; i++) {
        if (results[i].title.toLowerCase() === queryLower) return results[i];
    }

    // İçeriyor
    for (var j = 0; j < results.length; j++) {
        if (results[j].title.toLowerCase().includes(queryLower)) return results[j];
    }

    return results[0];
}

function searchAndFetch(title, mediaType, seasonNum, episodeNum) {
    return searchInatBox(title, mediaType)
        .then(function(results) {
            var best = findBestMatch(results, title);
            if (!best) {
                console.log('[InatBox] No match found for:', title);
                return [];
            }
            
            console.log('[InatBox] Best match:', best.title, best.url);
            
            // Canlı yayınlar için farklı işlem
            if (best.type === 'live' || best.rawData.chType) {
                return processChContent(parseChContent(best.rawData), best.title, null);
            }
            
            return fetchDetailAndStreams(best.url, mediaType, seasonNum, episodeNum);
        });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var tmdbType = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + tmdbType + '/' + tmdbId +
            '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('[InatBox] Starting for tmdbId:', tmdbId, 'type:', mediaType);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.name || '';
                var year = (data.release_date || data.first_air_date || '').substring(0, 4);
                
                console.log('[InatBox] TMDB title:', title, 'year:', year);

                if (!title) {
                    resolve([]);
                    return;
                }

                var originalTitle = data.original_title || data.original_name || '';

                return searchAndFetch(title, mediaType, seasonNum, episodeNum)
                    .then(function(streams) {
                        if ((!streams || streams.length === 0) && originalTitle && originalTitle !== title) {
                            console.log('[InatBox] Trying original title:', originalTitle);
                            return searchAndFetch(originalTitle, mediaType, seasonNum, episodeNum);
                        }
                        return streams;
                    });
            })
            .then(function(streams) {
                resolve(streams || []);
            })
            .catch(function(err) {
                console.error('[InatBox] Error:', err.message);
                resolve([]);
            });
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}