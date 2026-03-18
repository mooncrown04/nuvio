/**
 * MoOnCrOwN - DiziPal Scraper v71
 * Bu dosya kesinlikle Array [] döndürecek şekilde mühürlenmiştir.
 */

var cheerio = require("cheerio-without-node-native");

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    // EN DIŞ KATMAN KORUMASI: Uygulama asla hata objesi görmemeli.
    try {
        return await executeScraper(tmdbId, mediaType, seasonNum, episodeNum);
    } catch (criticalError) {
        // Hata ne olursa olsun sistem sadece boş bir dizi [] görecek.
        // Bu sayede BEGIN_ARRAY hatası tetiklenmeyecek.
        console.error("[DiziPal Critical]: " + criticalError.message);
        return []; 
    }
}

async function executeScraper(tmdbId, mediaType, seasonNum, episodeNum) {
    var finalResults = [];
    var BASE_URL = 'https://dizipal1227.com';
    
    // 1. TMDB Bilgisi Çekme
    var isMovie = mediaType === 'movie' || mediaType === 'film';
    var tmdbUrl = "https://api.themoviedb.org/3/" + (isMovie ? "movie" : "tv") + "/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR";
    
    var tmdbRes = await fetch(tmdbUrl).catch(() => null);
    if (!tmdbRes) return [];
    
    var tmdbData = await tmdbRes.json().catch(() => ({}));
    if (!tmdbData.title && !tmdbData.name) return [];

    // 2. Slug & URL Oluşturma
    var title = tmdbData.title || tmdbData.name;
    var slug = title.toLowerCase()
        .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').trim();

    var targetUrl = isMovie 
        ? BASE_URL + "/film/" + slug 
        : BASE_URL + "/dizi/" + slug + "/sezon-" + seasonNum + "/bolum-" + episodeNum;

    // 3. Sayfa İçeriğini Çekme (Timeout ve Header Desteği)
    var response = await fetch(targetUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } 
    }).catch(() => null);
    
    if (!response || !response.ok) return [];

    var html = await response.text().catch(() => "");
    if (!html) return [];

    // 4. Regex ile Şifreli Veriyi Yakalama
    var match = html.match(/\{&quot;ciphertext&quot;:.*?&quot;\}/) || html.match(/\{"ciphertext":.*?"\}/);
    
    if (match) {
        try {
            var rawJson = match[0].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            var data = JSON.parse(rawJson);
            
            // Decrypt işlemi (Bu fonksiyonu aşağıda tanımladık)
            var streamUrl = decryptProcess(data);
            
            if (streamUrl && streamUrl.startsWith('http')) {
                finalResults.push({
                    name: "MoOnCrOwN DiziPal",
                    url: streamUrl,
                    quality: 'Auto',
                    provider: 'dizipal'
                });
            }
        } catch (e) {}
    }

    return finalResults;
}

function decryptProcess(data) {
    if (!data.ciphertext || !data.iv || !data.salt) return null;
    var PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";
    
    try {
        var b64 = data.ciphertext.replace(/\\/g, '').replace(/\s/g, '');
        var bin = (typeof atob !== 'undefined') ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
        var ct = Array.from(bin).map(c => c.charCodeAt(0));
        
        var iv = []; for (var i = 0; i < data.iv.length; i += 2) iv.push(parseInt(data.iv.substr(i, 2), 16));
        var salt = []; for (var j = 0; j < data.salt.length; j += 2) salt.push(parseInt(data.salt.substr(j, 2), 16));

        var key = salt.slice(0, 32).map((b, i) => b ^ PASSPHRASE.charCodeAt(i % PASSPHRASE.length));
        var res = ct.map((b, i) => b ^ key[i % key.length] ^ iv[i % iv.length]);
        var decoded = res.map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '').join('');

        var linkMatch = decoded.match(/https?:\/\/[^\s"']+/);
        return linkMatch ? linkMatch[0].replace(/\\\//g, '/') : null;
    } catch (err) { return null; }
}

// Global Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    globalThis.getStreams = getStreams;
}
