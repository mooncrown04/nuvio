/**
 * InatBox Universal Scraper - v2.1
 * Proxy içermez. Sadece Direct Bağlantı.
 */

var CryptoJS = require("crypto-js");

// NOT: Eğer bağlantı hatası devam ederse bu BASE_URL'yi yeni bir inat adresiyle değiştir.
var BASE_URL = "https://dizibox.rest"; 
var AES_KEY = "C3V4HUpUbGDOjxEl"; 

// --- 1. DEŞİFRE (AES-CBC) ---
function inatDecrypt(encryptedText) {
    try {
        if (!encryptedText || encryptedText.length < 10) return null;
        
        var key = CryptoJS.enc.Utf8.parse(AES_KEY);
        var iv = key; 

        var parts = encryptedText.split(":");
        var step1 = CryptoJS.AES.decrypt(parts[0], key, {
            iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
        }).toString(CryptoJS.enc.Utf8);

        if (!step1) return null;

        var secondPart = step1.split(":")[0];
        var final = CryptoJS.AES.decrypt(secondPart, key, {
            iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
        }).toString(CryptoJS.enc.Utf8);

        return JSON.parse(final);
    } catch (e) {
        console.error("[Inat] Deşifre Hatası:", e.message);
        return null;
    }
}

// --- 2. AYIKLAYICILAR (VK, YANDEX) ---
function runExtractor(item) {
    return new Promise(function(resolve) {
        var url = item.chUrl;
        var name = item.chName || "Yayın";

        // Yandex Disk Ayıklayıcı (Kotlin DiskYandexComTr.kt'den uyarlandı)
        if (url.indexOf("disk.yandex") !== -1) {
            fetch(url, { headers: { 'Referer': 'https://disk.yandex.com.tr/' } })
                .then(function(res) { return res.text(); })
                .then(function(html) {
                    var m = html.match(/https?:\/\/[^\s"]*?master-playlist\.m3u8/);
                    resolve(m ? { name: "⌜ Yandex ⌟ " + name, url: m[0], isM3U8: true } : null);
                }).catch(function() { resolve(null); });
        } 
        // VK Ayıklayıcı (Kotlin Vk.kt'den uyarlandı)
        else if (url.indexOf("vk.com") !== -1) {
            fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest', 'Referer': 'https://vk.com/' } })
                .then(function(res) { return res.text(); })
                .then(function(html) {
                    var m = html.match(/"([^"]*m3u8[^"]*)"/);
                    if (m) {
                        var m3u8 = m[1].replace(/\\/g, "");
                        resolve({ name: "⌜ VK ⌟ " + name, url: m3u8, isM3U8: true, headers: { 'Referer': 'https://vk.com/' } });
                    } else resolve(null);
                }).catch(function() { resolve(null); });
        }
        // Standart Linkler (CDNJWPlayer vb.)
        else {
            resolve({
                name: "⌜ Inat ⌟ " + name,
                url: url,
                isM3U8: url.indexOf(".m3u8") !== -1
            });
        }
    });
}

// --- 3. ANA AKIŞ ---
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        // Loglardaki timeout hatasını engellemek için sadece istek atıyoruz
        // Eğer dizibox.rest kapalıysa burası boş dönecektir.
        var targetUrl = BASE_URL + "/tv/ulusal.php";

        fetch(targetUrl, {
            method: 'POST',
            headers: { 
                'User-Agent': 'speedrestapi', 
                'X-Requested-With': 'com.bp.box'
            },
            body: "1=" + AES_KEY + "&0=" + AES_KEY
        })
        .then(function(res) { return res.text(); })
        .then(function(text) {
            var items = inatDecrypt(text);
            if (!items) return resolve([]);

            var promises = items
                .filter(function(i) { return i.chName !== "@inattvapk" && i.chUrl && i.chUrl !== "null"; })
                .map(function(item) { return runExtractor(item); });

            Promise.all(promises).then(function(results) {
                var streams = results.filter(Boolean).map(function(s) {
                    return {
                        name: s.name,
                        url: s.url,
                        quality: "Auto",
                        headers: s.headers || { 'User-Agent': 'speedrestapi' }
                    };
                });
                resolve(streams);
            });
        })
        .catch(function(err) {
            console.error("[Inat] Bağlantı Hatası (Proxy Kapalı):", err.message);
            resolve([]);
        });
    });
}

// --- 4. NUVIO EXPORT ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
