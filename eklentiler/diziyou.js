/**
 * DiziYou Extractor - CloudStream Kotlin Mantığıyla Güncellendi
 */

var import_cheerio = __toESM(require("cheerio-without-node-native"));

const BASE_URL = 'https://www.diziyou.one';
const STORAGE_URL = 'https://storage.diziyou.one'; // Kotlin kodundaki storage mantığı

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
};

async function extractStreams(tmdbId, mediaType, season, episode) {
    return __async(this, null, function* () {
        try {
            // 1. TMDB'den Türkçe Dizi İsmini Al
            const tmdbUrl = `https://api.themoviedb.org/3/tv/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;
            const tmdbRes = yield fetch(tmdbUrl).then(res => res.json());
            const query = tmdbRes.name;

            if (!query) return [];

            // 2. Arama Yap (Kotlin'deki search fonksiyonu mantığı)
            const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
            const searchHtml = yield fetch(searchUrl, { headers: HEADERS }).then(res => res.text());
            const $search = import_cheerio.default.load(searchHtml);
            
            // İlk sonucu bul (div.incontent div#list-series)
            const firstResult = $search('div.incontent div#list-series div#categorytitle a').first().attr('href');
            if (!firstResult) return [];

            // 3. Bölüm Sayfasına Git (Kotlin'deki load/episode mantığı)
            // Slug üzerinden URL oluşturma (Kotlin: removePrefix + replace Regex)
            const slug = firstResult.replace(BASE_URL + '/', '').replace(/\/$/, '');
            const episodeUrl = `${BASE_URL}/${slug}-${season}-sezon-${episode}-bolum/`;
            
            const epHtml = yield fetch(episodeUrl, { headers: HEADERS }).then(res => res.text());
            const $ep = import_cheerio.default.load(epHtml);

            // 4. itemId Çıkar (Kotlin: iframe#diziyouPlayer src split last substringBefore)
            const playerSrc = $ep('iframe#diziyouPlayer').attr('src');
            if (!playerSrc) return [];

            const itemId = playerSrc.split('/').pop().replace('.html', '');
            
            const streams = [];
            const subtitles = [];

            // 5. Seçenekleri Kontrol Et (Kotlin: span.diziyouOption döngüsü)
            // Altyazılı Seçeneği (turkceAltyazili)
            if (epHtml.includes('id="turkceAltyazili"')) {
                subtitles.push({
                    lang: 'Turkish',
                    url: `${STORAGE_URL}/subtitles/${itemId}/tr.vtt`
                });
                streams.push({
                    name: 'DiziYou (Orjinal Dil / Altyazılı)',
                    url: `${STORAGE_URL}/episodes/${itemId}/play.m3u8`
                });
            }

            // İngilizce Altyazı Seçeneği (ingilizceAltyazili)
            if (epHtml.includes('id="ingilizceAltyazili"')) {
                subtitles.push({
                    lang: 'English',
                    url: `${STORAGE_URL}/subtitles/${itemId}/en.vtt`
                });
            }

            // Dublaj Seçeneği (turkceDublaj)
            if (epHtml.includes('id="turkceDublaj"')) {
                streams.push({
                    name: 'DiziYou (Türkçe Dublaj)',
                    url: `${STORAGE_URL}/episodes/${itemId}_tr/play.m3u8`
                });
            }

            // Eğer hiç seçenek bulunamadıysa varsayılan (Kotlin fallback)
            if (streams.length === 0) {
                streams.push({
                    name: 'DiziYou (Varsayılan)',
                    url: `${STORAGE_URL}/episodes/${itemId}/play.m3u8`
                });
            }

            // Çıktıyı standart formata dönüştür
            return streams.map(s => ({
                name: s.name,
                url: s.url,
                quality: 'Auto',
                headers: { 'Referer': BASE_URL + '/' },
                subtitles: subtitles.map(sub => ({
                    label: sub.lang,
                    url: sub.url
                }))
            }));

        } catch (error) {
            console.error(`[DiziYou] Hata: ${error.message}`);
            return [];
        }
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
    return __async(this, null, function* () {
        if (mediaType !== 'tv') return []; // DiziYou sadece dizi içindir
        return yield extractStreams(tmdbId, mediaType, season, episode);
    });
}

module.exports = { getStreams };
