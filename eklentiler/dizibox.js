const cheerio = require("cheerio-without-node-native");
const CryptoJS = require("crypto-js");

const BASE_URL = 'https://www.dizibox.live';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

// Arayüzün video oynatırken kullanacağı kritik headerlar
const STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://dbx.molystream.org/', // MolyStream genelde bunu bekler
    'Origin': 'https://dbx.molystream.org'
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        console.log('[DiziBox] İşlem başlıyor. TMDB:', tmdbId);

        // 1. TMDB Verisi ile Başlık Bulma
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'movie' ? 'movie' : 'tv'}/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        
        const title = tmdbData.name || tmdbData.title;
        const year = (tmdbData.first_air_date || tmdbData.release_date || '').substring(0, 4);
        const slug = (tmdbData.original_name || tmdbData.original_title || title)
            .toLowerCase().trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '');

        // 2. DiziBox Bölüm URL Oluşturma
        const targetUrl = mediaType === 'movie' 
            ? `${BASE_URL}/${slug}-izle/` 
            : `${BASE_URL}/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-1-izle/`;

        console.log('[DiziBox] Hedef URL:', targetUrl);

        // 3. Sayfa Kaynağından Player Bulma
        const mainHtml = await (await fetch(targetUrl, { headers: HEADERS })).text();
        const $ = cheerio.load(mainHtml);
        let playerIframe = $('div#video-area iframe').attr('src') || $('iframe[src*="player"]').attr('src');

        if (!playerIframe) {
            console.log('[DiziBox] Player bulunamadı.');
            return [];
        }
        playerIframe = playerIframe.startsWith('//') ? 'https:' + playerIframe : playerIframe;

        // 4. Sonuç Nesnesini İnşa Etme (DiziPal'daki gibi)
        // Not: King/Moly linki direkt m3u8 olmadığı için player'ı 'url' olarak veriyoruz.
        // Arayüzün bunu WebView'da açabilmesi için yapı bu şekilde olmalı.
        
        const results = [{
            name: '⌜ DiziBox ⌟ | MolyStream',
            title: `${title} (${year}) · 1080p`,
            url: playerIframe,
            quality: '1080p',
            size: 'Auto',
            headers: {
                'Referer': BASE_URL + '/',
                'User-Agent': HEADERS['User-Agent']
            },
            subtitles: [], // Dizibox genelde gömülü (hardcoded) altyazı kullanır
            provider: 'dizibox'
        }];

        console.log('[DiziBox] Arayüze gönderilen sonuç sayısı:', results.length);
        return results;

    } catch (err) {
        console.error('[DiziBox] Hata:', err.message);
        return [];
    }
}

module.exports = { getStreams };
