// ============================================================
//  HDFilmCehennemi — Optimized Scraper (Error Log Enabled)
// ============================================================

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var PRIMARY_DOMAIN = 'https://www.hdfilmcehennemi.nl';

// Nuvio ve HDFC için optimize edilmiş header seti
var BASE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'fetch',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty'
};

// --- Hata Yakalama ve Loglama Sistemi ---
function logError(tag, message, error) {
    var errDesc = error ? (error.stack || error.message) : '';
    console.error(`[${tag}] ❌ HATA: ${message} | Detay: ${errDesc}`);
}

// --- SSL Bypass Trick (Playmix & Nuvio CDN için) ---
function getFetchOpts(customHeaders) {
    return {
        headers: Object.assign({}, BASE_HEADERS, customHeaders),
        method: 'GET'
    };
}

// --- Arama Fonksiyonu (Düzeltilmiş) ---
async function searchSite(query) {
    try {
        // HDFC araması için Referer ŞART
        var url = `${PRIMARY_DOMAIN}/search?q=${encodeURIComponent(query)}`;
        var opts = getFetchOpts({ 'Referer': PRIMARY_DOMAIN + '/' });

        console.log(`[SEARCH] Arama başlatıldı: ${query}`);
        
        var response = await fetch(url, opts);
        if (!response.ok) {
            logError("SEARCH", `HTTP Hatası: ${response.status} - ${response.statusText}`);
            return [];
        }

        var data = await response.json();
        if (!data.results || data.results.length === 0) {
            console.error("[SEARCH] ⚠️ Sunucu boş sonuç döndürdü (Cloudflare engeli olabilir).");
            return [];
        }

        // HTML içinden linkleri çekme (Regex iyileştirildi)
        return data.results.map(html => {
            var href = html.match(/href="([^"]+)"/)?.[1];
            var title = html.match(/title="([^"]+)"/)?.[1] || html.match(/<h4>([^<]+)<\/h4>/)?.[1];
            return { href, title: title?.trim() };
        }).filter(item => item.href);

    } catch (e) {
        logError("SEARCH", "Arama isteği başarısız oldu", e);
        return [];
    }
}

// --- Video ID ve Iframe Yakalama ---
async function getIframeUrl(pageUrl) {
    try {
        console.log(`[PAGE] Sayfa yükleniyor: ${pageUrl}`);
        var response = await fetch(pageUrl, getFetchOpts({ 'Referer': PRIMARY_DOMAIN + '/' }));
        var html = await response.text();

        // Nuvio/SineWix benzeri data-src yakalama
        var embedUrl = html.match(/data-src="(https:\/\/hdfilmcehennemi\.mobi\/video\/embed\/[^"]+)"/i)?.[1];
        
        if (!embedUrl) {
            // Alternatif: script içinde ara
            embedUrl = html.match(/iframe src="([^"]+)"/i)?.[1];
        }

        if (!embedUrl) {
            console.error("[PAGE] ❌ Embed player bulunamadı. Site yapısı değişmiş olabilir.");
            return null;
        }

        return embedUrl;
    } catch (e) {
        logError("PAGE", "Sayfa içeriği alınamadı", e);
        return null;
    }
}

// --- Stream Çıkarıcı (M3U8) ---
async function extractM3U8(embedUrl, originalPage) {
    try {
        console.log(`[EXTRACT] Player açılıyor: ${embedUrl}`);
        
        // Bu aşamada Nuvio'dan öğrendiğimiz 'Origin' header'ı kritik
        var opts = getFetchOpts({ 
            'Referer': originalPage,
            'Origin': 'https://hdfilmcehennemi.mobi' 
        });

        var response = await fetch(embedUrl, opts);
        var html = await response.text();

        // 1. JSON-LD veya Master.txt arama
        var m3u8Url = html.match(/["'](https?:\/\/[^"']+(?:master\.txt|\.m3u8)[^"']*)["']/i)?.[1];

        if (!m3u8Url) {
            console.error("[EXTRACT] ❌ M3U8 linki bulunamadı. Player korumalı olabilir.");
            return [];
        }

        console.log(`[SUCCESS] Yayın bulundu: ${m3u8Url}`);
        
        return [{
            name: "HDFC-Nuvio-Engine",
            url: m3u8Url,
            quality: "Auto",
            type: "hls",
            headers: { 'Referer': 'https://hdfilmcehennemi.mobi/', 'User-Agent': BASE_HEADERS['User-Agent'] }
        }];

    } catch (e) {
        logError("EXTRACT", "Stream çıkarma hatası", e);
        return [];
    }
}

// --- Ana Tetikleyici ---
async function getStreams(tmdbId, mediaType) {
    // 1. TMDB'den isim al (TmdbInfo fonksiyonun olduğunu varsayıyorum)
    // 2. searchSite(title) çağır
    // 3. getIframeUrl(bestMatch) çağır
    // 4. extractM3U8(iframe, pageUrl) çağır
}

if (typeof module !== 'undefined') module.exports = { getStreams };
