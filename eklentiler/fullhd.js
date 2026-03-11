/**
 * Nuvio Local Scraper - DiziBox (CloudStream Logic Integrated)
 * v6.0 - Kotlin referanslı King & Moly Player Desteği
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = 'https://www.dizibox.live';

// Kotlin kodundaki "Güvenilir Kullanıcı" çerezleri ve Header yapısı
const SECURE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Cookie': 'LockUser=true; isTrustedUser=true; dbxu=1743289650198', // Kotlin'den gelen kritik çerez
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.title;
                var year = (data.release_date || data.first_air_date || "").split('-')[0];
                
                // Arama sayfası
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query), { headers: SECURE_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var targetPath = $('article a').first().attr('href');
                if (!targetPath) throw new Error("Dizi bulunamadı");

                var finalUrl = targetPath;
                if (mediaType !== 'movie') {
                    finalUrl = targetPath.replace(/\/$/, "") + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-izle/';
                }

                return fetch(finalUrl, { headers: SECURE_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(episodeHtml) {
                var $ = cheerio.load(episodeHtml);
                var sources = [];

                // 1. Ana Iframe (King Player)
                var mainIframe = $('#video-area iframe').attr('src');
                if (mainIframe) sources.push(mainIframe);

                // 2. Alternatif Kaynaklar (Toolbar options)
                $('.video-toolbar option').each(function() {
                    var val = $(this).attr('value');
                    if (val && val.includes('http')) sources.push(val);
                });

                if (sources.length === 0) throw new Error("Kaynak yok");

                // İlk kaynağı işle (Kotlin'deki King Player mantığıyla)
                var playerUrl = sources[0];
                if (playerUrl.includes('king.php')) {
                    playerUrl = playerUrl.replace('king.php?v=', 'king.php?wmode=opaque&v=');
                }

                return fetch(playerUrl, { headers: SECURE_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                // Kotlin'deki iç içe iframe mantığı: Player içindeki Player
                var innerIframeMatch = playerHtml.match(/<iframe.*?src="(.*?)"/i);
                if (innerIframeMatch) {
                    var innerUrl = innerIframeMatch[1].startsWith('http') ? innerIframeMatch[1] : 'https:' + innerIframeMatch[1];
                    return fetch(innerUrl, { headers: { 'Referer': BASE_URL } });
                }
                return playerHtml; // Eğer iç iframe yoksa mevcut HTML ile devam et
            })
            .then(function(finalContent) {
                // Final adım: AES şifresini çöz (Kotlin'deki CryptoJS.decrypt mantığı)
                var streams = [];
                var data = typeof finalContent === 'string' ? finalContent.match(/decrypt\("(.*?)",\s*"(.*?)"\)/) : null;

                if (data) {
                    try {
                        var CryptoJS = require("crypto-js");
                        var dec = CryptoJS.AES.decrypt(data[1], data[2]).toString(CryptoJS.enc.Utf8);
                        var file = dec.match(/file["']?\s*:\s*["'](.*?)["']/);
                        if (file) {
                            streams.push({
                                name: "DiziBox (King-Player)",
                                title: "HD Kalite",
                                url: file[1],
                                quality: "1080p",
                                headers: { 'Referer': BASE_URL + '/' },
                                provider: "dizibox_local"
                            });
                        }
                    } catch(e) {}
                }
                resolve(streams);
            })
            .catch(function(err) {
                console.error("Dizibox Hata:", err.message);
                resolve([]);
            });
    });
}
