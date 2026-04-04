var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(tmdbId, mediaType) {
    // LOGLARDA BU SATIRI ARAT: "BURADAYIM"
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!!! BURADAYIM: getStreams FONKSIYONU CALISTI !!!");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

    try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await res.json();
        const imdbId = d.external_ids?.imdb_id;

        if (!imdbId) {
            console.error("!!! HATA: IMDB ID YOK !!!");
            return [];
        }

        console.error("!!! IMDB ID BULDUM: " + imdbId + " !!!");

        return [
            {
                url: `https://vidsrc.to/embed/movie/${imdbId}`,
                name: "VidSrc",
                title: "VidSrc: " + d.title,
                quality: "1080p"
            },
            {
                url: `https://multiembed.mov/?video_id=${imdbId}`,
                name: "MultiEmbed",
                title: "Multi: " + d.title,
                quality: "1080p"
            }
        ];
    } catch (e) {
        console.error("!!! KRITIK HATA: " + e.message + " !!!");
        return [];
    }
}

// Global tanım (Nuvio/Cloudstream uyumu için)
globalThis.getStreams = getStreams;
if (typeof module !== 'undefined') module.exports = { getStreams };
