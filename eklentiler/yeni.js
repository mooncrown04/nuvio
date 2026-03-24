/**
 * InatBox Universal Scraper - v1.1
 * Gelişmiş Log ve Hata Takip Sistemi eklendi.
 */

var CryptoJS = require("crypto-js");

var AES_KEY = "C3V4HUpUbGDOjxEl"; 
var BASE_URL = "https://dizibox.rest";

// --- 1. DEŞİFRE VE HATA TAKİBİ ---
function inatDecrypt(encryptedText) {
    try {
        if (!encryptedText || typeof encryptedText !== 'string') {
            console.error("[Inat-Decrypt] Gelen veri boş veya string değil!");
            return null;
        }

        var key = CryptoJS.enc.Utf8.parse(AES_KEY);
        var iv = key; 

        // 1. ADIM DEŞİFRE
        var parts = encryptedText.split(":");
        var decrypted1 = CryptoJS.AES.decrypt(parts[0], key, {
            iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
        }).toString(CryptoJS.enc.Utf8);

        if (!decrypted1) {
            console.error("[Inat-Decrypt] 1. Aşama başarısız! Key veya IV hatalı olabilir.");
            return null;
        }

        // 2. ADIM DEŞİFRE
        var secondPart = decrypted1.split(":")[0];
        var finalDecrypted = CryptoJS.AES.decrypt(secondPart, key, {
            iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7
        }).toString(CryptoJS.enc.Utf8);

        if (!finalDecrypted) {
            console.error("[Inat-Decrypt] 2. Aşama başarısız! Veri bozuk.");
            return null;
        }

        return JSON.parse(finalDecrypted);
    } catch (e) {
        console.error("[Inat-Decrypt] KRİTİK HATA:", e.message);
        return null;
    }
}

// --- 2. EXTRACTOR HATA TAKİBİ ---
function universalExtractor(item) {
    return new Promise(function(resolve) {
        var url = item.chUrl;
        var name = item.chName || "Bilinmeyen Kanal";

        console.log("[Extractor] İşleniyor:", name, "->", url);

        if (url.includes("disk.yandex")) {
            fetch(url, { headers: { 'Referer': 'https://disk.yandex.com.tr/' } })
                .then(function(res) { return res.text(); })
                .then(function(html) {
                    var match = html.match(/https?:\/\/[^\s"]*?master-playlist\.m3u8/);
                    if (match) {
                        resolve({ name: "⌜ Yandex ⌟ " + name, url: match[0], isM3U8: true });
                    } else {
                        console.error("[Extractor-Yandex] Sayfada m3u8 bulunamadı:", url);
                        resolve(null);
                    }
                }).catch(function(err) {
                    console.error("[Extractor-Yandex] Fetch Hatası:", err.message);
                    resolve(null);
                });
        } 
        else if (url.includes("vk.com")) {
            fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest', 'Referer': 'https://vk.com/' } })
                .then(function(res) { return res.text(); })
                .then(function(html) {
                    var match = html.match(/"([^"]*m3u8[^"]*)"/);
                    if (match) {
                        var m3u8 = match[1].replace(/\\/g, "");
                        resolve({ name: "⌜ VK ⌟ " + name, url: m3u8, isM3U8: true });
                    } else {
                        console.error("[Extractor-VK] Video linki yakalanamadı:", url);
                        resolve(null);
                    }
                }).catch(function(err) {
                    console.error("[Extractor-VK] Fetch Hatası:", err.message);
                    resolve(null);
                });
        }
        else {
            // Hiçbirine girmiyorsa düz linktir
            resolve({ name: "⌜ Inat ⌟ " + name, url: url, isM3U8: url.includes(".m3u8") });
        }
    });
}

// --- 3. ANA DÖNGÜ VE LOGLAMA ---
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var targetUrl = BASE_URL + "/tv/ulusal.php";
        console.log("[Inat] İstek atılıyor:", targetUrl);

        fetch(targetUrl, {
            method: 'POST',
            headers: { 'User-Agent': 'speedrestapi', 'X-Requested-With': 'com.bp.box' },
            body: "1=" + AES_KEY + "&0=" + AES_KEY
        })
        .then(function(res) { 
            console.log("[Inat] HTTP Durumu:", res.status);
            return res.text(); 
        })
        .then(function(text) {
            var items = inatDecrypt(text);
            if (!items) {
                console.error("[Inat] JSON deşifre edilemedi veya boş döndü.");
                return resolve([]);
            }

            console.log("[Inat] Toplam öğe sayısı:", items.length);

            var promises = items
                .filter(function(i) { return i.chName !== "@inattvapk" && i.chUrl; })
                .map(function(item) { return universalExtractor(item); });

            Promise.all(promises).then(function(results) {
                var finalStreams = results.filter(Boolean);
                console.log("[Inat] Başarıyla çözülen link sayısı:", finalStreams.length);
                resolve(finalStreams);
            });
        })
        .catch(function(err) {
            console.error("[Inat] Genel Akış Hatası:", err.message);
            resolve([]);
        });
    });
}
