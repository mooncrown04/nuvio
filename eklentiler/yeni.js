// --- M3U KAYNAK YAPILANDIRMASI ---
// GitHub "main" dalındaki dosyalarınızın tam yolları
var M3U_SOURCES = [
    { range: /^[0-9]/i,    url: 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_0-9_rakam.m3u' },
    { range: /^[a-d]/i,    url: 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_a-d_arasi.m3u' },
    { range: /^[e-j]/i,    url: 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_e-j_arasi.m3u' },
    { range: /^[k-p]/i,    url: 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_k-p_arasi.m3u' },
    { range: /^[r-z]/i,    url: 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_r-z_arasi.m3u' }
];

// Hiçbir harf grubuna girmeyenler için yedek liste
var DEFAULT_M3U = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_diger.m3u';

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "9.5.0-ALPHABETIC-ROUTING";

let cachedM3U = {}; 
let lastFetch = {};

/**
 * Karakter temizleme fonksiyonu (Tam Eşleşme İçin)
 */
function ultraClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return [];

    try {
        // 1. TMDb'den film detaylarını al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const targetTr = ultraClean(d.title);
        const targetEn = ultraClean(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        // 2. Alfabetik Yönlendirme: İlk harfe göre hangi dosyayı indireceğiz?
        let selectedURL = DEFAULT_M3U;
        const firstChar = targetTr.charAt(0); // Temizlenmiş ismin ilk karakteri

        for (let source of M3U_SOURCES) {
            if (source.range.test(firstChar)) {
                selectedURL = source.url;
                break;
            }
        }

        console.error(`[V${VERSION}] ARA: ${d.title} | SEÇİLEN LİSTE: ${selectedURL}`);

        // 3. İlgili M3U dosyasını indir (Cache'le)
        const now = Date.now();
        if (!cachedM3U[selectedURL] || (now - (lastFetch[selectedURL] || 0) > 300000)) {
            const m3uRes = await fetch(selectedURL);
            let rawText = await m3uRes.text();
            cachedM3U[selectedURL] = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\uFEFF/, ''); 
            lastFetch[selectedURL] = now;
        }

        // 4. Tarama ve Eşleştirme
        const lines = cachedM3U[selectedURL].split('\n').filter(l => l.trim().length > 0);
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            
            if (line.startsWith("#EXTINF")) {
                let nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
                
                if (nextLine.startsWith("http")) {
                    let parts = line.split(',');
                    let rawName = parts[parts.length - 1].trim();
                    
                    // İsim temizliği (Ekleri at)
                    let cleanNameOnly = rawName.split('-')[0].split('(')[0].trim();
                    let cleanM3U = ultraClean(cleanNameOnly);
                    
                    // Yıl tespiti
                    let tagYear = line.match(/year="(\d{4})"/);
                    let nameYear = rawName.match(/(\d{4})/);
                    let m3uYear = tagYear ? tagYear[1] : (nameYear ? nameYear[1] : "");

                    // BİREBİR EŞLEŞME KONTROLÜ
                    if (cleanM3U === targetTr || cleanM3U === targetEn) {
                        // Yıl yanlışsa eliyoruz, yoksa veya doğruysa kabul ediyoruz
                        if (!(m3uYear && m3uYear !== targetYear)) {
                            results.push({
                                url: nextLine,
                                name: rawName,
                                title: `[M3U] ${rawName}`,
                                quality: "1080p",
                                score: (m3uYear === targetYear) ? 100 : 90
                            });
                        }
                    }
                    i++; // URL satırını atla
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
