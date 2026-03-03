async function resolveHlsSource(embedUrl) {
    try {
        const res = await fetch(embedUrl, { 
            headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.fullhdfilmizlesene.live/" } 
        });
        const html = await res.text();

        // 1. Şifreli RapidVid verisini çöz (K9L anahtarı ile) [cite: 45, 46]
        const avMatch = /av\('([^']+)'\)/.exec(html);
        if (avMatch && avMatch[1]) {
            const decoded = rapidDecode(avMatch[1]);
            if (decoded) {
                // Link m3u8 içermiyorsa bile oynatıcıya bunun m3u8 olduğunu söyleyecek yapı
                return decoded.includes('.m3u8') ? decoded : `${decoded}/index.m3u8`;
            }
        }

        // 2. Sayfa içinde direkt m3u8 ara [cite: 38, 80]
        const m3u8Match = /["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/i.exec(html);
        if (m3u8Match) return m3u8Match[1].replace(/\\/g, '');

        return embedUrl;
    } catch (e) {
        return embedUrl;
    }
}
