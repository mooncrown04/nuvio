/**
 * SineWix_Universal_ID_v13
 * - Hem Sayısal ID (319994) hem IMDb ID (tt...) destekler.
 * - Stremio noktalı format (.1:1) hatası giderildi.
 * - Rec TV stili dil ve sunucu bilgisi eklendi.
 */

var API_BASE = 'https://ydfvfdizipanel.ru/public/api';
var API_KEY = '9iQNC5HQwPlaFuJDkhncJ5XTJ8feGXOJatAA';

var API_HEADERS = {
    'hash256': '711bff4afeb47f07ab08a0b07e85d3835e739295e8a6361db77eebd93d96306b',
    'signature': '3082058830820370a00302010202145bbfbba9791db758ad12295636e094ab4b07dc24300d06092a864886f70d01010b05003074310b3009060355040613025553311330110603550408130a43616c69666f726e6961311630140603550407130d4d6f756e7461696e205669657731143012060355040a130b476f6f676c6520496e632e3110300e060355040b1307416e64726f69643110300e06035504031307416e64726f69643020170d3231313231353232303433335a180f32303531313231353232303433335a3074310b3009060355040613025553311330110603550408130a43616c69666f726e6961311630140603550407130d4d6f756e7461696e205669657731143012060355040a130b476f6f676c6520496e632e3110300e060355040b1307416e64726f69643110300e06035504031307416e64726f696430820222300d06092a864886f70d01010105000382020f003082020a0282020100a5106a24bb3f9c0aaf3a2b228f794b5eaf1757ba758b19736a39d1bdc73fc983a7237b8d5ca5156cfa999c1dab3418bbc2be0920e0ee001c8aa4812d1dae75d080f09e91e0abda83ff9a76e8384a4429f4849248069a59505b12ac2c14ba2e4d1a13afcdaf54e508697ff928a9f738e6f4a6fc27409c55329eb149b5ff89c5a2d7c06bf9e62086f955cad17d7be2623ee9d5ec56068eadc23cb0965a13ff97d49fe10ef41afc6eeca36b4ace9582097faff89f590bc831cdb3a69eec5d15b67c3f2cad49e37ed053733e3d2d400c47755b932bdbe15d749fd6ad1dce30ba5e66094dfb6ee6f64cafb807e11b19a990c5d078c6d6701cda0bdeb21e99404ff166074f4c89b04c418f4e7940db5c78647c475bcfb85d4c4e836ee7d7c1d53e9e736b5d96d4b4d8b98209064b729ac6a682d55a6a930e518d849898bb28329ca0aaa133b5e5270a9d5940cac6af4802a57fd971efda91abb602882dd6aa6ce2b236b57b52ee2481498f0cacbcc2c36c238bc84becad7eaaf1125b9a1ca9ded6c79f3f283a52050377809b2a9995d66e1636b0ed426fdd8685c47cb18e82077f4aefcc07887e1dc58b4d64be1632f0e7b4625da6f40c65a8512a6454a4b96963e7f876136e6c0069a519a79ad632078ed965aa12482458060c030ed50db706d854f88cb004630b49285d8af8b471ff8f6070687826412287b50049bcb7d1b6b62ef90203010001a310300e300c0603551d13040530030101ff300d06092a864886f70d01010b0500038202010051c0b7bd793181dc29ca777d3773f928a366c8469ecf2fa3cfb076e8831970d19bb2b96e44e8ccc647cf0696bb824ac61c23d958525d283cab26037b04d58aa79bf92192db843adf5c26a980f081d2f0e14f759fc5ff4c5bb3dce0860299bfe7b349a8155a2efaf731ba25ce796a80c1442c7bf80f8c1a7912ff0b6f6592264315337251a846460194fa594f81f38f9e5233a63201e931ad9cab5bf119f24025613f307194eaa6eb39a83f3c05a49ba34455b1aff7c6839bbb657d9392ffdf397432af6e56ba9534a8b07d7060fe09691c6cf07cb5324f67b3cc0871a8c621d81fe71d71085c55206a4f57e25f774fd4b979b299e8bb076b50fca42fa57da2d519fd35a4a7c0137babaed4345f8031b63b6a71f5e8268f709d658ccd7c2a58849379d25bfa598c3f4a2c3d9b7d89285fefeb7f0ec65137d38b08ce432a15688b624a179e6a4a505ebc3bcdfbc4d4330508ee2d8d0f016924dcec21a6838ef7d834c6f43bde4a5201ed0b3bb4e9bd377b470e36bcf5bc3d56169dbd8e39567aa7dce4d1a8a8a54a5e1aa6fb1a8aab0062669a966f96e15ccce6fe12ea5e6a8b8c8823bdc94988ca39759fd1cc8fd8ae5c3d74db50b174cf7d77655016c075c91d439ed01cc0a9f695c99fad3b5495fb6cb1e01a5fa020cc6022a85c07ec55f9eba89719f86e49d34ab5bd208c5f70cced2b7b7963c014f8404432979b506de29e',
    'User-Agent': 'EasyPlex (Android 14; SM-A546B; Samsung Galaxy A54 5G; tr)',
    'Accept': 'application/json'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://ydfvfdizipanel.ru/'
};

function resolveMediaFireLink(link) {
    return fetch(link).then(res => res.text()).then(html => {
        var match = html.match(/href="(https:\/\/download\d+\.mediafire\.com[^"]+)"/);
        return match ? match[1] : link;
    }).catch(() => link);
}

function buildStreams(videoList, swTitle, swYear) {
    return Promise.all(videoList.map(function(v) {
        var isDub = (v.lang === 'tr' || (v.server && v.server.toLowerCase().includes('dublaj')));
        var language = isDub ? 'TR Dublaj' : 'Altyazılı';
        var serverName = v.server || 'Sunucu';

        var streamObj = {
            name: 'SineWix - ' + language,
            title: swTitle + ' (' + swYear + ')\n🎬 ' + serverName,
            url: v.link,
            quality: 'HD',
            headers: STREAM_HEADERS,
            provider: 'sinewix'
        };

        if (v.link && v.link.includes('mediafire.com')) {
            return resolveMediaFireLink(v.link).then(fUrl => {
                streamObj.url = fUrl;
                return streamObj;
            });
        }
        return Promise.resolve(streamObj);
    })).then(streams => streams.filter(s => s && s.url));
}

function fetchDetailAndStreams(sinewixId, mediaType, seasonNum, episodeNum) {
    var path = (mediaType === 'movie') ? 'media/detail' : 'series/show';
    var apiUrl = API_BASE + '/' + path + '/' + sinewixId + '/' + API_KEY;

    return fetch(apiUrl, { headers: API_HEADERS })
        .then(res => res.json())
        .then(function(item) {
            var swTitle = item.name || item.title || 'SineWix';
            var swYear = (item.first_air_date || item.release_date || '').substring(0, 4);
            var videoList = [];

            if (mediaType === 'movie') {
                videoList = item.videos || [];
            } else {
                var s = (item.seasons || []).find(s => parseInt(s.season_number) === parseInt(seasonNum));
                if (s) {
                    var e = (s.episodes || []).find(e => parseInt(e.episode_number) === parseInt(episodeNum));
                    if (e) videoList = e.videos || [];
                }
            }
            return buildStreams(videoList, swTitle, swYear);
        });
}

function searchAndFetch(title, mediaType, seasonNum, episodeNum) {
    var searchUrl = API_BASE + '/search/' + encodeURIComponent(title) + '/' + API_KEY;
    console.log("PLUGIN_LOG: Aranan İsim -> " + title);

    return fetch(searchUrl, { headers: API_HEADERS })
        .then(res => res.json())
        .then(function(data) {
            var results = data.search || [];
            var sTitleLower = title.toLowerCase().trim();

            var filtered = results.filter(function(item) {
                var itemTitle = (item.name || item.title || '').toLowerCase().trim();
                var t = item.type || '';
                var typeOk = (mediaType === 'movie') ? t.includes('movie') : (t.includes('serie') || t.includes('anime'));
                return typeOk && (itemTitle.includes(sTitleLower) || sTitleLower.includes(itemTitle));
            });

            if (filtered.length === 0) return [];

            filtered.sort((a, b) => {
                var aT = (a.name || a.title || '').toLowerCase().trim();
                var bT = (b.name || b.title || '').toLowerCase().trim();
                return (aT === sTitleLower) ? -1 : aT.length - bT.length;
            });

            return fetchDetailAndStreams(filtered[0].id, mediaType, seasonNum, episodeNum);
        });
}

function getStreams(id, mediaType, seasonNum, episodeNum) {
    console.log("PLUGIN_LOG: Gelen Ham ID -> " + id);
    
    return new Promise(function(resolve) {
        var finalId = id;
        var sNum = seasonNum;
        var eNum = episodeNum;

        // 1. Durum: Stremio/IMDb Formatı (tt... veya tt...:1:1 veya tt... .1:1)
        if (typeof id === 'string' && id.startsWith('tt')) {
            var parts = id.split(/[:\.]/);
            finalId = parts[0]; // Sadece tt... kısmını al
            sNum = sNum || parts[1] || 1;
            eNum = eNum || parts[2] || 1;
        }

        // 2. TMDB API Karar Mekanizması
        var isImdb = (typeof finalId === 'string' && finalId.startsWith('tt'));
        var tmdbUrl = isImdb 
            ? 'https://api.themoviedb.org/3/find/' + finalId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&external_source=imdb_id&language=tr-TR'
            : 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + finalId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(res => res.json())
            .then(function(data) {
                var result = isImdb ? ((mediaType === 'movie' ? data.movie_results : data.tv_results) || [])[0] : data;
                var title = result ? (result.title || result.name) : '';
                
                if (!title) {
                    console.error("PLUGIN_LOG: TMDB İsim Bulamadı!");
                    return resolve([]);
                }

                return searchAndFetch(title, mediaType, sNum, eNum);
            })
            .then(streams => resolve(streams || []))
            .catch(err => {
                console.error("PLUGIN_LOG: Hata -> " + err.message);
                resolve([]);
            });
    });
}

module.exports = { getStreams };
