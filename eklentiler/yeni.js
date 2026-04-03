// ============================================================
//  M3U Provider — Esnek Eşleştirme & Çoklu Link (v5.3)
// ============================================================

var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

// ── 1. Parse Fonksiyonu (Daha Akıllı Ayıklama) ────────────────
function parseExtInf(meta, url) {
    // URL içindeki tt1234567 yapısını her türlü (sonunda / olsa bile) yakalar
    var imdbMatch = url.match(/(tt\d+)/);
    var imdbId = imdbMatch ? imdbMatch[1] : null;

    // year="2016" etiketini yakala
    var yearTagM = meta.match(/year="(\d{4})"/);
    var year = yearTagM ? yearTagM[1] : '';

    // Virgülden sonraki ham ismi al
    var titleRaw = meta.replace(/#EXTINF[^,]*,/, '').trim();

    // Eğer etiket yoksa isimdeki 4 haneli yılı bul (Dangal 2016 gibi)
    if (!year) {
        var yearM = titleRaw.match(/\d{4}/);
        year = yearM ? yearM[0] : '';
    }

    // İsmi temizle: Yılları, parantezleri ve tireleri at
    // "Dangal-Dram-Aile" -> "Dangal"
    var title = titleRaw.replace(/\d{4}/g, '')
                        .replace(/\(.*\)/g, '')
                        .split('-')[0]
                        .replace(/[:_]/g, ' ')
                        .trim();

    var authorM = meta.match(/group-author="([^"]+)"/);
    var groupM = meta.match(/group-title="([^"]+)"/);

    return {
        title: title,
        year: year,
        url: url,
        imdbId: imdbId,
        author: (authorM ? authorM[1] : 'M3U'),
        group: (groupM ? groupM[1] : 'Film')
    };
}

// ── 2. Esnek Skorlama (Dangal'ı Kurtaran Kısım) ───────────────
function getMatchScore(entry, tmdb) {
    var score = 0;

    // 1. ÖNCELİK: IMDb ID Eşleşmesi (Tam isabet)
    if (entry.imdbId && tmdb.imdbId && entry.imdbId === tmdb.imdbId) {
        return 1000; 
    }

    // 2. ÖNCELİK: İsim Benzerliği
    var et = normalize(entry.title);
    var qt = normalize(tmdb.titleTr);
    var qe = normalize(tmdb.titleEn);

    // İsim birebir aynı mı veya biri diğerini kapsıyor mu? (Dangal vs Dangal)
    if (et === qt || et === qe) {
        score += 70; // Birebir isim eşleşmesi
    } else if (et.length > 3 && (qt.includes(et) || qe.includes(et))) {
        score += 40; // Kısmi isim eşleşmesi (Dangal-Dram durumu)
    }

    // 3. ÖNCELİK: Yıl Kontrolü
    if (entry.year && tmdb.year) {
        if (entry.year === tmdb.year) {
            score += 30; // Yıl da tutuyorsa puan ekle
        } else {
            // Yıl var ama yanlışsa (Örn: 2016 yerine 2020), skoru düşür ki yanlış film gelmesin
            score -= 50;
        }
    }

    return score;
}

// ── 3. Normalize ve Streams ──────────────────────────────────
function normalize(s) {
    return (s || '').toLowerCase()
        .replace(/[\u0130\u0131]/g, 'i').replace(/[\u00fc]/g, 'u').replace(/[\u00f6]/g, 'o')
        .replace(/[\u015f]/g, 's').replace(/[\u011f]/g, 'g').replace(/[\u00e7]/g, 'c')
        .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return Promise.resolve([]); 

    return fetchTmdbInfo(tmdbId, mediaType)
    .then(function(tmdb) {
        return fetchM3u().then(function(entries) {
            var matches = [];
            entries.forEach(function(e) {
                var score = getMatchScore(e, tmdb);
                // Barajı 40 puana çektik: ID olanlar veya ismi uyanlar girebilir
                if (score >= 40) matches.push({ entry: e, score: score });
            });

            // Skorlara göre sırala
            matches.sort(function(a, b) { return b.score - a.score; });
            
            // Tüm geçerli linkleri (ilk 10'a kadar) göster
            return matches.slice(0, 10).map(function(m) {
                var isVidmody = m.entry.url.includes('vidmody.com');
                return {
                    url: m.entry.url,
                    name: m.entry.title + ' (' + (m.entry.year || tmdb.year) + ')',
                    title: m.entry.author + ' [' + m.entry.group + ']',
                    quality: '1080p',
                    headers: isVidmody ? { 'Referer': 'https://vidmody.com/' } : {}
                };
            });
        });
    })
    .catch(function() { return []; });
}
