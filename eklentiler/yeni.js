/**
 * ###########################################################################
 * # NUVIO PROTOKOLÜ: STREAMIMDB MULTI-SOURCE RESOLVER                       #
 * ###########################################################################
 * # BİLGİ NOTU: Bu versiyon sadece ilk linki değil, sayfadaki tüm geçerli   #
 * # m3u8 kaynaklarını toplar ve Nuvio'ya liste olarak döner.                #
 * ###########################################################################
 */

var axios = require("axios");

const PROVIDER_NAME = "StreamIMDB-Multi";

function getStreams(tmdbId, mediaType, season, episode) {
    console.error(`[${PROVIDER_NAME}] SORGÜ BAŞLADI -> ID: ${tmdbId}`);

    return new Promise(function(resolve) {
        const type = (mediaType === 'movie') ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=500330721680edb6d5f7f12ba7cd9023&append_to_response=external_ids`;

        axios.get(tmdbUrl).then(function(res) {
            const imdbId = res.data.external_ids ? res.data.external_ids.imdb_id : null;
            if (!imdbId) throw new Error("IMDB ID bulunamadı");

            const embedUrl = (mediaType === 'movie') 
                ? `https://streamimdb.me/embed/${imdbId}`
                : `https://streamimdb.me/embed/${imdbId}/${season}/${episode}`;

            return axios.get(embedUrl, { 
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
            }).then(function(htmlRes) {
                return { html: htmlRes.data, title: res.data.title || res.data.name };
            });
        })
        .then(function(data) {
            // Tüm .m3u8 linklerini yakala
            const m3u8Regex = /https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/g;
            const matches = data.html.match(m3u8Regex) || [];
            
            // Linkleri benzersiz yap (aynı linkten birden fazla varsa temizle)
            const uniqueLinks = Array.from(new Set(matches));

            if (uniqueLinks.length > 0) {
                console.error(`[${PROVIDER_NAME}] ${uniqueLinks.length} adet kaynak bulundu.`);

                const results = uniqueLinks.map(function(link, index) {
                    return {
                        name: `StreamIMDB #${index + 1}`,
                        title: `${data.title} - Kaynak ${index + 1}`,
                        url: link,
                        isHls: true,
                        headers: {
                            'Referer': 'https://cloudnestra.com/',
                            'Origin': 'https://cloudnestra.com',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                        }
                    };
                });
                resolve(results);
            } else {
                console.error(`[${PROVIDER_NAME}] Uygun m3u8 kaynağı bulunamadı.`);
                resolve([]);
            }
        })
        .catch(function(err) {
            console.error(`[${PROVIDER_NAME}] HATA: ${err.message}`);
            resolve([]);
        });
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams: getStreams };
