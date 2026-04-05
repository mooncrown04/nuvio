var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/nuvio_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "6.0.0-FIXED";

let cachedM3U = null;
let lastFetch = 0;

/**
 * Metni temizler: Türkçe karakterleri dönüştürür, küçük harfe çevirir 
 * ve harf/rakam dışındaki her şeyi siler.
 */
function ultraClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

async function getStreams(tmdbId, mediaType) {
    // Sadece film araması yapar
    if (mediaType === 'tv') return [];

    try {
        // 1. TMDb'den film bilgilerini al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const targetTr = ultraClean(d.title);
        const targetEn = ultraClean(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        console.error(`[V${VERSION}] ARANAN: ${d.title} (${targetYear})`);

        // 2. M3U Listesini indir veya Cache'den al
        const now = Date.now();
        if (!cachedM3U || (now - lastFetch > 300000)) {
            const m3uRes = await fetch(M3U_URL);
            let rawText = await m3uRes.text();
            // Satır sonlarını standardize et ve görünmez karakterleri temizle
            cachedM3U = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\uFEFF/, ''); 
            lastFetch = now;
            console.error(`[V${VERSION}] M3U GÜNCELLENDİ.`);
        }

        // 3. Satır satır tara
        const lines = cachedM3U.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const results = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            if (line.startsWith("#EXTINF")) {
                let nextLine = lines[i + 1] || "";
                
                if (nextLine.startsWith("http")) {
                    // M3U satırından film ismini ayıkla
                    let parts = line.split(',');
                    let rawName = parts[parts.length - 1].trim();
                    
                    // --- AKILLI TEMİZLİK ---
                    // İsimdeki "-Aksiyon", "(2024)" gibi takıları geçici olarak temizle
                    let cleanNameOnly = rawName.split('-')[0].split('(')[0].trim();
                    let cleanM3U = ultraClean(cleanNameOnly);
                    
                    // --- YIL BULMA MANTIĞI ---
                    // Önce 'year="2024"' etiketine bak, yoksa isimdeki yıla bak, o da yoksa linkteki yıla bak
                    let tagYearMatch = line.match(/year="(\d{4})"/);
                    let nameYearMatch = rawName.match(/(\d{4})/);
                    let urlYearMatch = nextLine.match(/(\d{4})/);
                    
                    let m3uYear = tagYearMatch ? tagYearMatch[1] : 
                                 (nameYearMatch ? nameYearMatch[1] : 
                                 (urlYearMatch ? urlYearMatch[1] : ""));

                    let isMatch = false;
                    let score = 0;

                    // EŞLEŞME KONTROLLERİ
                    // A. Tam İsim Eşleşmesi
                    if (cleanM3U === targetTr || cleanM3U === targetEn) {
                        isMatch = true;
                        score = (m3uYear === targetYear) ? 100 : 90;
                    } 
                    // B. İçerme (Esnek) Eşleşmesi
                    else if (cleanM3U.includes(targetTr) || (targetEn && cleanM3U.includes(targetEn))) {
                        // Eğer m3u'da bir yıl varsa ve hedefle tutuyorsa veya m3u'da yıl hiç yoksa
                        if (!m3uYear || m3uYear === targetYear) {
                            isMatch = true;
                            score = 80;
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
                    // URL satırını zaten işledik, bir sonraki satırı atlayarak hızı artır
                    i++; 
                }
            }
        }
        
        console.error(`[V${VERSION}] BULUNAN SONUÇ: ${results.length}`);
        
        // Sonuçları puana göre yüksekten düşüğe sırala
        return results.sort((a, b) => b.score - a.score);
        
    } catch (e) {
        console.error(`[V${VERSION}] HATA OLUŞTU: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
