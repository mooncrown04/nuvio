// --- ALFABETİK KAYNAK YAPILANDIRMASI ---
// Python tarafında oluşan dosya isimleriyle birebir aynıdır.
var M3U_SOURCES = [
    { range: /^[0-9]/i,    url: 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_0_9_rakam.m3u' },
    { range: /^[a-d]/i,    url: 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_a_d_arasi.m3u' },
    { range: /^[e-j]/i,    url: 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_e_j_arasi.m3u' },
    { range: /^[k-p]/i,    url: 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_k_p_arasi.m3u' },
    { range: /^[r-z]/i,    url: 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_r_z_arasi.m3u' }
];

var DEFAULT_M3U = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_sinema_diger.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "10.5.0-STRICT-MATCH";

let cachedM3U = {}; 
let lastFetch = {};

/**
 * Karakter Temizleme: Harf gruplarını ve isimleri normalize eder.
 */
function ultraClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

/**
 * İsmin ilk harfine göre hangi M3U dosyasının indirileceğini seçer.
 */
function getSelectedURL(cleanTitle) {
    if (!cleanTitle) return DEFAULT_M3U;
    const firstChar = cleanTitle.charAt(0);
    for (let source of M3U_SOURCES) {
        if (source.range.test(firstChar)) return source.url;
    }
    return DEFAULT_M3U;
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return []; // Sadece sinema modülü

    try {
        // 1. TMDb'den Film Detaylarını Çek
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        
        const targetImdb = d.external_ids ? d.external_ids.imdb_id : null;
        const targetTr = ultraClean(d.title);
        const targetEn = ultraClean(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        // 2. Doğru M3U Parçasını Belirle
        const selectedURL = getSelectedURL(targetTr);
        console.error(`[V${VERSION}] ARA: ${d.title} (${targetYear}) | DOSYA: ${selectedURL.split('/').pop()}`);

        // 3. Dosyayı Cache'den veya Linkten Al
        const now = Date.now();
        if (!cachedM3U[selectedURL] || (now - (lastFetch[selectedURL] || 0) > 300000)) {
            const m3uRes = await fetch(selectedURL);
            let rawText = await m3uRes.text();
            // Satır sonu ve BOM temizliği
            cachedM3U[selectedURL] = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\uFEFF/, ''); 
            lastFetch[selectedURL] = now;
        }

        const lines = cachedM3U[selectedURL].split('\n').filter(l => l.trim().length > 0);
        const results = [];

        // 4. M3U İçinde Kesin Eşleşme Tara
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            
            if (line.startsWith("#EXTINF")) {
                let nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
                
                if (nextLine.startsWith("http")) {
                    let parts = line.split(',');
                    let rawName = parts[parts.length - 1].trim();
                    
                    // M3U ismindeki (2024) gibi yıl eklerini ve tür takılarını temizle
                    let cleanM3U = ultraClean(rawName.split('(')[0].split('-')[0].split('--')[0]);
                    
                    // Yıl tespiti (Önce tag'e, sonra isme bak)
                    let tagYearMatch = line.match(/year="(\d{4})"/);
                    let nameYearMatch = rawName.match(/(\d{4})/);
                    let m3uYear = tagYearMatch ? tagYearMatch[1] : (nameYearMatch ? nameYearMatch[1] : "");

                    let isMatch = false;
                    let score = 0;

                    // --- EŞLEŞME KURALLARI ---
                    
                    // KURAL A: IMDb ID eşleşmesi varsa (En kesin sonuç)
                    if (targetImdb && nextLine.includes(targetImdb)) {
                        isMatch = true;
                        score = 120;
                    } 
                    // KURAL B: İsim Tam Eşleşmeli (Tr veya En)
                    else if (cleanM3U === targetTr || cleanM3U === targetEn) {
                        // Yıl bilgisi varsa ve TMDb yılıyla uyuşmuyorsa ele (Yanlış film gelmesin)
                        if (m3uYear && m3uYear !== targetYear) {
                            isMatch = false;
                        } else {
                            isMatch = true;
                            score = (m3uYear === targetYear) ? 100 : 90;
                        }
                    }

                    if (isMatch) {
                        results.push({
                            url: nextLine,
                            name: rawName,
                            title: `[NUVIO] ${rawName}`,
                            quality: "1080p",
                            score: score
                        });
                    }
                    i++; // URL satırını atla
                }
            }
        }
        
        // 5. En yüksek puanlıları başa al
        return results.sort((a, b) => b.score - a.score);
        
    } catch (e) {
        console.error(`[V${VERSION}] HATA: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
