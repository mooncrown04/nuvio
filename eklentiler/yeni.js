/**
 * InatBox All-in-One Scraper - v2.0
 * Bütünleşmiş: AES Decrypt + VK + Yandex + Debug Logs
 */

var CryptoJS = require("crypto-js");

// --- AYARLAR ---
var AES_KEY = "C3V4HUpUbGDOjxEl"; 
var BASE_URL = "https://dizibox.rest";

// --- 1. DEŞİFRE MOTORU (LOG DESTEKLİ) ---
function inatDecrypt(encryptedText) {
    try {
        if (!encryptedText) throw new Error("Gelen veri boş!");
        
        var key = CryptoJS.enc.Utf8.parse(AES_KEY);
        var iv = key; 

        // Adım 1
        var parts = encryptedText.split(":");
        var step1 = CryptoJS.AES.decrypt(parts[0], key, {
            iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
        }).toString(CryptoJS.enc.Utf8);

        if (!step1) throw new Error("1. Aşama deşifre başarısız (Key yanlış olabilir)");

        // Adım 2
        var secondPart = step1.split(":")[0];
        var final = CryptoJS.AES.decrypt(secondPart, key, {
            iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
        }).toString(CryptoJS.enc.Utf8);

        return JSON.parse(final);
    } catch (e) {
        console.error("[Inat-Decrypt] Hata:", e.message);
        return null;
    }
}

// --- 2. EVRENSEL AYIKLAYICI (VK & YANDEX) ---
function extractStream(item) {
    return new Promise(function(resolve) {
        var url = item.chUrl;
        var name = item.chName || "Yayın";

        if (url.includes("disk.yandex")) {
            console.log("[Inat-Extractor] Yandex algılandı:", url);
            fetch(url, { headers: { 'Referer': 'https://disk.yandex.com.tr/' } })
                .then(function(res) { return res.text(); })
                .then(function(html) {
                    var m = html.match(/https?:\/\/[^\s"]*?master-playlist\.m3u8/);
                    resolve(m ? { name: "⌜ Yandex ⌟ " + name, url: m[0], isM3U8: true } : null);
                }).catch(function() { resolve(null); });
        } 
        else if (url.includes("vk.com")) {
            console.log("[Inat-Extractor] VK algılandı:", url);
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
        else {
            resolve({ name: "⌜ Inat ⌟ " + name, url: url, isM3U8: url.includes(".m3u8") });
        }
    });
}

// --- 3. ANA FONKSİYON (EXPORT EDİLEN) ---
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        console.log("[Inat] İşlem Başladı. Tip:", mediaType, "ID:", tmdbId);
        
        // Örnek olarak canlı tv ulusal kategorisine gider
        var targetUrl = BASE_URL + "/tv/ulusal.php";

        fetch(targetUrl, {
            method: 'POST',
            headers: { 
                'User-Agent': 'speedrestapi', 
                'X-Requested-With': 'com.bp.box',
                'Content-Type': 'application/x-www-form-urlencoded' 
            },
            body: "1=" + AES_KEY + "&0=" + AES_KEY
        })
        .then(function(res) { return res.text(); })
        .then(function(encryptedData) {
            var items = inatDecrypt(encryptedData);
            if (!items) {
                console.error("[Inat] Veri çözülemedi!");
                return resolve([]);
            }

            console.log("[Inat] Veri çözüldü, öğe sayısı:", items.length);

            var promises = items
                .filter(function(i) { return i.chName !== "@inattvapk" && i.chUrl; })
                .map(function(item) { return extractStream(item); });

            Promise.all(promises).then(function(results) {
                var streams = results.filter(Boolean).map(function(s) {
                    return {
                        name: s.name,
                        url: s.url,
                        quality: "Auto",
                        headers: s.headers || { 'User-Agent': 'speedrestapi' }
                    };
                });
                console.log("[Inat] Toplam Stream Bulundu:", streams.length);
                resolve(streams);
            });
        })
        .catch(function(err) {
            console.error("[Inat] Kritik Hata:", err.message);
            resolve([]);
        });
    });
}

// --- 4. EXPORT (LOGLARDAKİ HATANIN ÇÖZÜMÜ) ---
// Bu kısım sistemin fonksiyonu tanıması için şarttır!
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
} else {
    global.getStreams = getStreams;
}
