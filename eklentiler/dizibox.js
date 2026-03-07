/**
 * Provider: Dizigom
 * Mantık: Arama tabanlı URL tespiti ve Iframe/Moly ayıklama
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    const BASE_URL = 'https://dizigom104.com';
    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': BASE_URL + '/'
    };

    return new Promise(async (resolve) => {
        if (mediaType !== 'tv') return resolve([]);

        try {
            // 1. TMDB'den ismi al ve temizle
            const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
            const tmdbData = await tmdbRes.json();
            const query = (tmdbData.name || tmdbData.original_name).split(':')[0].trim();
            
            console.log(`[Dizigom] Aranıyor: ${query}`);

            // 2. Sitede arama yap (Doğru slug'ı bulmak için)
            const searchRes = await fetch(`${BASE_URL}/?s=${encodeURIComponent(query)}`, { headers: HEADERS });
            const searchHtml = await searchRes.text();
            
            // Arama sonuçlarından ilk dizi linkini yakala
            const linkMatch = searchHtml.match(/href="(https:\/\/dizigom104\.com\/dizi\/[^"]+)"/i);
            if (!linkMatch) throw new Error('Dizi bulunamadı');

            const showUrl = linkMatch[1].replace(/\/$/, '');
            const epUrl = `${showUrl}-${seasonNum}-sezon-${episodeNum}-bolum/`;
            
            console.log(`[Dizigom] Hedef URL: ${epUrl}`);

            // 3. Bölüm sayfasını çek
            let epRes = await fetch(epUrl, { headers: HEADERS });
            
            // Eğer 404 ise HD1 varyasyonunu dene
            if (epRes.status === 404) {
                console.log('[Dizigom] 404 Alındı, HD1 deneniyor...');
                epRes = await fetch(`${epUrl.replace(/\/$/, '')}-hd1/`, { headers: HEADERS });
            }

            const html = await epRes.text();
            const streams = [];

            // 4. Video kaynaklarını ayıkla (Regex ile)
            const videoRegex = /src="([^"]*(?:vidmoly|moly|player|embed|ok\.ru)[^"]*)"/gi;
            let match;
            while ((match = videoRegex.exec(html)) !== null) {
                let src = match[1];
                if (src.startsWith('//')) src = 'https:' + src;
                
                // Gereksiz/Reklam linkleri filtrele
                if (src.includes('google') || src.includes('facebook')) continue;

                streams.push({
                    name: `Dizigom | ${src.includes('moly') ? 'MolyStream' : 'Kaynak'}`,
                    url: src,
                    quality: '1080p',
                    headers: { 'Referer': BASE_URL + '/' }
                });
            }

            console.log(`[Dizigom] Bitti. Link: ${streams.length}`);
            resolve(streams);

        } catch (err) {
            console.error(`[Dizigom] Hata: ${err.message}`);
            resolve([]);
        }
    });
}

// Global Export
if (typeof module !== 'undefined') { module.exports = { getStreams }; }
globalThis.getStreams = getStreams;
