/**
 * DiziYou Extractor - Şablon Uyarlaması
 */

// Gerekli kütüphane içe aktarımı (Şablondaki gibi)
var import_cheerio = __toESM(require("cheerio-without-node-native"));

const BASE_URL = 'https://www.diziyou.one';
const STORAGE_URL = 'https://storage.diziyou.one';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

/**
 * TMDB'den gelen ismi kullanarak sitede arama yapar ve slug bulur.
 */
async function findSlug(title) {
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(title)}`;
    const response = await fetch(searchUrl, { headers: HEADERS });
    const html = await response.text();
    const $ = import_cheerio.default.load(html);

    // İlk sonucun linkini alıyoruz
    const firstResult = $('#categorytitle a').first().attr('href');
    if (!firstResult) return null;

    // URL'den slug'ı temizle (Örn: /dizi/breaking-bad/ -> breaking-bad)
    return firstResult.replace(BASE_URL, '').replace(/\//g, '');
}

/**
 * Şablonun beklediği ana fonksiyon
 */
async function extractStreams(tmdbId, mediaType, season, episode) {
    return __async(this, null, function* () {
        try {
            // 1. TMDB API'den dizi adını al (Türkçe)
            const tmdbUrl = `https://api.themoviedb.org/3/tv/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;
            const tmdbRes = yield fetch(tmdbUrl).then(res => res.json());
            const title = tmdbRes.name;

            if (!title) return [];

            // 2. Sitede Ara
            const slug = yield findSlug(title);
            if (!slug) return [];

            // 3. Bölüm Sayfasına Git
            // Diziyou formatı: /slug-1-sezon-1-bolum/
            const episodeUrl = `${BASE_URL}/${slug}-${season}-sezon-${episode}-bolum/`;
            const epRes = yield fetch(episodeUrl, { headers: HEADERS }).then(res => res.text());
            
            // 4. itemId (Player ID) Yakala
            const itemIdMatch = epRes.match(/id="diziyouPlayer"[^>]+src="[^"]*\/([^\/]+)\.html"/i);
            const itemId = itemIdMatch ? itemIdMatch[1] : null;

            if (!itemId) return [];

            const streams = [];
            const subtitles = [];

            // 5. Seçenekleri Kontrol Et (Altyazı / Dublaj)
            // Not: diziyou.js'deki mantığı buraya aktarıyoruz
            if (epRes.includes('turkceAltyazili')) {
                subtitles.push({
                    id: 'tr',
                    language: 'Turkish',
                    url: `${STORAGE_URL}/subtitles/${itemId}/tr.vtt`,
                    type: 'vtt'
                });
                streams.push({
                    name: 'DiziYou (Altyazılı)',
                    url: `${STORAGE_URL}/episodes/${itemId}/play.m3u8`,
                    quality: 'Auto',
                    type: 'hls'
                });
            }

            if (epRes.includes('turkceDublaj')) {
                streams.push({
                    name: 'DiziYou (Dublaj)',
                    url: `${STORAGE_URL}/episodes/${itemId}_tr/play.m3u8`,
                    quality: 'Auto',
                    type: 'hls'
                });
            }

            // Eğer hiçbir şey bulunamadıysa varsayılan stream
            if (streams.length === 0) {
                streams.push({
                    name: 'DiziYou (Varsayılan)',
                    url: `${STORAGE_URL}/episodes/${itemId}/play.m3u8`,
                    quality: 'Auto',
                    type: 'hls'
                });
            }

            // Çıktıyı şablonun beklediği formatta döndür
            return streams.map(s => ({
                name: s.name,
                url: s.url,
                headers: { 'Referer': BASE_URL + '/' },
                subtitles: subtitles
            }));

        } catch (e) {
            console.error("[DiziYou] Extractor Error:", e);
            return [];
        }
    });
}

// src/_template/index.js kısmındaki getStreams yapısı
function getStreams(tmdbId, mediaType, season, episode) {
    return __async(this, null, function* () {
        try {
            console.log(`[DiziYou] Request: ${mediaType} ${tmdbId} S${season}E${episode}`);
            const streams = yield extractStreams(tmdbId, mediaType, season, episode);
            return streams;
        } catch (error) {
            console.error(`[DiziYou] Error: ${error.message}`);
            return [];
        }
    });
}

module.exports = { getStreams };
