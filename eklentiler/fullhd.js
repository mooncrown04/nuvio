/* --- GÜVENLİ ÇÖZÜCÜLER --- */
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
    if (!encoded) return null;
    try {
        var reversed = encoded.split('').reverse().join('');
        var step1 = atobSafe(reversed);
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

/* --- ANA YAPI --- */
const FHD = {
    baseUrl: "https://www.fullhdfilmizlesene.tv",
    
    async loadSources(filmId) {
        let streams = [];
        try {
            // 1. ADIM: Film Sayfası
            const filmUrl = this.baseUrl + "/film/" + filmId + "/";
            const filmPage = await fetch(filmUrl).then(res => res.text());
            
            // vidid çekimi
            const vidIdMatch = filmPage.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
            if (!vidIdMatch) return []; 
            const vidId = vidIdMatch[1];

            // 2. ADIM: API Sorguları (Daha güvenli JSON işleme)
            // Önce Atom/RapidVid deneyelim
            try {
                const atomApi = this.baseUrl + "/player/api.php?id=" + vidId + "&type=t&name=atom&get=video&format=json";
                const atomResText = await fetch(atomApi).then(res => res.text());
                // JSON içindeki ters eğik çizgileri temizleyip objeye çevirelim
                const atomData = JSON.parse(atomResText.replace(/\\/g, ''));
                
                if (atomData && atomData.html) {
                    const atomHtml = await fetch(atomData.html).then(res => res.text());
                    const avMatch = atomHtml.match(/av\(['"]([^'"]+)['"]\)/);
                    if (avMatch) {
                        const finalUrl = decodeRapidLink(avMatch[1]);
                        if (finalUrl) {
                            streams.push({
                                name: "RapidVid",
                                url: finalUrl,
                                quality: 1080,
                                isM3u8: true
                            });
                        }
                    }
                }
            } catch (e) { /* Atom hatası */ }

            // 3. ADIM: Turbo Kaynağı
            try {
                const turboApi = this.baseUrl + "/player/api.php?id=" + vidId + "&type=t&name=advid&get=video&pno=tr&format=json";
                const turboResText = await fetch(turboApi).then(res => res.text());
                const turboData = JSON.parse(turboResText.replace(/\\/g, ''));

                if (turboData && turboData.html) {
                    const turboSlugMatch = turboData.html.match(/\/watch\/([^"']+)/);
                    if (turboSlugMatch) {
                        const turboPage = await fetch("https://turbo.imgz.me/play/" + turboSlugMatch[1]).then(res => res.text());
                        const m3u8Match = turboPage.match(/file:\s*"(https?[^"]+)"/);
                        if (m3u8Match) {
                            streams.push({
                                name: "Turbo",
                                url: m3u8Match[1],
                                quality: 720,
                                isM3u8: true
                            });
                        }
                    }
                }
            } catch (e) { /* Turbo hatası */ }

        } catch (globalError) {
            return [];
        }
        return streams;
    }
};
