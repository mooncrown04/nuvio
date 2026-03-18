/**
 * DiziPal v59 - Target: A Knight of the Seven Kingdoms (ve benzeri yeni yapılar)
 * URL Format: /dizi/[slug]/sezon-[n]/bolum-[n]
 */

const cheerio = require("cheerio-without-node-native");

// Sabitler (Sitenin güncel haline göre güncellendi)
const BASE_URL = 'https://dizipal1227.com'; 
const PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept-Language': 'tr-TR,tr;q=0.9'
};

// Yardımcı Fonksiyonlar (Öncekiyle aynı mantık, hızlı ve güvenli)
const utils = {
    hexToBytes: (hex) => {
        let bytes = [];
        for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16));
        return bytes;
    },
    base64ToBytes: (b64) => {
        try {
            let bin = (typeof atob !== 'undefined') ? atob(b64.replace(/\\/g, '')) : Buffer.from(b64.replace(/\\/g, ''), 'base64').toString('binary');
            return Array.from(bin).map(c => c.charCodeAt(0));
        } catch (e) { return []; }
    },
    bytesToStr: (bytes) => bytes.map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '').join('')
};

// Şifre Çözme Motoru
function decryptDiziPal(cipher, ivHex, saltHex) {
    const ct = utils.base64ToBytes(cipher);
    const iv = utils.hexToBytes(ivHex);
    const passBytes = Array.from(PASSPHRASE).map(c => c.charCodeAt(0));

    // Farklı Salt ve Key varyasyonlarını sırayla dene
    const variations = [
        (s) => utils.hexToBytes(s), // Direct Hex
        (s) => utils.hexToBytes(s.toUpperCase()), // Upper Hex
        (s) => utils.hexToBytes(s.split('').reverse().join('')) // Reverse Hex
    ];

    for (let variant of variations) {
        let salt = variant(saltHex);
        if (!salt.length) continue;

        // Key Derivation (Simple XOR ve Full Mix)
        let keys = [
            salt.slice(0, 32).map((b, i) => b ^ passBytes[i % passBytes.length]),
            Array.from({length: 32}, (_, i) => (salt[i % salt.length] + passBytes[i % passBytes.length]) & 0xff)
        ];

        for (let key of keys) {
            let res = ct.map((b, i) => b ^ key[i % key.length] ^ iv[i % iv.length]);
            let decoded = utils.bytesToStr(res);
            
            if (decoded.includes('http')) {
                let match = decoded.match(/https?:\/\/[^\s"']+/);
                if (match) return match[0];
            }
        }
    }
    return null;
}

// Ana Fonksiyon
async function getDizipalSource(customPath) {
    try {
        // Dinamik URL oluşturma (Örn: /dizi/a-knight-of-the-seven-kingdoms/sezon-1/bolum-4)
        const targetUrl = customPath.startsWith('http') ? customPath : `${BASE_URL}${customPath}`;
        
        const response = await fetch(targetUrl, { headers: HEADERS });
        const html = await response.text();
        const $ = cheerio.load(html);

        const jsonData = $('div[data-rm-k=true]').text();
        if (!jsonData) return { error: "Encrypted data not found" };

        const { ciphertext, iv, salt } = JSON.parse(jsonData);
        const sourceUrl = decryptDiziPal(ciphertext, iv, salt);

        if (sourceUrl) {
            return {
                provider: "DiziPal",
                url: sourceUrl,
                type: sourceUrl.includes('.m3u8') ? 'hls' : 'direct'
            };
        }
    } catch (err) {
        return { error: err.message };
    }
    return { error: "Decryption failed" };
}

// Kullanım Örneği:
// getDizipalSource('/dizi/a-knight-of-the-seven-kingdoms/sezon-1/bolum-4').then(console.log);

module.exports = { getDizipalSource };
