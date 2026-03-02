var import_cheerio_without_node_native = __toESM(require("cheerio-without-node-native"));

// FilmModu Extractor
async function extractStreams(tmdbId, mediaType, season, episode) {
  try {
    const BASE_URL = 'https://www.filmmodu.ws';
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // 1. TMDB'den Film Bilgisini Al
    const tmdbRes = yield fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
    const movieData = yield tmdbRes.json();
    const movieName = movieData.title || movieData.original_title;

    // 2. FilmModu'nda Ara
    const searchRes = yield fetch(`${BASE_URL}/film-ara?term=${encodeURIComponent(movieName)}`, { headers: { 'User-Agent': UA } });
    const searchHtml = yield searchRes.text();
    const $search = import_cheerio_without_node_native.default.load(searchHtml);
    
    // İlk film linkini bul
    const movieRelativePath = $search('.movie a').first().attr('href');
    if (!movieRelativePath) return [];

    const movieUrl = movieRelativePath.startsWith('http') ? movieRelativePath : BASE_URL + movieRelativePath;

    // 3. Film Sayfasına Git ve Kaynakları Bul
    const movieRes = yield fetch(movieUrl, { headers: { 'User-Agent': UA } });
    const movieHtml = yield movieRes.text();
    
    // Video ID ve Type'ı HTML içinden ayıkla
    const videoId = movieHtml.match(/var\s+videoId\s*=\s*['"]([^'"]+)['"]/)[1];
    const videoType = movieHtml.match(/var\s+videoType\s*=\s*['"]([^'"]+)['"]/)[1];

    if (!videoId) return [];

    // 4. Gerçek Kaynak Linklerini Çek (AJAX)
    const sourceRes = yield fetch(`${BASE_URL}/get-source?movie_id=${videoId}&type=${videoType}`, {
      headers: { 
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': movieUrl,
        'User-Agent': UA
      }
    });
    const data = yield sourceRes.json();

    if (!data || !data.sources) return [];

    // 5. MTK İşlemci Dostu Stream Objelerini Oluştur
    return data.sources.map(s => ({
      name: "⌜ FilmModu ⌟",
      title: `${movieName} - ${s.label}`,
      url: s.src.startsWith('http') ? s.src : BASE_URL + s.src,
      is_direct: true,
      // Kendi player'ında MTK hatasını önlemek için donanım hızlandırmayı kapatan flagler
      hw_decode: false,
      force_sw: true,
      headers: {
        "User-Agent": UA,
        "Referer": BASE_URL + "/",
        "Origin": BASE_URL
      }
    }));

  } catch (error) {
    console.error(`[FilmModu] Extractor Error: ${error.message}`);
    return [];
  }
}

// Şablondaki getStreams fonksiyonuna bağla
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      console.log(`[FilmModu] İstek: ${mediaType} ${tmdbId}`);
      // Sadece filmleri destekle (Dizi desteği istenirse geliştirilebilir)
      if (mediaType !== 'movie') return [];
      
      const streams = yield extractStreams(tmdbId, mediaType, season, episode);
      return streams;
    } catch (error) {
      console.error(`[FilmModu] Genel Hata: ${error.message}`);
      return [];
    }
  });
}

module.exports = { getStreams };
