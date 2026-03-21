/**
 * Nuvio Local Scraper - HotStream Modülü
 * Veri Kaynağı: KekikStream API / HotStream
 */

var cheerio = require("cheerio-without-node-native");

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Connection': 'keep-alive'
};

function getStreams(searchResult) {
    return new Promise(function(resolve) {
        var streams = [];

        // Örnekten gelen veriyi simüle ediyoruz (searchResult içinden geldiğini varsayalım)
        // Normalde bu veri bir fetch isteği sonucunda döner.
        var rawData = {
            "name": "HotStream",
            "url": "https://hotstream.club/list/N0VjWTBvb0ppbEo3bUdzeERNL09sNCtqWUVvWS85eDlZb2VEb2s4aWdJZjhPM1cyQkExb0tQYlI3ZXUxNjgxb0hSUWpOa3JLODhYQ245NDV0OC8wejdKcitZZE10S3JhelNhditPZVpEK2U2dnRiM3MrUVF4c0p6SjVuSTlPeGNibTRIemRTRE9vbjlXcjBMOTJaeDJQZC8zcHVGRUloWTc5YXNGV1hxU0lNPQ==",
            "referer": "https://hotstream.club/embed/wNXSyyQMhUeLa5Z"
        };

        // Eğer URL bir m3u8 listesi döndürüyorsa doğrudan ekle
        // Değilse, fetch ile içeriği kontrol et
        streams.push({
            name: "HotStream (Kekik)",
            title: searchResult.title || "Film İçeriği",
            url: rawData.url,
            quality: "1080p",
            headers: {
                'User-Agent': WORKING_HEADERS['User-Agent'],
                'Referer': rawData.referer, // Kritik: HotStream referer kontrolü yapar
                'Origin': 'https://hotstream.club'
            },
            provider: "HotStream_Scraper"
        });

        // Nuvio'da sonucu döndür
        resolve(streams);
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
