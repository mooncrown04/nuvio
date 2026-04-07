// src/lamovie/unified.js
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var BASE_URL = "https://la.movie";
var API_URL = "https://la.movie/wp-api/v1";
var DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};

// YARDIMCI FONKSIYONLAR
function get(url, extraHeaders) {
  var headers = Object.assign({}, DEFAULT_HEADERS, extraHeaders || {});
  return fetch(url, { headers, redirect: "follow" }).then(function(res) {
    if (!res.ok) throw new Error("HTTP " + res.status + " for " + url);
    return res.headers.get("content-type")?.indexOf("json") !== -1 ? res.json() : res.text();
  });
}

function normalizeTitle(t) {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function b64decode(str) {
  try { return atob(str); } catch (e) { return null; }
}

function unpackEval(p, a, c, k, e, d) {
    while (c--) if (k[c]) p = p.replace(new RegExp('\\b' + c.toString(a) + '\\b', 'g'), k[c]);
    return p;
}

// ÇÖZÜCÜLER (RESOLVERS)
function resolveVimeos(embedUrl) {
  var playHeaders = { "User-Agent": DEFAULT_HEADERS["User-Agent"], "Referer": "https://vimeos.net/", "Origin": "https://vimeos.net" };
  function attempt(n) {
    if (n > 5) return null; // 5 denemeden sonra bırak
    return get(embedUrl, { "Referer": BASE_URL + "/" }).then(function(data) {
      var packMatch = data.match(/eval\(function\(p,a,c,k,e,[a-z]\)\{[\s\S]+?\}\('([\s\S]+?)',(\d+),(\d+),'([\s\S]+?)'\.split\('\|'\)/);
      if (!packMatch) return null;
      var unpacked = unpackEval(packMatch[1], parseInt(packMatch[2]), parseInt(packMatch[3]), packMatch[4].split("|"), 0, {});
      var m = unpacked.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)['"]/);
      var masterUrl = m ? m[1] : null;
      
      if (masterUrl && masterUrl.indexOf("i=0.0") !== -1) {
        return { url: masterUrl, quality: "1080p", headers: playHeaders };
      }
      return attempt(n + 1);
    });
  }
  return attempt(1);
}

function getResolver(url) {
  if (url.indexOf("vimeos.net") !== -1) return resolveVimeos;
  // Diğer resolverlar (VOE, StreamWish) buraya eklenebilir
  return null;
}

// ANA MANTIK
function getTmdbInfo(tmdbId, mediaType) {
  var type = (mediaType === "movie") ? "movie" : "tv";
  // Dil tr-TR olarak güncellendi
  var url = "https://api.themoviedb.org/3/" + type + "/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&language=tr-TR";
  return get(url).then(function(data) {
    return {
      title: type === "movie" ? data.title : data.name,
      originalTitle: type === "movie" ? data.original_title : data.original_name,
      year: (type === "movie" ? data.release_date : data.first_air_date || "").slice(0, 4)
    };
  });
}

async function getStreams(tmdbId, mediaType, season, episode) {
  var resolvedType = (mediaType === "tv" || mediaType === "series") ? "tv" : "movie";
  
  try {
    const info = await getTmdbInfo(tmdbId, resolvedType);
    if (!info.title) return [];

    // Arama (Slug mantığı veya Search API kullanılabilir)
    // Bu kısım LaMovie API'sine göre basitleştirilmiştir
    var searchQuery = info.originalTitle || info.title;
    var searchUrl = API_URL + "/search?q=" + encodeURIComponent(searchQuery) + "&postType=any";
    var searchData = await get(searchUrl);
    var posts = searchData?.data?.posts || [];

    if (posts.length === 0) return [];
    var targetPost = posts[0]; // En yakın sonucu al

    var finalId = targetPost._id;

    // Eğer diziyse bölüm ID'sini bul
    if (resolvedType === "tv" && season && episode) {
        var epUrl = API_URL + "/single/episodes/list?_id=" + finalId + "&season=" + season;
        var epData = await get(epUrl);
        var episodes = epData?.data?.posts || [];
        var match = episodes.find(e => String(e.episode_number) === String(episode));
        if (match) finalId = match._id;
        else return [];
    }

    // Embedleri Çek
    var playerUrl = API_URL + "/player?postId=" + finalId;
    var playerData = await get(playerUrl);
    var embeds = playerData?.data?.embeds || [];

    var results = [];
    for (var embed of embeds) {
      var resolver = getResolver(embed.url);
      if (resolver) {
        var res = await resolver(embed.url);
        if (res) {
          results.push({
            name: "LaMovie",
            title: "Vimeos \xB7 " + (mediaType === "movie" ? "Film" : "S" + season + "E" + episode),
            url: res.url,
            quality: "Auto",
            headers: res.headers
          });
        }
      }
    }
    return results;

  } catch (err) {
    console.error("LaMovie Hata:", err);
    return [];
  }
}

if (typeof module !== "undefined") module.exports = { getStreams };
