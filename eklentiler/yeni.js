const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://stream.watchbuddy.tv";

const Scraper = {
    // 1. ARAMA FONKSİYONU
    search: function(query) {
        return axios.get(`${BASE_URL}/ara/FilmCennetim?lang=tr&sorgu=${encodeURIComponent(query)}`)
            .then(response => {
                const $ = cheerio.load(response.data);
                const results = [];

                // HTML içindeki tüm sonuç linklerini yakalıyoruz
                $('a[href*="/izle/FilmCennetim"]').each((i, el) => {
                    const href = $(el).attr('href'); // Örn: /izle/FilmCennetim?url=...
                    const fullUrl = new URL(href, BASE_URL).href;
                    const params = new URLSearchParams(href.split('?')[1]);

                    results.push({
                        id: fullUrl,
                        name: params.get('baslik') || "Bilinmeyen Film", // URL'den başlığı al
                        poster: params.get('poster_url'), // URL'den posteri al
                        type: 'movie',
                        description: `${params.get('year')} - IMDb: ${params.get('rating')}` // Yıl ve Rating bilgisi
                    });
                });

                return results;
            })
            .catch(err => {
                console.error("Arama hatası:", err);
                return [];
            });
    },

    // 2. DETAY (META) FONKSİYONU
    getMeta: function(id) {
        return axios.get(id)
            .then(response => {
                const $ = cheerio.load(response.data);
                const params = new URLSearchParams(id.split('?')[1]);

                return {
                    id: id,
                    name: params.get('baslik'),
                    type: 'movie',
                    poster: params.get('poster_url'),
                    background: params.get('poster_url'), // Arkaplan için de posteri kullanıyoruz
                    description: $("meta[name='description']").attr('content'), // SEO meta tag'inden özeti al
                    releaseInfo: params.get('year'),
                    imdbRating: params.get('rating'),
                    genres: ["Aksiyon", "Macera"] // Bu kısmı HTML'den dinamik de çekebiliriz
                };
            });
    },

    // 3. YAYIN (STREAM) FONKSİYONU
    getStreams: function(id) {
        return axios.get(id)
            .then(response => {
                const $ = cheerio.load(response.data);
                const streams = [];

                // HTML içindeki iframe veya video kaynaklarını bul
                // KekikStream yapısında kaynaklar genellikle bir iframe içinde sunulur
                $('iframe').each((i, el) => {
                    const src = $(el).attr('src');
                    if (src) {
                        streams.push({
                            title: `Kaynak ${i + 1}`,
                            url: src,
                            type: 'embed' // Nuvio iç oynatıcı veya harici için
                        });
                    }
                });

                return streams;
            });
    }
};

module.exports = Scraper;
