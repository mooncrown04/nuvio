/**
 * CinemaCity - MoOnCrOwN Edition
 * Advanced Flag, Multi-Audio & Quality Support
 */

var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => { try { step(generator.next(value)); } catch (e) { reject(e); } };
    var rejected = (value) => { try { step(generator.throw(value)); } catch (e) { reject(e); } };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

const MAIN_URL = "https://cinemacity.cc";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
  "Cookie": "dle_user_id=32729; dle_password=894171c6a8dab18ee594d5c652009a35;",
  "Referer": "https://cinemacity.cc/"
};
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";

const atobPolyfill = (str) => {
  try {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let output = "";
    str = String(str).replace(/[=]+$/, "");
    if (str.length % 4 === 1) return "";
    for (let bc = 0, bs = 0, buffer, i = 0; buffer = str.charAt(i++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
      buffer = chars.indexOf(buffer);
    }
    return output;
  } catch (e) { return ""; }
};

function extractQuality(url) {
  const low = (url || "").toLowerCase();
  if (low.includes("2160p") || low.includes("4k")) return "4K";
  if (low.includes("1080p")) return "1080p";
  if (low.includes("720p")) return "720p";
  if (low.includes("480p")) return "480p";
  return "HD";
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    // 1. TMDB Bilgisi Çek
    const tmdbRes = await fetch(`https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=${TMDB_API_KEY}`);
    const mediaInfo = await tmdbRes.json();
    const animeTitle = mediaInfo.title || mediaInfo.name;
    if (!animeTitle) return [];

    // 2. Sitede Arama Yap
    const searchUrl = `${MAIN_URL}/index.php?do=search&subaction=search&story=${encodeURIComponent(animeTitle)}`;
    const searchHtml = await (await fetch(searchUrl, { headers: HEADERS })).text();
    const $search = cheerio.load(searchHtml);
    let mediaUrl = null;

    $search("div.dar-short_item").each((i, el) => {
      if (mediaUrl) return;
      const anchor = $search(el).find("a").filter((idx, a) => ($search(a).attr("href") || "").includes(".html")).first();
      const foundTitle = anchor.text().split("(")[0].trim();
      if (foundTitle.toLowerCase().includes(animeTitle.toLowerCase()) || animeTitle.toLowerCase().includes(foundTitle.toLowerCase())) {
        mediaUrl = anchor.attr("href");
      }
    });

    if (!mediaUrl) return [];

    // 3. Sayfayı Çözümle
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
          const fileMatch = decoded.match(/file\s*:\s*(['"])(.*?)\1/s) || decoded.match(/file\s*:\s*(\[.*?\])/s);
          if (fileMatch) {
            let rawFile = fileMatch[2] || fileMatch[1];
            try { 
                // Nuvio Fix: JSON içindeki kaçış karakterlerini temizle
                fileData = JSON.parse(rawFile.replace(/\\(.)/g, "$1")); 
            } catch (e) { 
                try { fileData = JSON.parse(rawFile); } catch (e2) { fileData = rawFile; }
            }
          }
        }
      }
    });

    if (!fileData) return [];

    const streams = [];
    const langMap = [
      { key: "turkish", flag: "🇹🇷" }, { key: "_tr", flag: "🇹🇷" },
      { key: "english", flag: "🇺🇸" }, { key: "_en", flag: "🇺🇸" },
      { key: "german", flag: "🇩🇪" }, { key: "french", flag: "🇫🇷" },
      { key: "russian", flag: "🇷🇺" }, { key: "italian", flag: "🇮🇹" },
      { key: "spanish", flag: "🇪🇸" }
    ];

    const addStream = (url, title, quality) => {
      if (!url || !url.startsWith("http")) return;
      const urlLower = url.toLowerCase();
      let flags = [];
      
      langMap.forEach(item => {
        if (urlLower.includes(item.key)) flags.push(item.flag);
      });

      const audioCount = (url.match(/\.m4a/g) || []).length;
      const finalQuality = quality || extractQuality(url);
      let infoLabel = audioCount > 1 ? `Multi: ${audioCount} ${flags.join("")}` : (flags.join("") || "Orijinal 📄");

      streams.push({
        name: `CinemaCity [${infoLabel}]`,
        title: `${title} - ${finalQuality}`,
        url: url,
        quality: finalQuality,
        headers: __spreadValues({}, HEADERS)
      });
    };

    const processStr = (str, label) => {
      if (!str) return;
      if (str.includes("[") && str.includes(",")) {
        str.split(",").forEach(p => {
          const m = p.match(/\[(.*?)\](.*)/);
          if (m) addStream(m[2], label, m[1]);
          else addStream(p, label, extractQuality(p));
        });
      } else {
        addStream(str, label, extractQuality(str));
      }
    };

    // 4. Medya Türüne Göre Linkleri Ayıkla
    if (mediaType === "movie") {
      if (Array.isArray(fileData)) fileData.forEach(f => f.file && processStr(f.file, animeTitle));
      else if (typeof fileData === "string") processStr(fileData, animeTitle);
    } else {
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
