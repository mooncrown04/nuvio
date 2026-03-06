const cheerio = require("cheerio-without-node-native");
const CryptoJS = require("crypto-js");
const fs = require('fs');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8',
};

// CryptoJS AES Decrypt (CryptoJS formatına uygun)
function decryptCryptoJS(password, ciphertext) {
    try {
        const ctBytes = Buffer.from(ciphertext, 'base64');
        const salt = ctBytes.slice(8, 16);
        const ct = ctBytes.slice(16);
        
        const keySize = 256 / 32;
        const ivSize = 128 / 32;
        const targetKeySize = keySize + ivSize;
        const derivedBytes = Buffer.alloc(targetKeySize * 4);
        let numberOfDerivedWords = 0;
        let block = null;
        
        const passwordBytes = Buffer.from(password, 'utf8');
        
        while (numberOfDerivedWords < targetKeySize) {
            if (block) {
                block = Buffer.concat([block, passwordBytes, salt]);
            } else {
                block = Buffer.concat([passwordBytes, salt]);
            }
            
            block = Buffer.from(require('crypto').createHash('md5').update(block).digest());
            
            const copyLength = Math.min(block.length, (targetKeySize - numberOfDerivedWords) * 4);
            block.copy(derivedBytes, numberOfDerivedWords * 4, 0, copyLength);
            numberOfDerivedWords += block.length / 4;
        }
        
        const key = derivedBytes.slice(0, keySize * 4);
        const iv = derivedBytes.slice(keySize * 4, keySize * 4 + ivSize * 4);
        
        const decipher = require('crypto').createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(ct);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        
        return decrypted.toString('utf8');
    } catch (e) {
        console.log("Decrypt hatası:", e.message);
        return null;
    }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (!tmdbId || !seasonNum || !episodeNum) {
        console.log("❌ Eksik parametreler");
        return [];
    }

    try {
        console.log(`\n=== ${seasonNum}.Sezon ${episodeNum}.Bölüm ===`);
        console.log(`[1/4] TMDB & DiziBox Hazırlanıyor...`);
        
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        
        const title = tmdbData.name || tmdbData.original_name;
        console.log("Dizi:", title);
        
        if (!title) return [];
        
        const slug = title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-1-izle/`;
        console.log("DiziBox URL:", epUrl);

        const mainRes = await fetch(epUrl, { headers: HEADERS });
        const mainHtml = await mainRes.text();
        const $ = cheerio.load(mainHtml);
        
        let iframeUrl = $('div#video-area iframe').attr('src');
        if (!iframeUrl) {
            console.log("❌ Ana iframe bulunamadı");
            return [];
        }
        
        iframeUrl = iframeUrl.startsWith('//') ? 'https:' + iframeUrl : iframeUrl;
        console.log("Ana Player URL:", iframeUrl);

        if (iframeUrl.includes('/player/king/king.php')) {
            console.log(`[2/4] King.php Katmanı...`);
            
            const kingUrl = iframeUrl.replace('king.php?v=', 'king.php?wmode=opaque&v=');
            console.log("King URL:", kingUrl);
            
            const kingRes = await fetch(kingUrl, { 
                headers: { 
                    ...HEADERS, 
                    'Referer': epUrl 
                } 
            });
            const kingHtml = await kingRes.text();
            const $king = cheerio.load(kingHtml);
            
            const innerFrame = $king('div#Player iframe').attr('src');
            if (!innerFrame) {
                console.log("❌ King içinde iframe bulunamadı");
                return [];
            }
            
            const innerUrl = innerFrame.startsWith('//') ? 'https:' + innerFrame : innerFrame;
            console.log("İç Player URL:", innerUrl);

            console.log(`[3/4] Şifreleme Çözülüyor...`);
            
            const innerRes = await fetch(innerUrl, { 
                headers: { 
                    ...HEADERS, 
                    'Referer': 'https://www.dizibox.live/' 
                } 
            });
            const innerHtml = await innerRes.text();

            // Debug: HTML'i kaydet
            fs.writeFileSync('debug_inner.html', innerHtml);
            console.log("HTML debug_inner.html'e kaydedildi");

            const cryptDataMatch = innerHtml.match(/CryptoJS\.AES\.decrypt\("([^"]+)","/);
            const cryptPassMatch = innerHtml.match(/","([^"]+)"\);/);
            
            if (!cryptDataMatch || !cryptPassMatch) {
                console.log("❌ CryptoJS verileri bulunamadı");
                return [];
            }
            
            const cryptData = cryptDataMatch[1];
            const cryptPass = cryptPassMatch[1];
            
            console.log("Şifreli veri bulundu, çözülüyor...");
            
            const decrypted = decryptCryptoJS(cryptPass, cryptData);
            
            if (!decrypted) {
                console.log("❌ Şifre çözme başarısız");
                return [];
            }
            
            // Debug: Çözülen HTML'i kaydet
            fs.writeFileSync('debug_decrypted.html', decrypted);
            console.log("Çözülen HTML debug_decrypted.html'e kaydedildi");
            
            console.log(`[4/4] Çözülen HTML Analizi...`);

            // 🔍 ÇÖZÜLEN HTML'DE ARAMA YAP
            let m3u8Url = null;
            
            // 1. Direkt m3u8 ara
            m3u8Url = decrypted.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i)?.[1];
            if (m3u8Url) {
                console.log("✅ Direkt m3u8 bulundu");
            }
            
            // 2. Script src'lerinde ara (sheplayer.js vb.)
            if (!m3u8Url) {
                const scriptMatches = decrypted.match(/src=["'](https?:\/\/[^"']+\.js)["']/g);
                if (scriptMatches) {
                    console.log("Bulunan JS dosyaları:", scriptMatches.map(s => s.replace(/src=["']|["']/g, '')));
                    
                    // sheplayer.js'i indir ve incele
                    const sheplayerMatch = decrypted.match(/src=["'](https?:\/\/[^"']*sheplayer[^"']*)["']/i);
                    if (sheplayerMatch) {
                        const sheplayerUrl = sheplayerMatch[1];
                        console.log("sheplayer.js bulundu:", sheplayerUrl);
                        
                        try {
                            const sheplayerRes = await fetch(sheplayerUrl, { headers: HEADERS });
                            const sheplayerJs = await sheplayerRes.text();
                            fs.writeFileSync('debug_sheplayer.js', sheplayerJs);
                            console.log("sheplayer.js indirildi ve kaydedildi");
                            
                            // sheplayer.js içinde m3u8 pattern'i ara
                            const jsM3u8 = sheplayerJs.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i)?.[1];
                            if (jsM3u8) {
                                console.log("sheplayer.js içinde m3u8 bulundu!");
                                m3u8Url = jsM3u8;
                            }
                        } catch(e) {
                            console.log("sheplayer.js indirilemedi:", e.message);
                        }
                    }
                }
            }
            
            // 3. API endpoint'leri ara
            if (!m3u8Url) {
                const apiMatches = decrypted.match(/(https?:\/\/[^"'\s]*(?:api|get|video|stream)[^"'\s]*)/gi);
                if (apiMatches) {
                    console.log("Bulunan API/Stream URL'leri:", [...new Set(apiMatches)].slice(0, 5));
                    
                    // Her bir API'yi dene
                    for (const apiUrl of [...new Set(apiMatches)].slice(0, 3)) {
                        try {
                            console.log("API test ediliyor:", apiUrl);
                            const apiRes = await fetch(apiUrl, { 
                                headers: { 
                                    ...HEADERS, 
                                    'Referer': innerUrl 
                                },
                                timeout: 5000
                            });
                            const apiText = await apiRes.text();
                            
                            if (apiText.includes('.m3u8')) {
                                const apiM3u8 = apiText.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i)?.[1];
                                if (apiM3u8) {
                                    console.log("✅ API'den m3u8 bulundu!");
                                    m3u8Url = apiM3u8;
                                    break;
                                }
                            }
                        } catch(e) {
                            // Devam et
                        }
                    }
                }
            }
            
            // 4. Base64 encoded veri ara
            if (!m3u8Url) {
                const b64Matches = decrypted.match(/["']([a-zA-Z0-9+/=]{50,})["']/g);
                if (b64Matches) {
                    console.log("Base64 veriler bulundu, decode ediliyor...");
                    for (const match of b64Matches.slice(0, 5)) {
                        try {
                            const clean = match.replace(/["']/g, '');
                            const decoded = Buffer.from(clean, 'base64').toString('utf-8');
                            if (decoded.includes('.m3u8') || decoded.includes('http')) {
                                console.log("Base64 decode edildi:", decoded.substring(0, 100));
                                const decodedM3u8 = decoded.match(/(https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)/i)?.[1];
                                if (decodedM3u8) {
                                    m3u8Url = decodedM3u8;
                                    break;
                                }
                            }
                        } catch(e) {}
                    }
                }
            }

            if (m3u8Url) {
                console.log(`[BAŞARILI] M3U8 Bulundu: ${m3u8Url}`);
                return [{
                    name: "DiziBox | MolyStream",
                    url: m3u8Url,
                    quality: "1080p",
                    headers: { 
                        'Referer': 'https://dbx.molystream.org/',
                        'Origin': 'https://dbx.molystream.org'
                    }
                }];
            } else {
                console.log("❌ M3U8 bulunamadı");
                console.log("Çözülen HTML (ilk 1000 karakter):", decrypted.substring(0, 1000));
            }
        }
        
        console.log("⚠️ Stream bulunamadı");
        return [];

    } catch (err) {
        console.error("❌ Hata:", err.message);
        return [];
    }
}

module.exports = { getStreams };
