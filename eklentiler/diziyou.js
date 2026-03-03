/**
 * DiziYou Extractor - Şablon Uyarlaması (Hata Ayıklama Loglu)
 */

var import_cheerio = __toESM(require("cheerio-without-node-native"));

const BASE_URL = 'https://www.diziyou.one';
const STORAGE_URL = 'https://storage.diziyou.one';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
};

async function extractStreams(tmdbId, mediaType, season, episode) {
    return __async(this, null, function* () {
        try {
            console.log(`[DiziYou] İşlem Başladı: ID=${tmdbId}, Tip=${mediaType}, S=${season}, E=${episode}`);

            // 1. TMDB'den Türkçe isim al (Arama için kritik)
            const tmdbUrl = `https://api.themoviedb.org/3/tv/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;
            const tmdbRes = yield fetch(tmdbUrl).then(res => res.json());
            const query = tmdbRes.name;

            if (!query) {
                console.log('[DiziYou] Hata: TMDB üzerinden isim alınamadı.');
                return [];
            }
            console.log(`[DiziYou] TMDB İsmi: ${query}`);

            // 2. Sitede Arama Yap
            const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
            console.log(`[DiziYou] Arama Yapılıyor: ${searchUrl}`);
            
            const searchHtml = yield fetch(searchUrl, { headers: HEADERS }).then(res => res.text());
            const $search = import_cheerio.default.load(searchHtml);
            
            // Kotlin örneğindeki seçici: div.incontent div#list-series
            const firstResult = $search('div.incontent div#list-series div#categorytitle a').first().attr('href');
            
            if (!firstResult) {
                console.log(`[DiziYou] Arama sonucu bulunamadı: ${query}`);
                return [];
            }
            console.log(`[DiziYou] Bulunan Dizi Linki: ${firstResult}`);

            // 3. Bölüm Sayfasına Git
            // Slug oluşturma: /dizi/breaking-bad/ -> breaking-bad
            const slug = firstResult.replace(BASE_URL + '/', '').replace(/\/$/, '');
            const episodeUrl = `${BASE_URL}/${slug}-${season}-sezon-${episode}-bolum/`;
            console.log(`[DiziYou] Bölüm Sayfasına Gidiliyor: ${episodeUrl}`);
            
            const epHtml = yield fetch(episodeUrl, { headers: HEADERS }).then(res => res.text());
            const $ep = import_cheerio.default.load(epHtml);

            // 4. itemId Ayıkla (Iframe içerisinden)
            const playerSrc = $ep('iframe#diziyouPlayer').attr('src');
            if (!playerSrc) {
                console.log('[DiziYou] Hata: Player iframe bulunamadı (itemId alınamıyor).');
                return [];
            }

            // itemId'yi çek (Örn: /player/abc123.html -> abc123)
            const itemId = playerSrc.split('/').pop().replace('.html', '');
            console.log(`[DiziYou] Yakalanan itemId: ${itemId}`);
            
            const streams = [];
            const subtitles = [];

            // 5. Kaynakları ve Altyazıları Belirle (Kotlin Mantığı)
            
            // Türkçe Altyazı Kontrolü
            if (epHtml.includes('id="turkceAltyazili"')) {
                console.log('[DiziYou] Altyazı seçeneği algılandı.');
                subtitles.push({
                    label: 'Turkish',
                    url: `${STORAGE_URL}/subtitles/${itemId}/tr.vtt`
                });
                streams.push({
                    name: 'DiziYou (Altyazılı)',
                    url: `${STORAGE_URL}/episodes/${itemId}/play.m3u8`
                });
            }

            // İngilizce Altyazı Kontrolü
            if (epHtml.includes('id="ingilizceAltyazili"')) {
                console.log('[DiziYou] İngilizce altyazı eklendi.');
                subtitles.push({
                    label: 'English',
                    url: `${STORAGE_URL}/subtitles/${itemId}/en.vtt`
                });
            }

            // Türkçe Dublaj Kontrolü (_tr eki)
            if (epHtml.includes('id="turkceDublaj"')) {
                console.log('[DiziYou] Dublaj seçeneği algılandı.');
                streams.push({
                    name: 'DiziYou (Dublaj)',
                    url: `${STORAGE_URL}/episodes/${itemId}_tr/play.m3u8`
                });
            }

            // Hiçbiri yoksa varsayılanı zorla
            if (streams.length === 0) {
                console.log('[DiziYou] Belirli bir seçenek bulunamadı, varsayılan deneniyor.');
                streams.push({
                    name: 'DiziYou (Video)',
                    url: `${STORAGE_URL}/episodes/${itemId}/play.m3u8`
                });
            }

            // Sonuçları Şablon Formatına Dönüştür
            const finalResults = streams.map(s => ({
                name: `⌜ DiziYou ⌟ | ${s.name}`,
                url: s.url,
                quality: 'Auto',
                headers: { 'Referer': BASE_URL + '/' },
                subtitles: subtitles
            }));

            console.log(`[DiziYou] İşlem Başarılı. Toplam Stream: ${finalResults.length}`);
            return finalResults;

        } catch (error) {
            console.error(`[DiziYou] Kritik Hata: ${error.message}`);
            return [];
        }
    });
}

/**
 * Şablondaki Ana Giriş Noktası
 */
function getStreams(tmdbId, mediaType, season, episode) {
    return __async(this, null, function* () {
        // DiziYou sadece dizi (TV) içeriği barındırır
        if (mediaType !== 'tv') {
            console.log('[DiziYou] Sadece dizi aramaları desteklenmektedir.');
            return [];
        }
        return yield extractStreams(tmdbId, mediaType, season, episode);
    });
}

module.exports = { getStreams };
