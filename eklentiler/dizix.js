/**
 * Nuvio Sinema Alfabetik Motoru - V11.7.0
 * Güncelleme: Başlıkta TMDB İsmi Gösterimi ve Kesin Eşleşme
 */

const BASE_DIR = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/main/nuvio_parcalari/';
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
const VERSION = "11.7.0-TMDB_TITLE_DISPLAY";

let cachedM3U = {}; 
let lastFetch = {};

function ultraClean(s) {
    if (!s) return '';
    return s.toString().toLowerCase()
        .replace(/[ıİ]/g, 'i').replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o')
        .replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g').replace(/[çÇ]/g, 'c')
        .replace(/[^a-z0-9]/g, '').trim();
}

function getTargetM3U(cleanTitle) {
    if (!cleanTitle) return BASE_DIR + 'nuvio_diger.m3u';
    const firstChar = cleanTitle.charAt(0);
    if (/[0-9]/.test(firstChar)) return BASE_DIR + 'nuvio_0_9_rakam.m3u';
    if (/[a-z]/.test(firstChar)) return BASE_DIR + `nuvio_${firstChar}.m3u`;
    return BASE_DIR + 'nuvio_diger.m3u';
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        
        // TMDB'den gelen resmi veriler
        const officialTitle = d.title || d.original_title; // Kullanıcıya gösterilecek temiz isim
        const targetImdb = d.external_ids ? d.external_ids.imdb_id : null;
        const targetTr = ultraClean(d.title);
        const targetEn = ultraClean(d.original_title);
        const targetYear = (d.release_date || '').slice(0, 4);

        const targetFiles = [...new Set([getTargetM3U(targetTr), getTargetM3U(targetEn)])];
        const results = [];

        for (const selectedURL of targetFiles) {
            const now = Date.now();
            if (!cachedM3U[selectedURL] || (now - (lastFetch[selectedURL] || 0) > 300000)) {
                const m3uRes = await fetch(selectedURL);
                if (m3uRes.ok) {
                    let rawText = await m3uRes.text();
                    cachedM3U[selectedURL] = rawText.replace(/\r/g, '').replace(/^\uFEFF/, '');
                    lastFetch[now] = now;
                } else continue;
            }

            const lines = cachedM3U[selectedURL].split('\n');

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                if (line.startsWith("#EXTINF")) {
                    let nextLine = lines[i + 1] ? lines[i + 1].trim() : "";
                    if (nextLine.startsWith("http")) {
                        
                        let fullAuthorMatch = line.match(/group-author="([^"]+)"/);
                        let sourceTag = fullAuthorMatch ? fullAuthorMatch[1] : "M3U";

                        let parts = line.split(',');
                        let rawName = parts[parts.length - 1].trim();
                        let cleanM3U = ultraClean(rawName.split('(')[0].split('-')[0]); 
                        
                        let yearMatch = line.match(/year="(\d{4})"/);
                        let m3uYear = yearMatch ? yearMatch[1] : (rawName.match(/\d{4}/) ? rawName.match(/\d{4}/)[0] : "");

                        let isMatch = false;
                        let score = 0;

                        // Kesin Eşleşme Mantığı
                        if (targetImdb && nextLine.includes(targetImdb)) {
                            isMatch = true;
                            score = 300;
                        } 
                        else if (cleanM3U === targetTr || cleanM3U === targetEn) {
                            isMatch = true;
                            score = 200;
                        }

                        if (isMatch) {
                            // Yıl kontrolü ile doğruluk sağla
                            if (m3uYear && targetYear) {
                                if (m3uYear === targetYear) {
                                    score += 100;
                                } else {
                                    score -= 150; // İsim aynı yıl farklıysa puanı kır (farklı versiyon veya yanlış film)
                                }
                            }

                            if (score > 0) {
                                results.push({
                                    url: nextLine,
                                    name: rawName,
                                    // ARTIK BURASI TMDB'DEKİ RESMİ İSİM GÖRÜNECEK
                                    title: `[NUVIO] ${officialTitle} ${targetYear ? '('+targetYear+')' : ''}`,
                                    quality: sourceTag, 
                                    score: score
                                });
                            }
                        }
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
