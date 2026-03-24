/**
 * InatBox Universal Scraper - v1.0
 * Özellikler: AES Decryption, VK Extractor, Yandex Disk Extractor
 */

var CryptoJS = require("crypto-js");

// --- KONFİGÜRASYON ---
var AES_KEY = "C3V4HUpUbGDOjxEl"; // Python kodundaki en güncel key
var BASE_URL = "https://dizibox.rest";
var PROXY_URL = "https://goproxy.watchbuddy.tv/proxy/video";

// --- 1. YARDIMCI FONKSİYONLAR (DECRYPTION) ---
function inatDecrypt(encryptedText) {
    try {
        var key = CryptoJS.enc.Utf8.parse(AES_KEY);
        var iv = key; 
        var firstPart = encryptedText.split(":")[0];
        var decrypted1 = CryptoJS.AES.decrypt(firstPart, key, {
            iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
        }).toString(CryptoJS.enc.Utf8);

        var secondPart = decrypted1.split(":")[0];
        var finalDecrypted = CryptoJS.AES.decrypt(secondPart, key, {
            iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
        }).toString(CryptoJS.enc.Utf8);

        return JSON.parse(finalDecrypted);
    } catch (e) {
        return null;
    }
}

function fetchInat(url) {
    return new Promise(function(resolve) {
        var host = url.split("/")[2];
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'User-Agent': 'speedrestapi',
                'Host': host,
                'Referer': 'https://speedrestapi.com/',
                'X-Requested-With': 'com.bp.box'
            },
            body: "1=" + AES_KEY + "&0=" + AES_KEY
        })
        .then(function(res) { return res.text(); })
        .then(function(text) { resolve(inatDecrypt(text)); })
        .catch(function() { resolve(null); });
    });
}

// --- 2. EXTRACTORS (AYIKLAYICILAR) ---

function universalExtractor(item) {
    return new Promise(function(resolve) {
        var url = item.chUrl;
        var name = item.chName || "Yayın";

        // Yandex Disk Kontrolü
        if (url.includes("disk.yandex")) {
            fetch(url, { headers: { 'Referer': 'https://disk.yandex.com.tr/' } })
                .then(function(res) { return res.text(); })
                .then(function(html) {
                    var match = html.match(/https?:\/\/[^\s"]*?master-playlist\.m3u8/);
                    resolve(match ? { name: "⌜ Yandex ⌟ " + name, url: match[0], isM3U8: true } : null);
                }).catch(function() { resolve(null); });
        } 
        // VK Kontrolü
        else if (url.includes("vk.com")) {
            fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest', 'Referer': 'https://vk.com/' } })
                .then(function(res) { return res.text(); })
                .then(function(html) {
                    var match = html.match(/"([^"]*m3u8[^"]*)"/);
                    if (match) {
                        var m3u8 = match[1].replace(/\\/g, "");
                        resolve({ name: "⌜ VK ⌟ " + name, url: m3u8, isM3U8: true, headers: { 'Referer': 'https://vk.com/' } });
                    } else resolve(null);
                }).catch(function() { resolve(null); });
        }
        // Direkt M3U8 veya Diğerleri
        else {
            resolve({
                name: "⌜ Inat ⌟ " + name,
                url: url,
                isM3U8: url.includes(".m3u8")
            });
        }
    });
}

// --- 3. ANA GETSTREAMS FONKSİYONU ---

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        // Örnek: Ulusal kanalları çekelim (İhtiyaca göre kategori URL'si değişebilir)
        var targetUrl = BASE_URL + "/tv/ulusal.php";

        fetchInat(targetUrl).then(function(items) {
            if (!items || !Array.isArray(items)) return resolve([]);

            // Reklamı ve boş linkleri filtrele
            var validItems = items.filter(function(i) { 
                return i.chName !== "@inattvapk" && i.chUrl && i.chUrl !== "null"; 
            });

            // Tüm linkleri extractor'dan geçir (Paralel işlem)
            var promises = validItems.map(function(item) {
                return universalExtractor(item);
            });

            Promise.all(promises).then(function(results) {
                var finalStreams = results.filter(Boolean).map(function(s) {
                    return {
                        name: s.name,
                        url: s.url,
                        quality: "Auto",
                        headers: s.headers || { 'User-Agent': 'speedrestapi' }
                    };
                });
                resolve(finalStreams);
            });
        })
        .catch(function() { resolve([]); });
    });
}

// Nuvio Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
