/**
 * Nuvio Scraper - FilmCennetim (Stabil TMDB Versiyonu)
 * GitHub mooncrown04/nuviotr şablonuna göre güncellendi.
 */

const BASE_URL = "https://stream.watchbuddy.tv";
const TMDB_KEY = "65166299966144e590059e7987771746";

const Scraper = {
    // 1. Arama: Linkleri yakalar ve Nuvio'ya iletir
    search: function(query) {
        const searchUrl = BASE_URL + "/ara/FilmCennetim?lang=tr&sorgu=" + encodeURIComponent(query);
        console.error("[Nuvio-Debug] Arama URL: " + searchUrl);

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
            })
            .catch(err => {
                console.error("[Nuvio-Critical] Search Hatası: " + err.message);
                return [];
            });
    },

    // 2. Meta: Linke basıldığında TMDB API'sini devreye sokan "sabit" kısım
    getMeta: function(id) {
        const params = new URLSearchParams(id.split('?')[1]);
        const baslik = params.get('baslik') || "";
        
        // TMDB için isim temizleme (Sabit Nuvio Mantığı)
        const cleanTitle = baslik
            .replace(/[0-9]{4}/g, '')
            .replace(/İzle|Full|HD|4K|Türkçe|Dublaj|Altyazılı/gi, '')
            .trim();

        const tmdbUrl = "https://api.themoviedb.org/3/search/movie?api_key=" + TMDB_KEY + "&query=" + encodeURIComponent(cleanTitle) + "&language=tr-TR";
        console.error("[Nuvio-Debug] TMDB İstek: " + tmdbUrl);

        return fetch(tmdbUrl)
            .then(res => res.json())
            .then(json => {
                const movie = json.results && json.results[0];
                if (movie) {
                    return {
                        id: id,
                        name: movie.title,
                        poster: "https://image.tmdb.org/t/p/w500" + movie.poster_path,
                        background: "https://image.tmdb.org/t/p/original" + movie.backdrop_path,
                        description: movie.overview,
                        imdbRating: movie.vote_average,
                        releaseInfo: movie.release_date ? movie.release_date.split('-')[0] : "",
                        type: 'movie'
                    };
                }
                // TMDB bulunamazsa linkteki orijinal veriyi dön
                return {
                    id: id,
                    name: baslik,
                    poster: params.get('poster_url'),
                    type: 'movie'
                };
            })
            .catch(err => {
                console.error("[Nuvio-Critical] getMeta TMDB Hatası: " + err.message);
                return null;
            });
    },

    // 3. Stream: Hostname hatasını (tv567609) temizleyen ve kaynak çeken kısım
    getStreams: function(id) {
        // KRİTİK DÜZELTME: Loglardaki tv286217 gibi bozulmaları temizliyoruz
        // id içindeki path'i al ve BASE_URL ile temiz bir şekilde birleştir
        const path = id.split(' ')[0]; // Boşluktan sonrasını at
        const cleanUrl = BASE_URL + (path.startsWith('/') ? path : '/' + path);
        
        console.error("[Nuvio-Debug] Stream Çekiliyor (Temiz): " + cleanUrl);

        return fetch(cleanUrl)
            .then(res => {
                if (!res.ok) throw new Error("Yayın sayfası yüklenemedi: " + res.status);
                return res.text();
            })
            .then(html => {
                const streams = [];
                const iframeRegex = /<iframe[^>]+src="([^"]+)"/g;
                let match;
                let counter = 1;

                while ((match = iframeRegex.exec(html)) !== null) {
                    const src = match[1];
                    if (src.includes('http') && !src.includes('ads')) {
                        streams.push({
                            title: "Kaynak " + (counter++),
                            url: src,
                            type: 'embed'
                        });
                    }
                }
                return streams;
            })
            .catch(err => {
                console.error("[Nuvio-Critical] getStreams Hatası: " + err.message);
                return [];
            });
    }
};

module.exports = Scraper;
