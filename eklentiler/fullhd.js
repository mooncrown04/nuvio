/* --- YARDIMCI FONKSİYONLAR --- */

function atobSafe(s) {
    try {
        var str = String(s).replace(/\s/g, '');
        while (str.length % 4 !== 0) str += '=';
        var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var output = '';
        var bc = 0, bs, buffer, idx = 0;
        while (buffer = str.charAt(idx++)) {
            buffer = chars.indexOf(buffer);
            if (buffer === -1) continue;
            bs = bc % 4 ? bs * 64 + buffer : buffer;
            if (bc++ % 4) output += String.fromCharCode(255 & bs >> (-2 * bc & 6));
        }
        return output;
    } catch (e) { return ''; }
}

function decodeRapidLink(encoded) {
    try {
        var reversed = encoded.split('').reverse().join('');
        var step1 = atobSafe(reversed);
        if (!step1) return null;
        var key = 'K9L';
        var output = '';
        for (var i = 0; i < step1.length; i++) {
            var r = key.charCodeAt(i % 3);
            var n = step1.charCodeAt(i) - (r % 5 + 1);
            output += String.fromCharCode(n);
        }
        return atobSafe(output);
    } catch (e) { return null; }
}

/* --- ANA EKLENTİ YAPISI --- */

const FHD = {
    baseUrl: "https://www.fullhdfilmizlesene.tv",
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': "https://www.fullhdfilmizlesene.tv/"
    },

    // 1. ANA SAYFA (PHP sayfalama mantığı burada)
    async home(page = 1) {
        const url = `${this.baseUrl}/filmizle/turkce-dublaj-filmler-hd-izle/${page}`;
        const html = await fetch(url, { headers: this.headers }).then(res => res.text());
        const blocks = html.match(/<li\s+class="film"([\s\S]*?)<\/li>/g) || [];
        
        return blocks.map(block => {
            const linkMatch = block.match(/href="https?:\/\/www\.fullhdfilmizlesene\.tv\/film\/([^"']+)"/);
            const nameMatch = block.match(/class="tt"[^>]*>([\s\S]*?)<\/a>/);
            const logoMatch = block.match(/data-srcset="([^"']+)"/) || block.match(/data-src="([^"']+)"/);
            
            let logo = logoMatch ? logoMatch[1].split(',')[0].trim().split(' ')[0] : "";
            if (logo.startsWith('//')) logo = 'https:' + logo;

            return {
                name: nameMatch ? nameMatch[1].replace(/izle|İzle/gi, "").trim() : "Bilinmeyen Film",
                url: linkMatch ? linkMatch[1] : "",
                poster: logo
            };
        });
    },

    // 2. FİLM DETAY / SOURCE YÜKLEME
    async loadSources(filmId) {
        try {
            // Film sayfasından vidid'yi çek
            const filmPage = await fetch(`${this.baseUrl}/film/${filmId}/`, { headers: this.headers }).then(res => res.text());
            const vidIdMatch = filmPage.match(/vidid = '(.*?)'/);
            if (!vidIdMatch) return [];

            const vidId = vidIdMatch[1];
            let streams = [];

            // --- ATOM (RAPIDVID) ÇÖZÜCÜ ---
            const atomRes = await fetch(`${this.baseUrl}/player/api.php?id=${vidId}&type=t&name=atom&get=video&format=json`, { headers: this.headers }).then(res => res.json());
            if (atomRes && atomRes.html) {
                const atomEmbedUrl = atomRes.html.replace(/\\/g, '');
                const atomHtml = await fetch(atomEmbedUrl, { headers: this.headers }).then(res => res.text());
                const avMatch = atomHtml.match(/file":\s*av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    const finalUrl = decodeRapidLink(avMatch[1]);
                    if (finalUrl) {
                        streams.push({
                            name: "RapidVid (Atom)",
                            url: finalUrl,
                            quality: "1080p",
                            headers: { "Referer": "https://rapidvid.net/", "User-Agent": "okhttp/4.12.0" }
                        });
                    }
                }
            }

            // --- TURBO ÇÖZÜCÜ ---
            const turboRes = await fetch(`${this.baseUrl}/player/api.php?id=${vidId}&type=t&name=advid&get=video&pno=tr&format=json`, { headers: this.headers }).then(res => res.json());
            if (turboRes && turboRes.html) {
                const turboSlugMatch = turboRes.html.match(/\/watch\/(.*?)"/);
                if (turboSlugMatch) {
                    const turboSlug = turboSlugMatch[1];
                    const turboPage = await fetch(`https://turbo.imgz.me/play/${turboSlug}?autoplay=true`, { headers: this.headers }).then(res => res.text());
                    const m3u8Match = turboPage.match(/file: "(.*?)"/);
                    if (m3u8Match) {
                        streams.push({
                            name: "Turbo",
                            url: m3u8Match[1],
                            quality: "Auto",
                            headers: { "Referer": "https://turbo.imgz.me/", "User-Agent": "okhttp/4.12.0" }
                        });
                    }
                }
            }

            return streams;
        } catch (e) {
            return [];
        }
    }
};
