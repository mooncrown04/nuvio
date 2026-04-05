// --- YENİ ALFABETİK KAYNAK YAPISI ---
var M3U_SOURCES = [
    { range: /^[0-9]/i,    url: 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_0_9_rakam.m3u' },
    { range: /^[a-d]/i,    url: 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_a_d_arasi.m3u' },
    { range: /^[e-j]/i,    url: 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_e_j_arasi.m3u' },
    { range: /^[k-p]/i,    url: 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_k_p_arasi.m3u' },
    { range: /^[r-z]/i,    url: 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_r_z_arasi.m3u' }
];

var DEFAULT_M3U = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_diger.m3u';

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "10.0.0-ALPHABETIC";

let cachedM3U = {}; // Artık bir obje (URL bazlı cache)
let lastFetch = {};

function ultraClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

// Alfabetik grup seçici yardımcı fonksiyon
function getSelectedURL(cleanTitle) {
    const firstChar = cleanTitle.charAt(0);
    for (let source of M3U_SOURCES) {
        if (source.range.test(firstChar)) return source.url;
    }
    return DEFAULT_M3U;
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        
        const targetImdb = d.external_ids ? d.external_ids.imdb_id : null;
        const targetTr = ultraClean(d.title);
        const targetEn = ultraClean(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        // --- KRİTİK DEĞİŞİKLİK: Doğru dosyayı seç ---
        const selectedURL = getSelectedURL(targetTr);
        console.error(`[V${VERSION}] ARA: ${targetTr} | HEDEF DOSYA: ${selectedURL.split('/').pop()}`);

        const now = Date.now();
        if (!cachedM3U[selectedURL] || (now - (lastFetch[selectedURL] || 0) > 300000)) {
            const m3uRes = await fetch(selectedURL);
            let rawText = await m3uRes.text();
            cachedM3U[selectedURL] = rawText.replace(/\r/g, '').replace(/^\uFEFF/, ''); 
            lastFetch[selectedURL] = now;
            console.error(`[V${VERSION}] ${selectedURL.split('/').pop()} indirildi.`);
        }

        const lines = cachedM3U[selectedURL].split('\n');
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF")) {
                let nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
                if (nextLine.startsWith("http")) {
                    let parts = line.split(',');
                    let rawName = parts[parts.length - 1].trim();
                    let cleanM3U = ultraClean(rawName);
                    let yearMatch = line.match(/year="(\d{4})"/);
                    let m3uYear = yearMatch ? yearMatch[1] : "";

                    let isMatch = false;
                    let score = 0;

                    if (targetImdb && nextLine.includes(targetImdb)) {
                        isMatch = true; score = 120;
                    } 
                    else if (cleanM3U === targetTr || cleanM3U === targetEn) {
                        isMatch = true;
                        score = (m3uYear === targetYear) ? 100 : 90;
                    } 
                    else if (cleanM3U.includes(targetTr) || (targetEn && cleanM3U.includes(targetEn))) {
                        if (!m3uYear || m3uYear === targetYear) {
                            isMatch = true; score = 80;
                        }
                    }

                    if (isMatch) {
                        results.push({
                            url: nextLine,
                            name: rawName,
                            title: `[M3U] ${rawName} ${m3uYear ? '('+m3uYear+')' : ''}`,
                            quality: "1080p",
                            score: score
                        });
                    }
                }
            }
        }
        
        return results.sort((a, b) => b.score - a.score);
    } catch (e) {
        console.error(`[V${VERSION}] HATA: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
