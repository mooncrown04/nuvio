"use strict";

// src/uhdmovies/index.js
var DOMAIN = "https://uhdmovies.rip";
var TMDB_API = "https://api.themoviedb.org/3";
var TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function getTmdbDetails(tmdbId, mediaType) {
    var isSeries = mediaType === "series" || mediaType === "tv";
    var endpoint = isSeries ? "tv" : "movie";
    // Orijinal isimleri almak için dili global (en-US) tutuyoruz
    var url = `${TMDB_API}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&language=en-US`;
    
    try {
        let res = await fetch(url);
        let data = await res.json();
        return {
            title: isSeries ? data.name : data.title,
            original_title: isSeries ? data.original_name : data.original_title,
            year: (isSeries ? data.first_air_date : data.release_date || "").slice(0, 4)
        };
    } catch (e) { return null; }
}

async function getStreams(tmdbId, mediaType, season, episode) {
    const tmdb = await getTmdbDetails(tmdbId, mediaType);
    if (!tmdb) return [];

    // Orijinal başlık ile arama yapıyoruz (En garanti sonuç)
    const searchQuery = tmdb.original_title || tmdb.title;
    const url = DOMAIN + "/?s=" + encodeURIComponent(searchQuery);
    
    try {
        let res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        let html = await res.text();
        
        // Arama sonuçlarından en uygun olanı bul (Yıl ve isim kontrolü)
        let results = html.split(/<article/i).slice(1).map(chunk => {
            let titleM = chunk.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
            let hrefM = chunk.match(/href="([^"]+)"/i);
            return {
                title: titleM ? titleM[1].replace(/<[^>]+>/g, "").trim() : "",
                url: hrefM ? hrefM[1] : ""
            };
        });

        // İsim benzerliğine göre filtrele
        let target = results.find(r => 
            r.title.toLowerCase().includes(searchQuery.toLowerCase())
        ) || results[0];

        if (!target) return [];

        // Hedef sayfaya girip linkleri tara
        let pageRes = await fetch(target.url, { headers: { "User-Agent": USER_AGENT } });
        let pageHtml = await pageRes.text();

        let finalStreams = [];
        let linkRe = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let m;

        while ((m = linkRe.exec(pageHtml)) !== null) {
            let href = m[1];
            let text = m[2].replace(/<[^>]+>/g, "").trim().toLowerCase();

            // SADECE GÜVENLİ LİNKLERİ AL (Download butonları veya Direct linkler)
            if (!href.includes("unblocked") && !href.includes("r?key=")) continue;

            // Dizi kontrolü
            if (mediaType === "tv" || mediaType === "series") {
                let epPattern = new RegExp(`(ep|episode|e)0?${episode}\\b`, "i");
                if (!epPattern.test(text) && !text.includes("zip") && !text.includes("pack")) continue;
            }

            // TÜRKÇE VEYA MULTİ DİL KONTROLÜ
            let isTurkish = text.includes("turkish") || text.includes(" tr ") || text.includes("multi");
            let languageLabel = isTurkish ? " [TR/MULTI]" : " [ENG]";

            finalStreams.push({
                name: "UHDMovies",
                title: (isTurkish ? "⭐ " : "") + target.title.split("|")[0].trim() + languageLabel,
                url: href,
                quality: text.includes("2160p") ? "4K" : text.includes("1080p") ? "1080p" : "720p"
            });
        }

        // Türkçe olanları listenin en başına taşı
        return finalStreams.sort((a, b) => b.title.includes("⭐") - a.title.includes("⭐"));

    } catch (e) {
        return [];
    }
}

if (typeof module !== "undefined") module.exports = { getStreams };
