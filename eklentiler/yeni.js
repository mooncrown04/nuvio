/**
 * Nuvio Local Scraper - VidSrc Pro (Full Decryption)
 * Buffer bağımlılığı kaldırılmış ve Nuvio uyumlu hale getirilmiş sürüm.
 */

var cheerio = require("cheerio-without-node-native");

// --- ŞİFRE ÇÖZÜCÜ YARDIMCILAR (Utils.js Nuvio Port) ---

function universalAtob(str) {
    try { return atob(str); } catch (e) {
        return String.fromCharCode.apply(null, new Uint8Array(str.split('').map(c => c.charCodeAt(0))));
    }
}

function decodeBase64UrlSafe(s) {
    var standardizedInput = s.replace(/_/g, '/').replace(/-/g, '+');
    var binary = universalAtob(standardizedInput);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

function adecode(bytes) {
    var keyBytes = new TextEncoder().encode('WXrUARXb1aDLaZjI');
    var j = 0;
    var s = new Uint8Array(256);
    for (var i = 0; i < 256; i++) s[i] = i;

    for (var i = 0; i < 256; i++) {
        j = (j + s[i] + keyBytes[i % keyBytes.length]) & 0xff;
        var temp = s[i]; s[i] = s[j]; s[j] = temp;
    }

    var decoded = new Uint8Array(bytes.length);
    var i = 0; var k = 0;
    for (var index = 0; index < bytes.length; index++) {
        i = (i + 1) & 0xff;
        k = (k + s[i]) & 0xff;
        var temp = s[i]; s[i] = s[k]; s[k] = temp;
        var t = (s[i] + s[k]) & 0xff;
        decoded[index] = bytes[index] ^ s[t];
    }
    return new TextDecoder().decode(decoded);
}

// --- ANA FONKSİYON ---

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var streams = [];
        var type = mediaType === 'movie' ? 'movie' : 'tv';
        var baseUrl = "https://vidsrc.to";
        var embedUrl = baseUrl + "/embed/" + type + "/" + tmdbId;
        if (type === 'tv') embedUrl += "/" + seasonNum + "/" + episodeNum;

        console.log('[VidSrc-Final] İşlem Başladı:', embedUrl);

        fetch(embedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var dataId = $('a[data-id]').first().attr('data-id');
                
                if (!dataId) throw new Error('Data-ID bulunamadı');
                console.log('[VidSrc-Final] Data-ID:', dataId);

                // AJAX: Kaynakları al
                return fetch(baseUrl + "/ajax/embed/episode/" + dataId + "/sources", {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
            })
            .then(function(res) { return res.json(); })
            .then(function(json) {
                if (!json.result || json.result.length === 0) throw new Error('Kaynak listesi boş');
                
                // Vidplay kaynağını bul
                var vidplay = json.result.find(function(s) { return s.title === 'Vidplay'; }) || json.result[0];
                console.log('[VidSrc-Final] Seçilen Kaynak:', vidplay.title);

                // AJAX: Şifreli URL'yi al
                return fetch(baseUrl + "/ajax/embed/source/" + vidplay.id, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                });
            })
            .then(function(res) { return res.json(); })
            .then(function(details) {
                var encrypted = details.result.url;
                console.log('[VidSrc-Final] Şifreli Veri Alındı.');

                // Şifre Çözme İşlemi
                var encodedBytes = decodeBase64UrlSafe(encrypted);
                var decryptedUrl = adecode(encodedBytes);
                
                // HTML Entities decode (basit yöntem)
                decryptedUrl = decryptedUrl.replace(/&amp;/g, '&');

                if (decryptedUrl.indexOf('http') !== -1) {
                    console.log('[VidSrc-Final] Çözüldü:', decryptedUrl);
                    streams.push({
                        name: '⌜ VidSrc ⌟ | Ultra',
                        url: decryptedUrl,
                        quality: 'Auto',
                        headers: { 'Referer': 'https://vidsrc.to/' },
                        provider: 'vidsrc_decrypted'
                    });
                }
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[VidSrc-Final] KRİTİK HATA:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
