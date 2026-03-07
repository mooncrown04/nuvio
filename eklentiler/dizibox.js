var BASE_URL = 'https://www.dizibox.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

var STREAM_HEADERS = {
    'User-Agent': HEADERS['User-Agent'],
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Accept-Encoding': 'identity',
    'Origin': BASE_URL,
    'Referer': BASE_URL + '/',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1'
};

function findFirst(html, pattern) {
    var regex = new RegExp(pattern, 'i');
    var match = regex.exec(html);
    return match ? match : null;
}

function loadContentPage(url) {
    return fetch(url, { headers: HEADERS })
        .then(res => res.text())
        .then(html => {
            var iframeMatch = findFirst(html,
                '<iframe[^>]+src="([^"]+)"[^>]*class="[^"]*(?:responsive-player|series-player)[^"]*"'
            ) || findFirst(html,
                '<iframe[^>]+src="([^"]+)"'
            );
            return iframeMatch ? iframeMatch[1] : null;
        });
}

function extractM3u8FromIframe(iframeSrc) {
    if (!iframeSrc) return Promise.resolve(null);
    var iframeUrl = iframeSrc.startsWith('http') ? iframeSrc : BASE_URL + iframeSrc;

    return fetch(iframeUrl, { headers: HEADERS })
        .then(res => res.text())
        .then(html => {
            var m3uMatch = findFirst(html, 'file:"([^"]+\\.m3u8[^"]*)"');
            if (m3uMatch) return m3uMatch[1];
            var sourceMatch = findFirst(html, '"file"\\s*:\\s*"([^"]+\\.m3u8[^"]*)"');
            if (sourceMatch) return sourceMatch[1];
            return null;
        });
}

function getEpisodeUrl(slug, seasonNum, episodeNum) {
    return BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-izle/';
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise((resolve) => {
        if (mediaType !== 'tv') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId +
            '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(res => res.json())
            .then(data => {
                var title = data.name || data.original_name || '';
                if (!title) return resolve([]);

                var slug = title.toLowerCase().trim()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                var epUrl = getEpisodeUrl(slug, seasonNum, episodeNum);

                return loadContentPage(epUrl)
                    .then(iframeSrc => extractM3u8FromIframe(iframeSrc))
                    .then(m3u8Url => {
                        if (!m3u8Url) return resolve([]);

                        resolve([{
                            name: '⌜ DiziBox ⌟ | Player',
                            title: 'Bölüm ' + episodeNum,
                            url: m3u8Url,
                            quality: '720p',
                            headers: STREAM_HEADERS,
                            provider: 'dizibox'
                        }]);
                    });
            })
            .catch(err => {
                console.error('[DiziBox] Hata:', err);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
