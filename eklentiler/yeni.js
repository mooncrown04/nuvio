/**
 * Nuvio Local Scraper - VidSrc & Subtitles
 * Playwright mantığının Nuvio (Client-side) uyarlaması
 */

var cheerio = require("cheerio-without-node-native");

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*'
};

function getStreams(searchResult) {
    return new Promise(function(resolve) {
        var streams = [];
        var tmdbId = searchResult.tmdb_id;
        var type = searchResult.type === 'tv' ? 'tv' : 'movie';
        
        // VidSrc URL yapısı (Playwright kodundaki mantık)
        var baseUrl = "https://vidsrc.xyz/embed/" + type + "/" + tmdbId;
        if (type === 'tv') {
            baseUrl += "/" + searchResult.season + "/" + searchResult.episode;
        }

        // 1. ADIM: Embed sayfasını çek
        fetch(baseUrl, { headers: WORKING_HEADERS })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                
                // Playwright'daki "#the_frame" veya kaynak seçici mantığı
                // Not: Client-side'da m3u8 linkini bulmak için genellikle 
                // sayfadaki scriptlerin içinden regex ile çekmek gerekir.
                var sourceRegex = /file:"(.*?\.m3u8)"/g; 
                var match = sourceRegex.exec(html);
                var hlsUrl = match ? match[1] : null;

                if (hlsUrl) {
                    streams.push({
                        name: "VidSrc (Auto)",
                        title: searchResult.title,
                        url: hlsUrl,
                        quality: "1080p",
                        headers: {
                            'Referer': 'https://vidsrc.xyz/',
                            'User-Agent': WORKING_HEADERS['User-Agent']
                        },
                        subtitles: [], // Altyazılar aşağıda eklenebilir
                        provider: "vidsrc_scraper"
                    });
                }

                // 2. ADIM: OpenSubtitles API Entegrasyonu (Proxy üzerinden)
                // Nuvio'da API anahtarlarını doğrudan kodun içine yazman gerekir
                return resolve(streams);
            })
            .catch(function(err) {
                console.error('VidSrc Error:', err.message);
                resolve([]);
            });
    });
}

// Altyazı SRT -> VTT dönüşümü (Nuvio için basitleştirilmiş)
function srtToVtt(srtText) {
    return "WEBVTT\n\n" + srtText
        .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
