/**
 * DiziPal 1543 - Slash & UTF8 Fix
 */

var PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

function decryptData(rawContent) {
    try {
        if (typeof CryptoJS === 'undefined') return null;

        // 1. JSON karakter hatalarini ve ters slashlari temizle
        let clean = rawContent.replace(/&quot;/g, '"').replace(/\\\//g, '/').trim();
        
        // 2. Degerleri cimbizla çek
        const ct = clean.match(/"ciphertext"\s*:\s*"([^"]+)"/)?.[1];
        const iv = clean.match(/"iv"\s*:\s*"([^"]+)"/)?.[1];
        const salt = clean.match(/"salt"\s*:\s*"([^"]+)"/)?.[1];

        if (!ct || !iv || !salt) return null;

        // 3. PBKDF2 ile Key olustur
        const key = CryptoJS.PBKDF2(PASSPHRASE, CryptoJS.enc.Hex.parse(salt), {
            keySize: 256 / 32,
            iterations: 999,
            hasher: CryptoJS.algo.SHA512
        });

        // 4. AES Decrypt
        const decrypted = CryptoJS.AES.decrypt(ct, key, {
            iv: CryptoJS.enc.Hex.parse(iv),
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC
        });

        // 5. UTF8 hatasini onlemek icin önce Latin1 dene, sonra Utf8
        let result = "";
        try {
            result = decrypted.toString(CryptoJS.enc.Utf8);
        } catch (e) {
            result = decrypted.toString(CryptoJS.enc.Latin1);
        }

        // 6. Son temizlik (URL basindaki tırnakları ve gereksiz kacislari sil)
        return result ? result.replace(/[\\"]/g, "").trim() : null;

    } catch (e) {
        console.error(`[DiziPal] Decrypt Islemi Patladi: ${e.message}`);
        return null;
    }
}
