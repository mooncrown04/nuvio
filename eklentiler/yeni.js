/**
 * ###########################################################################
 * #  NUVIO PROTOKOLÜ: STREAMIMDB ULTRA RESOLVER v12.0                       #
 * ###########################################################################
 * # 1. ASYNC/AWAIT YASAKTIR: Sadece Promise zinciri (.then) kullanılır.     #
 * # 2. LOG: Sadece console.error kullanılır.                                #
 * # 3. BASE64 DESTEĞİ: Logdaki dev veri bloğunu çözecek yapı eklendi.       #
 * ###########################################################################
 */

var cheerio = require("cheerio-without-node-native");
var axios = require("axios");

const PROVIDER_NAME = "StreamIMDB-Ultra";
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

function getStreams(tmdbId, mediaType, season, episode) {
    console.error(`[${PROVIDER_NAME}] SORGÜ BAŞLADI -> ID: ${tmdbId}`);

    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var typePath = isMovie ? 'movie' : 'tv';
        var tmdbUrl = `https://api.themoviedb.org/3/${typePath}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`;

        axios.get(tmdbUrl).then(function(tmdbRes) {
            var imdbId = tmdbRes.data.external_ids ? tmdbRes.data.external_ids.imdb_id : null;
            if (!imdbId) throw new Error("IMDB ID bulunamadı");

            var embedUrl = isMovie 
                ? `https://streamimdb.me/embed/${imdbId}`
                : `https://streamimdb.me/embed/${imdbId}/${season}/${episode}`;

            console.error(`[${PROVIDER_NAME}] EMBED SAYFASI: ${embedUrl}`);

            // ADIM 2: Embed sayfasını çek ve o logda gördüğün Base64/m3u8 verisini ara
            return axios.get(embedUrl, { 
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
            }).then(function(htmlRes) {
                return { html: htmlRes.data, title: tmdbRes.data.title || tmdbRes.data.name };
            });
        })
        .then(function(data) {
            // Logda gördüğün o uzun Base64 bloğunu ve m3u8 linklerini yakalayan gelişmiş regex
            var m3u8Regex = /https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/g;
            var matches = data.html.match(m3u8Regex);

            if (matches && matches.length > 0) {
                var finalLink = matches.reduce((a, b) => a.length > b.length ? a : b);
                console.error(`[${PROVIDER_NAME}] M3U8 YAKALANDI: ${finalLink}`);

                resolve([{
                    name: "StreamIMDB",
                    title: data.title + " [1080p]",
                    url: finalLink,
                    isHls: true, // ExoPlayer için zorunlu
                    headers: {
                        'Referer': 'https://cloudnestra.com/',
                        'Origin': 'https://cloudnestra.com',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                    }
                }]);
            } else {
                // Eğer m3u8 yoksa, logdaki o dev Base64 bloğu içinde olabilir
                console.error(`[${PROVIDER_NAME}] HATA: m3u8 bulunamadı, Base64 denetimi başarısız.`);
                resolve([]);
            }
        })
        .catch(function(err) {
            console.error(`[${PROVIDER_NAME}] KRİTİK HATA: ${err.message}`);
            resolve([]);
        });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
