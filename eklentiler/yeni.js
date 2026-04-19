/**
 * CinemaCity - MoOnCrOwN Edition (Fixed Search & Fallback)
 */

// ... (Helperlar ve Tanımlamalar aynı kalıyor) ...

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const tmdbRes = await fetch(`https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=${TMDB_API_KEY}`);
    const mediaInfo = await tmdbRes.json();
    const animeTitle = mediaInfo.title || mediaInfo.name;
    if (!animeTitle) return [];

    // 1. ADIM: Sitede Arama Yap
    const searchUrl = `${MAIN_URL}/index.php?do=search&subaction=search&story=${encodeURIComponent(animeTitle)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS })).text();
    let $ = cheerio.load(searchHtml);
    let mediaUrl = null;

    const findMatch = (selector) => {
      let found = null;
      $(selector).each((i, el) => {
        if (found) return;
        const anchor = $(el).find("a").filter((idx, a) => ($(a).attr("href") || "").includes(".html")).first();
        if (!anchor.length) return;
        const foundTitle = anchor.text().split("(")[0].trim().toLowerCase();
        const targetTitle = animeTitle.toLowerCase();
        
        // Daha esnek eşleşme: Ya tam aynıdır, ya biri diğerini kapsıyordur
        if (foundTitle === targetTitle || foundTitle.includes(targetTitle) || targetTitle.includes(foundTitle)) {
          found = anchor.attr("href");
        }
      });
      return found;
    };

    mediaUrl = findMatch("div.dar-short_item");

    // 2. ADIM: EKSİK OLAN KISIM (Fallback)
    // Eğer aramada çıkmadıysa ana sayfadaki son eklenenlere bak (bazı güncel filmler aramaya hemen düşmeyebiliyor)
    if (!mediaUrl) {
      const homeHtml = await (await fetch(MAIN_URL, { headers: HEADERS })).text();
      $ = cheerio.load(homeHtml);
      mediaUrl = findMatch("div.dar-short_item");
    }

    if (!mediaUrl) return [];

    // 3. ADIM: Sayfa Çözümleme ve atob Fix
    const pageHtml = await (await fetch(mediaUrl, { headers: HEADERS })).text();
    const $page = cheerio.load(pageHtml);
    let fileData = null;

    $page("script").each((i, el) => {
      if (fileData) return;
      const html = $page(el).html();
      if (html && html.includes("atob")) {
        const regex = /atob\s*\(\s*(['"])(.*?)\1\s*\)/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
          const decoded = atobPolyfill(match[2]);
          // Nuvio'nun beklediği file regex yapısı
          const fileMatch = decoded.match(/file\s*:\s*(['"])(.*?)\1/s) || decoded.match(/file\s*:\s*(\[.*?\])/s);
          if (fileMatch) {
            let rawFile = fileMatch[2] || fileMatch[1];
            if (rawFile && rawFile.length > 10) {
                try { 
                    // Ters eğik çizgi fixi (Kritik)
                    fileData = JSON.parse(rawFile.replace(/\\(.)/g, "$1")); 
                } catch (e) { 
                    try { fileData = JSON.parse(rawFile); } catch (e2) { fileData = rawFile; }
                }
                if (fileData) break;
            }
          }
        }
      }
    });

    if (!fileData) return [];

    const streams = [];
    // ... (addStream ve processStr fonksiyonları buraya gelecek - önceki mesajdakiyle aynı) ...

    // Medya işleme (Movie/TV)
    if (mediaType === "movie") {
      if (Array.isArray(fileData)) {
          const obj = fileData.find(f => !f.folder && f.file) || fileData[0];
          if (obj && obj.file) processStr(obj.file, animeTitle);
      } else if (typeof fileData === "string") {
          processStr(fileData, animeTitle);
      }
    } else {
      // Dizi mantığı (Season/Episode)
      if (Array.isArray(fileData)) {
        const sObj = fileData.find(s => s.title?.includes(`Season ${season}`) || s.title?.includes(`S${season}`));
        if (sObj && sObj.folder) {
          const eObj = sObj.folder.find(e => e.title?.includes(`Episode ${episode}`) || e.title?.includes(`E${episode}`));
          if (eObj && eObj.file) processStr(eObj.file, `${animeTitle} S${season}E${episode}`);
        }
      }
    }

    return streams;
  } catch (error) { return []; }
}

module.exports = { getStreams };
