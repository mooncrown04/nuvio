var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "3.0.0-DEBUG";

function normalize(s) {
    if (!s) return '';
    return s.toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9]/g, '') 
        .trim();
}

async function getStreams(tmdbId, mediaType) {
    console.error(`[V${VERSION}] ARAMA BASLATILDI -> ID: ${tmdbId} | Tip: ${mediaType}`);
    if (mediaType === 'tv') return [];

    try {
        // 1. TMDB Verisi ve IMDb ID Çekme
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        
        const qTr = normalize(d.title);
        const qEn = normalize(d.original_title);
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null; 
        const year = (d.release_date || '').slice(0, 4);

        console.error(`[V${VERSION}] HEDEF: ${d.title} | TR: ${qTr} | EN: ${qEn} | IMDb: ${imdbId} | Yil: ${year}`);

        // 2. M3U İndirme
        const m3uRes = await fetch(M3U_URL);
        if (!m3uRes.ok) {
            console.error(`[V${VERSION}] KRITIK HATA: M3U indirilemedi! Statu: ${m3uRes.status}`);
            return [];
        }
        
        const text = await m3uRes.text();
        const lines = text.split('\n');
        const results = [];

        console.error(`[V${VERSION}] M3U OKUNDU. Toplam satir: ${lines.length}`);

        // 3. Satır Satır Analiz
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            if (line && line.includes('#EXTINF')) {
                const url = lines[i+1] ? lines[i+1].trim() : '';
                const lastCommaIndex = line.lastIndexOf(',');
                const m3uFullName = lastCommaIndex !== -1 ? line.substring(lastCommaIndex + 1).trim() : "ISIMSIZ";
                const m3uNameClean = normalize(m3uFullName);

                let score = 0;
                let matchReason = "";

                // --- EŞLEŞME KONTROLLERİ ---
                
                // IMDb Kontrolü
                if (imdbId && url.includes(imdbId)) {
                    score = 100;
                    matchReason = "IMDb ID Tam Eslesme";
                } 
                // TMDB ID Kontrolü
                else if (line.includes(tmdbId.toString())) {
                    score = 98;
                    matchReason = "TMDB ID Satirda Bulundu";
                }
                // İsim Kontrolü
                else if ( (qTr && m3uNameClean === qTr) || (qEn && m3uNameClean === qEn) ) {
                    score = 95;
                    matchReason = "Birebir Isim Eslesmesi";
                }
                // Kısmi İsim ve Yıl
                else if ( (qTr && m3uNameClean.includes(qTr)) || (qEn && m3uNameClean.includes(qEn)) ) {
                    score = 75;
                    matchReason = "Isim Iceriyor";
                    if (year && line.includes(year)) {
                        score += 15;
                        matchReason += " + Yil Bonusu";
                    }
                }

                // HER ADIMI LOGLA (Sadece puan alanları değil, neden elendiğini anlamak için)
                if (score > 0) {
                    console.error(`[V${VERSION}] BULDUM! -> ${m3uFullName} | Skor: ${score} | Neden: ${matchReason}`);
                    results.push({
                        url: url,
                        name: m3uFullName,
                        title: `[V${VERSION}] ${m3uFullName} (${score})`,
                        quality: "1080p",
                        score: score
                    });
                }
            }
        }

        if (results.length === 0) {
            console.error(`[V${VERSION}] UYARI: Hicbir eslesme bulunamadi.`);
        }

        return results.sort((a, b) => b.score - a.score);

    } catch (e) {
        console.error(`[V${VERSION}] BEKLENMEDIK HATA: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
