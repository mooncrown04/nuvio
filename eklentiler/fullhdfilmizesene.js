#!/usr/bin/env node
const cheerio = require('cheerio');

// --- Ayarlar ---
const BASE_URL = 'https://www.fullhdfilmizlesene.live';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Gelişmiş Fetch Sarmalayıcı
 * Proton VPN veya benzeri korumalı ağlarda '403 Forbidden' almamak için 
 * doğru header ve referer bilgilerini ekler.
 */
async function smartFetch(url, referer = BASE_URL) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': referer,
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });

        if (!response.ok) {
            console.error(`[Hata] İstek başarısız: ${url} | Durum: ${response.status}`);
            return null;
        }

        return await response.text();
    } catch (error) {
        console.error(`[Network Hatası] ${url}:`, error.message);
        return null;
    }
}

/**
 * M3U8 Linklerini ve Kalitelerini Ayıklar
 */
function parseM3U8(content, baseUrl) {
    const lines = content.split('\n');
    const streams = [];
    
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('RESOLUTION=')) {
            const qualityMatch = lines[i].match(/RESOLUTION=\d+x(\d+)/);
            const quality = qualityMatch ? qualityMatch[1] + 'p' : 'Auto';
            const streamUrl = lines[i + 1].trim();
            
            // Eğer URL bağıl (relative) ise tam URL'ye çevir
            const fullUrl = streamUrl.startsWith('http') ? streamUrl : new URL(streamUrl, baseUrl).href;
            
            streams.push({ quality, url: fullUrl });
        }
    }
    return streams.sort((a, b) => parseInt(b.quality) - parseInt(a.quality));
}

/**
 * Ana Sunucu Fonksiyonu (FullHDFilmizlesene Örneği İçin)
 */
async function extractVideoData(filmUrl) {
    console.log(`[İşlem] Film taranıyor: ${filmUrl}`);
    
    const html = await smartFetch(filmUrl);
    if (!html) return null;

    const $ = cheerio.load(html);
    const servers = [];

    // Sayfadaki iframe veya player kaynaklarını bulma (Örn: rcp/data-hash mantığı)
    // Paylaştığın kodun çalışma mantığını buraya entegre ediyoruz:
    $('.server-list .server').each((i, el) => {
        const hash = $(el).attr('data-hash');
        if (hash) {
            servers.push({
                name: $(el).text().trim(),
                url: `${BASE_URL}/rcp/${hash}`
            });
        }
    });

    const results = [];

    // Sunucuları paralel olarak tara
    const tasks = servers.map(async (server) => {
        const rcpHtml = await smartFetch(server.url, filmUrl);
        if (!rcpHtml) return;

        // Regex ile M3U8 veya kaynak dosyasını bul
        const fileRegex = /file:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i;
        const match = rcpHtml.match(fileRegex);

        if (match && match[1]) {
            const m3u8Url = match[1];
            const m3u8Content = await smartFetch(m3u8Url, server.url);
            
            if (m3u8Content) {
                const qualityStreams = parseM3U8(m3u8Content, m3u8Url);
                results.push({
                    server: server.name,
                    streams: qualityStreams
                });
            }
        }
    });

    await Promise.all(tasks);
    return results;
}

// --- Test Kullanımı ---
const targetUrl = process.argv[2]; // terminalden URL al: node script.js https://...
if (targetUrl) {
    extractVideoData(targetUrl).then(data => {
        console.log("=== BULUNAN KAYNAKLAR ===");
        console.log(JSON.stringify(data, null, 2));
    });
} else {
    console.log("Lütfen bir film URL'si belirtin: node dosyaadi.js <url>");
}
