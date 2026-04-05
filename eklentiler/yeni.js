var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/nuvio_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "7.0.0-PRO";

let cachedM3U = null;
let lastFetch = 0;

/**
 * Karakter Normalizasyonu: 
 * Türkçe karakterleri (ı,ğ,ü,ş,ö,ç) İngilizce karşılıklarına çevirir,
 * küçük harf yapar ve harf/rakam dışındaki her şeyi siler.
 */
function ultraClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

async function getStreams(tmdbId, mediaType) {
    // Sadece film araması yap, dizileri engelle
    if (mediaType === 'tv') return [];

    try {
        // 1. TMDb Bilgilerini Çek
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const d = await tmdbRes.json();
        
        const targetTr = ultraClean(d.title);
        const targetEn = ultraClean(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        console.error(`[V${VERSION}] ARANIYOR: ${d.title} (${targetYear})`);

        // 2. M3U Listesini İndir / Önbellekten Getir
        const now = Date.now();
        if (!cachedM3U || (now - lastFetch > 300000)) {
            const m3uRes = await fetch(M3U_URL);
            let rawText = await m3uRes.text();
            // Satır sonu karakterlerini temizle ve standardize et
            cachedM3U = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\uFEFF/, ''); 
            lastFetch = now;
        }

        // Boş satırları filtrele ve tüm satırları diziye aktar
        const lines = cachedM3U.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const results = [];

        // 3. Arama Motoru
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            if (line.startsWith("#EXTINF")) {
                let nextLine = lines[i + 1] || "";
                
                if (nextLine.startsWith("http")) {
                    // M3U ismini ayıkla (virgülden sonrası)
                    let parts = line.split(',');
                    let rawName = parts[parts.length - 1].trim();
                    
                    // İsimdeki "-Aksiyon", "(2024)" gibi ekleri temizle
                    let cleanNameOnly = rawName.split('-')[0].split('(')[0].trim();
                    let cleanM3U = ultraClean(cleanNameOnly);
                    
                    // Yıl Tespiti (Etiket, İsim veya URL içinden)
                    let tagYear = line.match(/year="(\d{4})"/);
                    let nameYear = rawName.match(/(\d{4})/);
                    let urlYear = nextLine.match(/(\d{4})/);
                    let m3uYear = tagYear ? tagYear[1] : (nameYear ? nameYear[1] : (urlYear ? urlYear[1] : ""));

                    let isMatch = false;
                    let score = 0;

                    // --- KESİN EŞLEŞME MANTIĞI ---
                    // Temizlenmiş M3U ismi, TMDb Türkçe veya Orijinal ismiyle BİREBİR aynı olmalı
                    if (cleanM3U === targetTr || cleanM3U === targetEn) {
                        
                        // YIL KONTROLÜ: M3U'da bir yıl varsa ve hedefle uyuşmuyorsa ELE
                        if (m3uYear && m3uYear !== targetYear) {
                            isMatch = false;
                        } else {
                            isMatch = true;
                            // Yıl da tam tutuyorsa en yüksek puanı ver
                            score = (m3uYear === targetYear) ? 100 : 90;
                        }
                    }

                    if (isMatch) {
                        results.push({
                            url: nextLine,
                            name: rawName,
                            title: `[M3U] ${rawName}`,
                            quality: "1080p",
                            score: score
                        });
                    }
                    // URL satırını işlediğimiz için bir sonraki adımı atla
                    i++; 
                }
            }
        }
        
        console.error(`[V${VERSION}] BULUNAN: ${results.length} adet.`);
        
        // En yüksek puanlı (en doğru) sonucu en üste getir
        return results.sort((a, b) => b.score - a.score);
        
    } catch (e) {
        console.error(`[V${VERSION}] SİSTEM HATASI: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
