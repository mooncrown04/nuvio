var import_cheerio = __toESM(require("cheerio-without-node-native"));

// Kotlin kodundaki temel değişkenler
const BASE_URL = 'https://www.diziyou.one';
const STORAGE_URL = 'https://storage.diziyou.one'; 

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
};

/**
 * Kotlin'deki loadLinks mantığını JavaScript şablonuna uyarlar
 */
async function extractStreams(tmdbId, mediaType, season, episode) {
    return __async(this, null, function* () {
        try {
            // 1. TMDB'den Türkçe isim al (Arama için gerekli)
            const tmdbUrl = `https://api.themoviedb.org/3/tv/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;
            const tmdbRes = yield fetch(tmdbUrl).then(res => res.json());
            const query = tmdbRes.name;

            if (!query) return [];

            // 2. Arama yap ve ilk sonucu bul (Kotlin: search fonksiyonu)
            const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
            const searchHtml = yield fetch(searchUrl, { headers: HEADERS }).then(res => res.text());
            const $search = import_cheerio.default.load(searchHtml);
            
            const firstResult = $search('div.incontent div#list-series div#categorytitle a').first().attr('href');
            if (!firstResult) return [];

            // 3. Bölüm URL'sini oluştur (Kotlin: slug - season - episode mantığı)
            const slug = firstResult.replace(BASE_URL + '/', '').replace(/\/$/, '');
            const episodeUrl = `${BASE_URL}/${slug}-${season}-sezon-${episode}-bolum/`;
            
            const epHtml = yield fetch(episodeUrl, { headers: HEADERS }).then(res => res.text());
            const $ep = import_cheerio.default.load(epHtml);

            // 4. itemId Ayıkla (Kotlin: iframe#diziyouPlayer src split)
            const playerSrc = $ep('iframe#diziyouPlayer').attr('src');
            if (!playerSrc) return [];

            // Kotlin: itemId = src.split("/").last().substringBefore(".html")
            const itemId = playerSrc.split('/').pop().replace('.html', '');
            
            const streams = [];
            const subtitles = [];

            // 5. Kaynakları Belirle (Kotlin: span.diziyouOption kontrolü)
            
            // Türkçe Altyazı ve Orijinal Ses
            if (epHtml.includes('id="turkceAltyazili"')) {
                subtitles.push({
                    label: 'Turkish',
                    url: `${STORAGE_URL}/subtitles/${itemId}/tr.vtt`
                });
                streams.push({
                    name: 'DiziYou (Altyazılı)',
                    url: `${STORAGE_URL}/episodes/${itemId}/play.m3u8`
                });
            }

            // İngilizce Altyazı
            if (epHtml.includes('id="ingilizceAltyazili"')) {
                subtitles.push({
                    label: 'English',
                    url: `${STORAGE_URL}/subtitles/${itemId}/en.vtt`
                });
            }

            // Türkçe Dublaj (Kotlin: itemId + "_tr")
            if (epHtml.includes('id="turkceDublaj"')) {
                streams.push({
                    name: 'DiziYou (Dublaj)',
                    url: `${STORAGE_URL}/episodes/${itemId}_tr/play.m3u8`
                });
            }

            // Fallback: Hiçbiri yoksa varsayılanı dene
            if (streams.length === 0) {
                streams.push({
                    name: 'DiziYou (Video)',
                    url: `${STORAGE_URL}/episodes/${itemId}/play.m3u8`
                });
            }

            // 6. Şablon formatında çıktı ver
            return streams.map(s => ({
                name: s.name,
                url: s.url,
                quality: 'Auto',
                headers: { 'Referer': BASE_URL + '/' }, // Referer kritik!
                subtitles: subtitles
            }));

        } catch (error) {
            console.error(`[DiziYou] Extractor Hatası: ${error.message}`);
            return [];
        }
    });
}

/**
 * Şablondaki ana getStreams fonksiyonu
 */
function getStreams(tmdbId, mediaType, season, episode) {
    return __async(this, null, function* () {
        if (mediaType !== 'tv') return []; 
        console.log(`[DiziYou] İşleniyor: S${season}E${episode}`);
        return yield extractStreams(tmdbId, mediaType, season, episode);
    });
}

module.exports = { getStreams };
