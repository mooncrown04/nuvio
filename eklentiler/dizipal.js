/**
 * DiziPal v46 - AES Decryption + DPlayer Support
 * CloudStream Kotlin kodundan port edildi
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://dizipal1543.com';
var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

// AES şifre çözme için gerekli
// QuickJS crypto desteği sınırlı - external lib gerekir
// Ama biz basit bir implementasyon veya fallback kullanacağız

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
    'Referer': BASE_URL + '/'
};

// Şifre çözme passphrase (Kotlin kodundan)
var PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

function slugify(str) {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function generateSlugs(title, originalTitle, isMovie, season, episode) {
    var slugs = [];
    var titles = [];
    
    if (title) titles.push(title);
    if (originalTitle && originalTitle !== title) titles.push(originalTitle);
    
    var unique = [];
    for (var i = 0; i < titles.length; i++) {
        if (unique.indexOf(titles[i]) === -1) unique.push(titles[i]);
    }
    
    for (var i = 0; i < unique.length; i++) {
        var s = slugify(unique[i]);
        if (isMovie) {
            slugs.push('/film/' + s);
            slugs.push('/izle/' + s);
        } else {
            slugs.push('/bolum/' + s + '-' + season + 'x' + episode);
            slugs.push('/bolum/' + s + '-' + season + '-sezon-' + episode + '-bolum');
            slugs.push('/dizi/' + s + '/' + season + '-sezon/' + episode + '-bolum');
        }
    }
    return slugs;
}

// Hex decode
function hexToBytes(hex) {
    var bytes = [];
    for (var i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

// Base64 decode
function base64ToBytes(base64) {
    // QuickJS'te atob kullanılabilir
    try {
        var binary = atob(base64);
        var bytes = [];
        for (var i = 0; i < binary.length; i++) {
            bytes.push(binary.charCodeAt(i));
        }
        return bytes;
    } catch (e) {
        return [];
    }
}

// PBKDF2 simülasyonu (QuickJS'te crypto yok, basit bir hash kullanacağız)
// Gerçek PBKDF2-SHA512 yerine basit bir key türetme (production'da güvenli değil!)
function deriveKey(passphrase, salt, iterations, keyLen) {
    // Basit bir key türetme - gerçek implementasyonda crypto lib gerekir
    // Bu sadece proof-of-concept
    var key = [];
    var passBytes = [];
    for (var i = 0; i < passphrase.length; i++) {
        passBytes.push(passphrase.charCodeAt(i));
    }
    
    // Salt ile birleştir
    var combined = passBytes.concat(salt);
    
    // Basit hash (gerçek PBKDF2 değil!)
    for (var i = 0; i < keyLen; i++) {
        var val = 0;
        for (var j = 0; j < combined.length; j++) {
            val = (val + combined[j] + i + j) % 256;
        }
        key.push(val);
    }
    return key;
}

// AES decryption (CBC mode, PKCS5 padding)
// QuickJS'te crypto API yok, bu yüzden bu fonksiyon sadeleştirilmiştir
// Gerçek implementasyonda external crypto modülü gerekir
function decryptAes(ciphertext, key, iv) {
    // NOT: Bu sadeleştirilmiş bir implementasyon
    // Gerçek AES-CBC için crypto-js veya benzeri bir kütüphane gerekir
    // QuickJS ortamında bu çalışmayabilir - sadece yapı gösterimi
    
    try {
        // Eğer crypto modülü varsa kullan
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            // WebCrypto API kullanılabilir
            return null; // Async olduğu için şimdilik null
        }
        
        // Fallback: Şifreli veriyi olduğu gibi döndür (debug için)
        // Gerçek uygulamada burada AES çözülmeli
        return null;
    } catch (e) {
        return null;
    }
}

// Ana şifre çözme fonksiyonu
function decryptDizipalData(rawJsonText) {
    try {
        // Regex ile değerleri çıkar
        var ctMatch = rawJsonText.match(/"ciphertext"\s*:\s*"([^"]+)"/);
        var ivMatch = rawJsonText.match(/"iv"\s*:\s*"([^"]+)"/);
        var saltMatch = rawJsonText.match(/"salt"\s*:\s*"([^"]+)"/);
        
        if (!ctMatch || !ivMatch || !saltMatch) {
            console.error('[DiziPal] Şifreli veri parse edilemedi');
            return '';
        }
        
        var ct = ctMatch[1];
        var iv = ivMatch[1];
        var salt = saltMatch[1];
        
        console.error('[DiziPal] Şifre çözülüyor...');
        
        // Hex decode
        var saltBytes = hexToBytes(salt);
        var ivBytes = hexToBytes(iv);
        var ctBytes = base64ToBytes(ct);
        
        // Key türet (PBKDF2 - gerçek implementasyonda crypto lib gerekir)
        var key = deriveKey(PASSPHRASE, saltBytes, 999, 32);
        
        // AES decrypt (gerçek implementasyonda crypto lib gerekir)
        var decrypted = decryptAes(ctBytes, key, ivBytes);
        
        if (!decrypted) {
            // Fallback: Eğer crypto yoksa, şifreli veriyi logla ve devam et
            console.error('[DiziPal] Crypto API mevcut değil, şifre çözülemedi');
            return '';
        }
        
        // URL temizleme
        var finalUrl = decrypted.replace(/\\\//g, '/');
        
        if (finalUrl.indexOf('://') === 0) {
            finalUrl = 'https' + finalUrl;
        } else if (finalUrl.indexOf('//') === 0) {
            finalUrl = 'https:' + finalUrl;
        } else if (finalUrl.indexOf('http') !== 0) {
            finalUrl = 'https://' + finalUrl;
        }
        
        return finalUrl;
    } catch (e) {
        console.error('[DiziPal] Decryption hatası: ' + e.message);
        return '';
    }
}

// DPlayer'dan stream alma
function extractFromDPlayer(iframeUrl) {
    return new Promise(function(resolve, reject) {
        // Domain çıkar
        var domainMatch = iframeUrl.match(/(https?:\/\/[^/]+)/);
        var domain = domainMatch ? domainMatch[1] : 'https://four.dplayer82.site';
        
        // Playlist ID bul
        fetch(iframeUrl, { headers: HEADERS })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var openPlayerMatch = html.match(/window\.openPlayer\s*\(\s*['"]([^'"]+)['"]/);
                if (!openPlayerMatch) {
                    console.error('[DiziPal] DPlayer ID bulunamadı');
                    resolve([]);
                    return;
                }
                
                var playlistId = openPlayerMatch[1];
                var apiUrl = domain + '/source2.php?v=' + playlistId;
                
                console.error('[DiziPal] DPlayer API: ' + apiUrl);
                
                return fetch(apiUrl, { 
                    headers: Object.assign({}, HEADERS, { 'Referer': iframeUrl })
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(apiResponse) {
                var streams = [];
                
                // "file":"..." regex
                var fileRegex = /"file"\s*:\s*"([^"]+)"/g;
                var match;
                
                while ((match = fileRegex.exec(apiResponse)) !== null) {
                    var fileUrl = match[1].replace(/\\\//g, '/');
                    
                    // m.php -> master.m3u8 dönüşümü
                    if (fileUrl.indexOf('m.php') !== -1) {
                        fileUrl = fileUrl.replace('m.php', 'master.m3u8');
                    }
                    
                    streams.push({
                        name: 'DiziPal DPlayer',
                        url: fileUrl,
                        quality: 'Auto',
                        referer: iframeUrl,
                        provider: 'dizipal',
                        type: 'm3u8'
                    });
                }
                
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[DiziPal] DPlayer hatası: ' + err.message);
                resolve([]);
            });
    });
}

// Ana sayfa parser'ı (loadLinks mantığı)
function extractFromPage(html, url) {
    return new Promise(function(resolve, reject) {
        var $ = cheerio.load(html);
        
        // 1. Şifreli veriyi dene
        var encryptedDiv = $('div[data-rm-k=true]');
        var iframeUrl = '';
        
        if (encryptedDiv.length > 0) {
            var encryptedText = encryptedDiv.text();
            console.error('[DiziPal] Şifreli veri bulundu, uzunluk: ' + encryptedText.length);
            iframeUrl = decryptDizipalData(encryptedText);
        }
        
        // 2. Şifreli yoksa direkt iframe ara
        if (!iframeUrl) {
            var iframe = $('iframe').first();
            if (iframe.length > 0) {
                iframeUrl = iframe.attr('src') || '';
                console.error('[DiziPal] Direkt iframe bulundu: ' + iframeUrl);
            }
        }
        
        if (!iframeUrl) {
            console.error('[DiziPal] İframe bulunamadı');
            resolve([]);
            return;
        }
        
        // Protokol fix
        if (iframeUrl.indexOf('//') === 0) {
            iframeUrl = 'https:' + iframeUrl;
        }
        
        console.error('[DiziPal] İframe URL: ' + iframeUrl);
        
        // DPlayer kontrolü
        if (iframeUrl.indexOf('dplayer') !== -1 || iframeUrl.indexOf('four.dplayer') !== -1) {
            extractFromDPlayer(iframeUrl).then(resolve);
        } else {
            // Genel iframe
            resolve([{
                name: 'DiziPal Embed',
                url: iframeUrl,
                quality: 'Auto',
                referer: url,
                provider: 'dizipal'
            }]);
        }
    });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + 
            (isMovie ? 'movie' : 'tv') + '/' + tmdbId + 
            '?language=tr-TR&api_key=' + TMDB_KEY;

        console.error('[DiziPal] TMDB: ' + tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(tmdbData) {
                var title = tmdbData.title || tmdbData.name;
                var originalTitle = tmdbData.original_title || tmdbData.original_name;
                
                if (!title) throw new Error('Başlık yok');

                console.error('[DiziPal] Başlık: ' + title);

                var slugs = generateSlugs(title, originalTitle, isMovie, seasonNum, episodeNum);
                console.error('[DiziPal] Slug sayısı: ' + slugs.length);

                var index = 0;
                
                function tryNext() {
                    if (index >= slugs.length) {
                        console.error('[DiziPal] Tüm sluklar denendi, bulunamadı');
                        resolve([]);
                        return;
                    }

                    var path = slugs[index];
                    var url = BASE_URL + path;
                    index++;

                    console.error('[DiziPal] Deneniyor: ' + url);

                    fetch(url, { headers: HEADERS })
                        .then(function(res) { return res.text(); })
                        .then(function(html) {
                            // Cloudflare kontrolü
                            if (html.indexOf('cf-browser-verification') !== -1) {
                                console.error('[DiziPal] Cloudflare engeli!');
                                tryNext();
                                return;
                            }

                            // Sayfadan stream çıkar
                            extractFromPage(html, url).then(function(streams) {
                                if (streams.length > 0) {
                                    console.error('[DiziPal] Bulundu: ' + streams.length);
                                    resolve(streams);
                                } else {
                                    tryNext();
                                }
                            });
                        })
                        .catch(function(err) {
                            console.error('[DiziPal] Hata: ' + err.message);
                            tryNext();
                        });
                }

                tryNext();
            })
            .catch(function(err) {
                console.error('[DiziPal] Kritik hata: ' + err.message);
                resolve([]);
            });
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
