/**
 * Nuvio Scraper - FilmCennetim (TMDB Sabit Kodlu Versiyon)
 * GitHub: mooncrown04/nuviotr mantığıyla hazırlanmıştır.
 */

const BASE_URL = "https://stream.watchbuddy.tv";
const TMDB_API_KEY = "65166299966144e590059e7987771746"; // Sabit TMDB Key

const Scraper = {
    // 1. Arama: Linkleri yakalar
    search: function(query) {
        const searchUrl = `${BASE_URL}/ara/FilmCennetim?lang=tr&sorgu=${encodeURIComponent(query)}`;
        console.error(`[Nuvio-Debug] Arama: ${searchUrl}`);

        return fetch(searchUrl)
            .then(res => res.text())
            .then(html => {
                const results = [];
                const regex = /href="(\/izle\/FilmCennetim\?[^"]+)"/g;
                let match;
                while ((match = regex.exec(html)) !== null) {
                    const path = match[1].replace(/&amp;/g, '&');
                    const params = new URLSearchParams(path.split('?')[1]);
                    results.push({
                        id: path,
                        name: params.get('baslik') || "Film",
                        poster: params.get('poster_url') || "",
                        type: 'movie'
                    });
                }
                return results;
            });
    },

    // 2. Meta: Linke basıldığında TMDB API'sini kullanan o "sabit kod" yapısı
    getMeta: function(id) {
        const params = new URLSearchParams(id.split('?')[1]);
        const originalTitle = params.get('baslik') || "";
        
        // İsmi TMDB için temizle (Yıl, 4K, Dublaj vb. ekleri at)
        const cleanTitle = originalTitle
            .replace(/[0-9]{4}/g, '')
            .replace(/İzle|Full|HD|4K|Türkçe|Dublaj|Altyazılı/gi, '')
            .trim();

        console.error(`[Nuvio-Debug] TMDB Aranıyor: ${cleanTitle}`);

        const tmdbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(cleanTitle)}&language=tr-TR`;

        return fetch(tmdbUrl)
            .then(res => res.json())
            .then(json => {
                const movie = json.results && json.results[0];
                if (movie) {
                    return {
                        id: id,
                        name: movie.title,
                        poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
                        background: `https://image.tmdb.org/t/p/original${movie.backdrop_path}`,
                        description: movie.overview,
                        imdbRating: movie.vote_average,
                        releaseInfo: movie.release_date ? movie.release_date.split('-')[0] : "",
                        type: 'movie'
                    };
                }
                // TMDB bulamazsa linkteki orijinal veriyi dön
                return {
                    id: id,
                    name: originalTitle,
                    poster: params.get('poster_url'),
                    type: 'movie'
                };
            })
            .catch(err => {
                console.error(`[Nuvio-Critical] TMDB Hatası: ${err.message}`);
                return null;
            });
    },

    // 3. Stream: Hostname bozulmasını kesin çözen yapı
    getStreams: function(id) {
        // Logda görülen tv286217 gibi bozulmaları burada regex ile temizliyoruz
        // Sadece ana domaini koru, arkasına gelen sayıları at
        let fixedPath = id.replace(/(https?:\/\/stream\.watchbuddy\.tv)\d+/, '$1').split(' ')[0];
        
        const streamUrl = fixedPath.startsWith('http') ? fixedPath : BASE_URL + fixedPath;
        console.error(`[Nuvio-Debug] Stream Çekiliyor: ${streamUrl}`);

        return fetch(streamUrl)
            .then(res => {
                if (!res.ok) throw new Error("HTTP 0/Host Hatası");
                return res.text();
            })
            .then(html => {
                const streams = [];
                const iframeRegex = /<iframe[^>]+src="([^"]+)"/g;
                let match;
                while ((match = iframeRegex.exec(html)) !== null) {
                    const src = match[1];
                    if (src.includes('http') && !src.includes('googletagmanager')) {
                        streams.push({
                            title: `Kaynak ${streams.length + 1}`,
                            url: src,
                            type: 'embed'
                        });
                    }
                }
                return streams;
            })
            .catch(err => {
                console.error(`[Nuvio-Critical] getStreams Hatası: ${err.message}`);
                return [];
            });
    }
};

module.exports = Scraper;
