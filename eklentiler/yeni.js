var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.diziyou.one'; 
var STORAGE_URL = 'https://storage.diziyou.one';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Connection': 'keep-alive'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // DiziYou sadece dizi (tv) destekler
        if (mediaType !== 'tv') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl, { headers: { 'User-Agent': HEADERS['User-Agent'] } })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || '';
                var orgName = data.original_name || '';
                if (!query) throw new Error('İsim bulunamadı');
                
                console.error('[DiziYou Search] Aranan:', query);

                // 2. Arama Yap
                var searchUrl = BASE_URL + '/?s=' + encodeURIComponent(query);
                return fetch(searchUrl, { headers: HEADERS }).then(function(res) { 
                    return res.text().then(function(html) {
                        return { html: html, query: query, orgName: orgName };
                    });
                });
            })
            .then(function(obj) {
                var $ = cheerio.load(obj.html);
                var searchTitleLower = obj.query.toLowerCase().trim();
                var orgTitleLower = obj.orgName.toLowerCase().trim();
                var foundLink = null;

                // Arama sonuçlarında dön ve tam eşleşme ara
                $('.list-series a, .post-title a, #categorytitle a').each(function() {
                    var currentTitle = $(this).text().toLowerCase().trim();
                    var currentHref = $(this).attr('href');

                    // "From" gibi kısa isimler için tam eşleşme veya "From Dizi" kontrolü
                    if (searchTitleLower === "from") {
                        if (currentTitle === "from" || currentTitle === "from dizi") {
                            foundLink = currentHref;
                            return false; 
                        }
                    } else {
                        // Diğer diziler için içeriyor mu kontrolü
                        if (currentTitle.includes(searchTitleLower) || currentTitle.includes(orgTitleLower)) {
                            foundLink = currentHref;
                            return false;
                        }
                    }
                });

                if (!foundLink) throw new Error('Kesin eşleşme bulunamadı');

                // 3. Bölüm URL Oluşturma
                var slug = foundLink.split('/').filter(Boolean).pop();
                var epUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum/';
                
                console.error('[DiziYou Match] Hedef:', epUrl);
                return fetch(epUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(epHtml) {
                var $ = cheerio.load(epHtml);
                var playerSrc = $('#diziyouPlayer').attr('src');
                
                if (!playerSrc) throw new Error('Video kaynağı bulunamadı');

                var itemId = playerSrc.split('/').pop().replace('.html', '').split('?')[0];
                var streams = [];
                
                var hasSub = epHtml.indexOf('turkceAltyazili') !== -1;
                var hasDub = epHtml.indexOf('turkceDublaj') !== -1;

                if (hasSub) {
                    streams.push({
                        name: '🌐 Türkçe Altyazılı',
                        url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8'
                    });
                }
                if (hasDub) {
                    streams.push({
                        name: '🇹🇷 Türkçe Dublaj',
                        url: STORAGE_URL + '/episodes/' + itemId + '_tr/play.m3u8'
                    });
                }

                // Hiçbir şey bulunamazsa varsayılan
                if (streams.length === 0) {
                    streams.push({
                        name: '🌐 Orijinal / Video',
                        url: STORAGE_URL + '/episodes/' + itemId + '/play.m3u8'
                    });
                }

                resolve(streams.map(function(s) {
                    return {
                        name: s.name,
                        title: s.name, // Bazı oynatıcılar title bekler
                        url: s.url,
                        quality: '1080p',
                        headers: { 'Referer': BASE_URL + '/' },
                        subtitles: [{
                            label: 'Turkish',
                            url: STORAGE_URL + '/subtitles/' + itemId + '/tr.vtt'
                        }]
                    };
                }));
            })
            .catch(function(err) {
                console.error('[DiziYou Hata]:', err.message);
                resolve([]);
            });
    });
}

module.exports = { getStreams: getStreams };
