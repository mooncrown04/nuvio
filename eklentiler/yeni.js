/**
 * ###########################################################################
 * # BİLGİ NOTU: 'axios' hatasını gidermek için yerleşik fetch kullanıldı.    #
 * # console.error ile sitenin gönderdiği tüm ham veri terminale dökülür.    #
 * ###########################################################################
 */

const PROVIDER_NAME = "StreamIMDB-Debugger";

function getStreams(tmdbId, mediaType, season, episode) {
    // console.log YASAK: Sadece console.error
    console.error(`[${PROVIDER_NAME}] SORGÜ BAŞLADI -> TMDB: ${tmdbId}`);

    return new Promise(function(resolve) {
        const type = (mediaType === 'movie') ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=500330721680edb6d5f7f12ba7cd9023&append_to_response=external_ids`;

        // ADIM 1: TMDB üzerinden IMDB ID al
        fetch(tmdbUrl)
            .then(res => res.json())
            .then(tmdbData => {
                const imdbId = tmdbData.external_ids ? tmdbData.external_ids.imdb_id : null;
                if (!imdbId) throw new Error("IMDB ID bulunamadı");

                const embedUrl = (mediaType === 'movie') 
                    ? `https://streamimdb.me/embed/${imdbId}`
                    : `https://streamimdb.me/embed/${imdbId}/${season}/${episode}`;

                console.error(`[${PROVIDER_NAME}] HEDEF URL: ${embedUrl}`);

                // ADIM 2: Siteden gelen ham veriyi yakala
                return fetch(embedUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
                });
            })
            .then(res => res.text()) // Ham HTML metnini al
            .then(rawHtml => {
                // KRİTİK: Siteden gelen ham verinin ilk 500 karakterini terminale bas
                console.error(`[${PROVIDER_NAME}] HAM VERİ (İLK 500 KARAKTER): ${rawHtml.substring(0, 500)}`);

                // Regex ile m3u8 linklerini tara
                const m3u8Regex = /https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/g;
                const matches = rawHtml.match(m3u8Regex);

                if (matches && matches.length > 0) {
                    const finalLink = matches[0];
                    console.error(`[${PROVIDER_NAME}] BULUNAN M3U8: ${finalLink}`);

                    resolve([{
                        name: "StreamIMDB Debug",
                        title: "1080p - Direct Stream",
                        url: finalLink,
                        isHls: true,
                        headers: {
                            'Referer': 'https://cloudnestra.com/',
                            'Origin': 'https://cloudnestra.com',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                        }
                    }]);
                } else {
                    // Link bulunamazsa ham verinin tamamını terminale bas ki neden bulamadığını görelim
                    console.error(`[${PROVIDER_NAME}] HATA: m3u8 bulunamadı. Sayfa içeriği incelenmeli.`);
                    console.error(`[${PROVIDER_NAME}] TAM HAM VERİ: ${rawHtml}`);
                    resolve([]);
                }
            })
            .catch(err => {
                console.error(`[${PROVIDER_NAME}] KRİTİK HATA: ${err.message}`);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams: getStreams };
