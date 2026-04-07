"use strict";

// src/uhdmovies/index.js
var DOMAIN = "https://uhdmovies.rip";
var TMDB_API = "https://api.themoviedb.org/3";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// --- HELPERS ---
function getBaseUrl(url) {
    if (!url) return DOMAIN;
    var match = url.match(/^(https?:\/\/[^\/]+)/);
    return match ? match[1] : DOMAIN;
}

function stripTags(html) {
    return (html || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
}

// --- CORE LOGIC ---
async function getTmdbDetails(tmdbId, mediaType) {
    var isSeries = mediaType === "series" || mediaType === "tv";
    var endpoint = isSeries ? "tv" : "movie";
    var url = `${TMDB_API}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
    
    try {
        let res = await fetch(url);
        let data = await res.json();
        return {
            title: isSeries ? data.name : data.title,
            year: (isSeries ? data.first_air_date : data.release_date || "").slice(0, 4)
        };
    } catch (e) { return null; }
}

async function searchGlobal(title) {
    var query = encodeURIComponent(title.trim());
    var url = DOMAIN + "/?s=" + query;
    
    try {
        let res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        let html = await res.text();
        let results = [];
        let chunks = html.split(/<article/i);

        for (let i = 1; i < chunks.length; i++) {
            let chunk = chunks[i];
            let titleM = chunk.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
            if (!titleM) continue;

            let titleRaw = stripTags(titleM[1]);
            let hrefM = chunk.match(/href="([^"]+)"/i);
            
            if (hrefM && titleRaw) {
                results.push({ title: titleRaw, url: hrefM[1] });
            }
        }
        return results;
    } catch (e) { return []; }
}

// --- Dizi Bölüm Ayıklama (TV Episode Extraction) ---
function extractTvLinks(html, season, episode) {
    let links = [];
    // Sayfadaki tüm linkleri ve metinleri tara
    let re = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        let text = stripTags(m[2]).toLowerCase();
        let href = m[1];
        
        // S01E05 veya Episode 05 gibi kalıpları ara
        let epPattern = new RegExp(`(ep|episode|e)0?${episode}\\b`, "i");
        let seaPattern = new RegExp(`(s|season)0?${season}\\b`, "i");

        if (epPattern.test(text)) {
            links.push({ url: href, info: text });
        }
    }
    return links;
}

// --- MAIN FUNCTION ---
async function getStreams(tmdbId, mediaType, season, episode) {
    const isSeries = mediaType === "tv" || mediaType === "series";
    const tmdb = await getTmdbDetails(tmdbId, mediaType);
    if (!tmdb) return [];

    const searchResults = await searchGlobal(tmdb.title);
    if (searchResults.length === 0) return [];

    let finalStreams = [];

    // En alakalı ilk sonucu işle
    let targetPage = searchResults[0].url;
    let res = await fetch(targetPage, { headers: { "User-Agent": USER_AGENT } });
    let html = await res.text();

    let candidateLinks = [];

    if (isSeries) {
        // Dizi ise bölüme özel linkleri bul
        candidateLinks = extractTvLinks(html, season, episode);
    } else {
        // Film ise "Download" veya "G-Drive" butonlarını bul
        let re = /class="maxbutton-1"[^>]*href="([^"]+)"/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            candidateLinks.push({ url: m[1], info: "Movie Download" });
        }
    }

    // Linkleri Nuvio formatına çevir
    for (let linkObj of candidateLinks) {
        if (linkObj.url.includes("unblocked") || linkObj.url.includes("r?key=")) {
            // Not: Gerçek bir bypasser servisi burada final linki çözer.
            // Şimdilik direkt yönlendirme linkini veriyoruz.
            finalStreams.push({
                name: "UHD (Global)",
                title: (isSeries ? `S${season}E${episode}` : "Movie") + " - " + linkObj.info,
                url: linkObj.url,
                quality: "720p/1080p"
            });
        }
    }

    return finalStreams;
}

if (typeof module !== "undefined") module.exports = { getStreams };
