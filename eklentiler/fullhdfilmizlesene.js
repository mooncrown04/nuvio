var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// Kendi atob fonksiyonumuzu yazıyoruz (Cihazda atob yoksa çökmesin diye)
function manualAtob(str) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var output = '';
    str = String(str).replace(/[=]+$/, '');
    for (var bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
        buffer = chars.indexOf(buffer);
    }
    return output;
}

function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        // BAŞLANGIÇ LOGU
        console.log('FullHD: [START] Fonksiyon tetiklendi. ID:', tmdbId, 'Type:', mediaType);

        if (mediaType !== 'movie') {
            console.log('FullHD: [INFO] Sadece film destekleniyor, iptal edildi.');
            return resolve([]);
        }

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        console.log('FullHD: [STEP 1] TMDB verisi çekiliyor...');
        
        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || '';
                console.log('FullHD: [STEP 2] Film adı bulundu:', query);
                
                if (!query) throw new Error('Film ismi bos');

                var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(query);
                console.log('FullHD: [STEP 3] Site aranıyor:', searchUrl);
                
                return fetch(searchUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': BASE_URL }
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var firstFilm = $('li.film a').first().attr('href');
                
                if (!firstFilm) {
                    console.log('FullHD: [ERROR] Sitede film bulunamadı!');
                    return resolve([]);
                }

                var finalUrl = firstFilm.startsWith('http') ? firstFilm : BASE_URL + firstFilm;
                console.log('FullHD: [STEP 4] Film detay sayfasına gidiliyor:', finalUrl);
                
                return fetch(finalUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': BASE_URL }
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                console.log('FullHD: [STEP 5] Sayfa icerigi alindi, scx araniyor...');
                
                var streams = [];
                var scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
                
                if (!scxMatch) {
                    console.log('FullHD: [ERROR] scx objesi bulunamadi! (Site yapisi degismis olabilir)');
                    return resolve([]);
                }

                try {
                    var scxData = JSON.parse(scxMatch[1]);
                    console.log('FullHD: [STEP 6] scx parse edildi. Kaynaklar kontrol ediliyor...');
                    
                    var keys = ['proton', 'fast', 'tr', 'en'];
                    keys.forEach(function(k) {
                        if (scxData[k] && scxData[k].sx && scxData[k].sx.t) {
                            scxData[k].sx.t.forEach(function(enc) {
                                var decoded = manualAtob(rot13(enc));
                                if (decoded && decoded.indexOf('m3u8') !== -1) {
                                    streams.push({
                                        name: 'FullHD - ' + k.toUpperCase(),
                                        url: decoded,
                                        quality: 'HD',
                                        headers: { 'Referer': BASE_URL + '/' }
                                    });
                                }
                            });
                        }
                    });
                } catch (e) {
                    console.log('FullHD: [ERROR] JSON/Decode hatasi:', e.message);
                }

                console.log('FullHD: [FINISH] Toplam link sayisi:', streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.log('FullHD: [CRITICAL] Hata olustu:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
