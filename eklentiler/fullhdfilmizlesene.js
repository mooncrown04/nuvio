var BASE_URL = 'https://www.fullhdfilmizlesene.live';
// Eğer site izin veriyorsa HTTP üzerinden gitmek sertifika hatalarını (SSL Trust) çözer
var ALT_URL = 'http://www.fullhdfilmizlesene.live'; 

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,*/*;q=0.8',
    'Upgrade-Insecure-Requests': '1'
};

async function getStreams(tmdbId, mediaType) {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 6000); // Süreyi 6 saniyeye indirdik (Hız öncelikli)

    try {
        // 1. TMDB Verisi (Burası genelde sorun çıkarmaz ama timeout ekledik)
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96`, { signal: ctrl.signal });
        const movie = await tmdbRes.json();
        
        // 2. Arama (Sertifika hatası varsa HTTP dene)
        let searchUrl = `${BASE_URL}/arama/${encodeURIComponent(movie.title)}`;
        let response;
        try {
            response = await fetch(searchUrl, { headers: HEADERS, signal: ctrl.signal });
        } catch (e) {
            // HTTPS başarısız olursa HTTP dene
            response = await fetch(searchUrl.replace('https', 'http'), { headers: HEADERS, signal: ctrl.signal });
        }

        const html = await response.text();
        const filmMatch = html.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
        if (!filmMatch) return [];

        // 3. İçerik Sayfası
        const filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];
        const filmRes = await fetch(filmUrl, { headers: HEADERS, signal: ctrl.signal });
        const filmHtml = await filmRes.text();

        const scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) return [];

        const scxData = JSON.parse(scxMatch[1]);
        const results = [];

        // Hızlıca TR ve EN kaynakları tara
        ['tr', 'en'].forEach(lang => {
            if (scxData[lang]?.sx?.t) {
                const raw = Array.isArray(scxData[lang].sx.t) ? scxData[lang].sx.t[0] : Object.values(scxData[lang].sx.t)[0];
                const decoded = universalDecode(raw);

                if (decoded && !decoded.includes('.vtt')) {
                    // ExoPlayer'a header'ları "pipe" (|) ile gönderiyoruz
                    results.push({
                        name: `FHD - ${lang.toUpperCase()}`,
                        url: decoded + `|User-Agent=${encodeURIComponent(HEADERS['User-Agent'])}&Referer=${encodeURIComponent(BASE_URL + '/')}`,
                        quality: "1080p"
                    });
                }
            }
        });

        return results;

    } catch (err) {
        return [];
    } finally {
        clearTimeout(timeout);
    }
}

function universalDecode(s){try{var r=function(t){return t.replace(/[a-zA-Z]/g,function(e){return String.fromCharCode((e<="Z"?90:122)>=(e=e.charCodeAt(0)+13)?e:e-26)})};return atob(r(s).replace(/\s/g,""))}catch(e){return null}}

module.exports = { getStreams };
