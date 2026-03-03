#!/usr/bin/env node
const cheerio = require('cheerio');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function getSource(url, referer = "") {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': referer || url,
                'Accept': '*/*'
            }
        });
        return await response.text();
    } catch (e) {
        console.log(`[HATA] Bağlantı kurulamadı: ${url}`);
        return null;
    }
}

/**
 * Sayfa içinde gizlenmiş M3U8 veya MP4 linklerini bulur
 */
function findLinksInScript(html) {
    // 1. Standart M3U8 linklerini ara
    // 2. Base64 ile şifrelenmiş olabilecek yapıları veya karmaşık tırnakları tara
    const regexList = [
        /["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/gi,
        /["'](https?:\/\/[^"']+\.mp4[^"']*)["']/gi,
        /file\s*:\s*["']([^"']+)["']/gi
    ];

    let foundLinks = new Set();
    regexList.forEach(reg => {
        let match;
        while ((match = reg.exec(html)) !== null) {
            if (match[1] && !match[1].includes('analytics')) {
                foundLinks.add(match[1].replace(/\\/g, '')); // Kaçış karakterlerini temizle
            }
        }
    });
    return Array.from(foundLinks);
}

async function startExtraction(targetUrl) {
    console.log(`[BAŞLADI] Kaynak taranıyor...`);
    
    const mainHtml = await getSource(targetUrl);
    if (!mainHtml) return;

    const $ = cheerio.load(mainHtml);
    
    // Sunucu listesini (iframe veya rcp butonları) bulalım
    let frames = [];
    $('iframe').each((i, el) => {
        let src = $(el).attr('src');
        if (src) frames.push(src.startsWith('//') ? 'https:' + src : src);
    });

    // Eğer iframe yoksa, data-hash veya butonları tara
    $('[data-hash], [data-url], .server-item').each((i, el) => {
        let val = $(el).attr('data-hash') || $(el).attr('data-url');
        if (val) frames.push(val);
    });

    console.log(`[BİLGİ] Bulunan olası kaynak sayısı: ${frames.length}`);

    for (let frameUrl of frames) {
        // Eğer URL tam değilse (sadece hash ise) site sonuna ekle
        let fullFrameUrl = frameUrl.includes('http') ? frameUrl : `${new URL(targetUrl).origin}/rcp/${frameUrl}`;
        
        console.log(`[DEBUG] İnceleniyor: ${fullFrameUrl}`);
        const frameHtml = await getSource(fullFrameUrl, targetUrl);
        
        if (frameHtml) {
            const videoLinks = findLinksInScript(frameHtml);
            if (videoLinks.length > 0) {
                console.log(`\n✅ BAŞARILI! Linkler bulundu:`);
                videoLinks.forEach(link => console.log(`🔗 Link: ${link}`));
            }
        }
    }
}

const url = process.argv[2];
if (url) {
    startExtraction(url);
} else {
    console.log("Kullanım: node dosya.js <film-url>");
}
