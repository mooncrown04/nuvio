const axios = require('axios');
const cheerio = require('cheerio');

// 1. KAZIYICI: PornHub Mantığı (Sadeleştirilmiş)
async function getPornHubStream(id) {
    try {
        const embedUrl = `https://www.pornhub.com/embed/${id}`;
        const { data } = await axios.get(embedUrl);
        
        // Gönderdiğin kodun içindeki Regex mantığı
        const regexp = /videoUrl["']?\s*:\s*["']?(https?:\\?\/\\?\/[a-z]+\.phncdn\.com[^"']+)/gi;
        const match = regexp.exec(data);
        
        if (match && match[1]) {
            let url = match[1].replace(/[\\/]+/g, '/').replace(/(https?:\/)/, '$1/');
            return [{
                name: "PornHub - HD",
                url: url.startsWith('/') ? `https:${url}` : url,
                quality: "720p"
            }];
        }
    } catch (e) { return []; }
    return [];
}

// 2. KAZIYICI: SinemaCX Mantığı (Async/Await Versiyonu)
async function getSinemaCXStream(tmdbId, mediaType) {
    try {
        // TMDB'den isim al
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;
        const tmdbRes = await axios.get(tmdbUrl);
        const query = tmdbRes.data.title || tmdbRes.data.name;

        // Site içi arama
        const searchRes = await axios.get(`https://www.sinema.news/?s=${encodeURIComponent(query)}`);
        const $ = cheerio.load(searchRes.data);
        const targetUrl = $("div.icerik div.frag-k div.yanac a").first().attr("href");

        if (!targetUrl) return [];

        // İframe ve Video Çekme
        const pageRes = await axios.get(targetUrl);
        const $page = cheerio.load(pageRes.data);
        const iframeRaw = $page("iframe").first().attr("data-vsrc") || $page("iframe").first().attr("src");
        
        if (iframeRaw && iframeRaw.includes("player.filmizle.in")) {
            const videoId = iframeRaw.split("/").pop().split("?")[0];
            const apiRes = await axios.post(`https://player.filmizle.in/player/index.php?data=${videoId}&do=getVideo`, null, {
                headers: { 'X-Requested-With': 'XMLHttpRequest', 'Referer': iframeRaw }
            });
            
            if (apiRes.data.securedLink) {
                return [{
                    name: "SinemaCX - 1080p",
                    url: apiRes.data.securedLink,
                    quality: "1080p"
                }];
            }
        }
    } catch (e) { return []; }
    return [];
}
