"use strict";

// src/uhdmovies/index.js
var DOMAIN = "https://uhdmovies.rip";
var TMDB_API = "https://api.themoviedb.org/3";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// --- YARDIMCI ARAÇLAR ---
function getBaseUrl(url) {
    if (!url) return DOMAIN;
    var match = url.match(/^(https?:\/\/[^\/]+)/);
    return match ? match[1] : DOMAIN;
}

function fixUrl(url, domain) {
    if (!url) return "";
    if (url.indexOf("http") === 0) return url;
    if (url.indexOf("//") === 0) return "https:" + url;
    if (url.indexOf("/") === 0) return domain + url;
    return domain + "/" + url;
}

function stripTags(html) {
    return (html || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
}

// --- İSİM TEMİZLEME VE ANALİZ ---
function cleanTitle(title) {
    if (!title) return "";
    return title
        .replace(/Download|Full|Movie|Dual Audio|Hindi|English|ESub|x264|x265|HEVC|10bit/gi, "")
        .replace(/\[.*?\]/g, "") // [G-Drive] vb. temizle
        .replace(/\(.*?\)/g, "") // (2024) vb. temizle
        .replace(/[._-]/g, " ")  // Noktalama işaretlerini boşluk yap
        .replace(/\s+/g, " ")    // Çift boşlukları temizle
        .trim();
}

function parseSearchResults(html) {
    var results = [];
    var chunks = html.split(/<article/i);
    for (var i = 1; i < chunks.length; i++) {
        var chunk = chunks[i];
        
        // Başlığı H1 veya H2 etiketlerinden çek
        var titleM = chunk.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
        if (!titleM) continue;

        var titleRaw = stripTags(titleM[1]);
        
        // Başlığı sadeleştir: "Download" kısmını ve kalite bilgilerinden sonrasını at
        var cleanName = titleRaw
            .replace(/^Download\s+/i, "")
            .split(/ (?:480p|720p|1080p|2160p|4k)/i)[0]
            .trim();

        var hrefM = chunk.match(/href="([^"]+)"/i);
        var href = hrefM ? hrefM[1] : null;

        if (href && cleanName) {
            results.push({ title: cleanName, url: href, raw: titleRaw });
        }
    }
    return results;
}

// --- TMDB VE ARAMA ---
function getTmdbDetails(tmdbId, mediaType) {
    var isSeries = mediaType === "series" || mediaType === "tv";
    var endpoint = isSeries ? "tv" : "movie";
    var url = `${TMDB_API}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
    
    return fetch(url).then(res => res.json()).then(data => {
        return {
            title: isSeries ? data.name : data.title,
            year: (isSeries ? data.first_air_date : data.release_date || "").slice(0, 4)
        };
    }).catch(() => null);
}

function searchByTitle(title, year) {
    var query = encodeURIComponent(title.trim());
    var url = DOMAIN + "/?s=" + query;
    
    return fetch(url, { headers: { "User-Agent": USER_AGENT } }).then(res => res.text()).then(html => {
        var results = parseSearchResults(html);
        // Filtreleme: Aranan isim sonucun içinde geçiyor mu?
        return results.filter(r => {
            var rTitle = r.title.toLowerCase();
            var tTitle = title.toLowerCase();
            return rTitle.indexOf(tTitle) !== -1 || tTitle.indexOf(rTitle) !== -1;
        });
    });
}

// --- BYPASS VE STREAM ÇEKME ---
async function bypassHrefli(url) {
    // Bu kısım Landing/Bypass mantığını içerir (Daha önceki mantığın aynısı)
    try {
        var host = getBaseUrl(url);
        var res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        var html = await res.text();
        
        var formM = html.match(/<form[^>]*id="landing"[^>]*action="([^"]+)"/i);
        if (!formM) return null;
        
        // Basitleştirilmiş bypass (Driveseed yönlendirmesi için)
        var driveM = html.match(/replace\("([^"]+)"\)/);
        return driveM ? fixUrl(driveM[1], host) : null;
    } catch (e) { return null; }
}

async function extractDriveseedPage(url) {
    try {
        var res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        var html = await res.text();
        var streams = [];
        
        // Instant Download veya Direct Link yakalama
        var linkM = html.match(/href="([^"]+)"[^>]*>Instant Download/i) || html.match(/href="([^"]+)"[^>]*>Direct Link/i);
        
        if (linkM) {
            streams.push({
                name: "UHDMovies",
                title: "Driveseed Direct",
                url: linkM[1],
                quality: "HD"
            });
        }
        return streams;
    } catch (e) { return []; }
}

// --- ANA GİRİŞ ---
async function getStreams(tmdbId, mediaType, season, episode) {
    console.log("[UHDMovies] İstek başladı...");
    
    const tmdb = await getTmdbDetails(tmdbId, mediaType);
    if (!tmdb) return [];

    const results = await searchByTitle(tmdb.title, tmdb.year);
    if (results.length === 0) return [];

    let allStreams = [];
    
    // Sadece en alakalı ilk 2 sonucu işle (Hız ve doğruluk için)
    for (let i = 0; i < Math.min(results.length, 2); i++) {
        let pageUrl = results[i].url;
        let res = await fetch(pageUrl, { headers: { "User-Agent": USER_AGENT } });
        let html = await res.text();

        // Sayfa içindeki "maxbutton-1" (Download butonları) linklerini bul
        let downloadLinks = [];
        let re = /class="maxbutton-1"[^>]*href="([^"]+)"/gi;
        let match;
        while ((match = re.exec(html)) !== null) {
            downloadLinks.push(match[1]);
        }

        for (let link of downloadLinks) {
            if (link.indexOf("unblockedgames") !== -1 || link.indexOf("r?key=") !== -1) {
                let finalLink = await bypassHrefli(link);
                if (finalLink && (finalLink.indexOf("driveseed") !== -1 || finalLink.indexOf("driveleech") !== -1)) {
                    let streams = await extractDriveseedPage(finalLink);
                    allStreams = allStreams.concat(streams);
                }
            }
        }
    }

    return allStreams;
}

if (typeof module !== "undefined") {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
