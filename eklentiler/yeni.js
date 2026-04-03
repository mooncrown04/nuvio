// ============================================================
//  M3U Provider — Debug & Keskin Eşleştirme (v5.4)
// ============================================================

var M3U_URL      = 'https://raw.githubusercontent.com/mooncrown04/m3ubirlestir/refs/heads/main/birlesik_sinema.m3u';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

function parseExtInf(meta, url) {
    try {
        // 1. IMDb ID Yakalama (Sondaki slaş vb. her şeyi kapsar)
        var imdbMatch = url.match(/(tt\d+)/);
        var imdbId = imdbMatch ? imdbMatch[1] : null;

        // 2. Year Tagı
        var yearTagM = meta.match(/year="(\d{4})"/);
        var year = yearTagM ? yearTagM[1] : '';

        // 3. Ham İsim Ayıklama
        var titleRaw = meta.replace(/#EXTINF[^,]*,/, '').trim();

        // 4. Eğer tag yoksa isimden yıl bul
        if (!year) {
            var yearInTitle = titleRaw.match(/\d{4}/);
            year = yearInTitle ? yearInTitle[0] : '';
        }

        // 5. İsmi Temizleme (Dangal-Dram -> Dangal)
        var cleanTitle = titleRaw.replace(/\d{4}/g, '')
                                .replace(/\(.*\)/g, '')
                                .split('-')[0]
                                .replace(/[:_]/g, ' ')
                                .trim();

        var author = (meta.match(/group-author="([^"]+)"/) || [])[1] || 'M3U';

        return {
            title: cleanTitle,
            year: year,
            url: url,
            imdbId: imdbId,
            author: author,
            raw: titleRaw // Debug için ham ismi saklıyoruz
        };
    } catch (e) {
        console.error("Nuvio Parse Hatası: ", e);
        return null;
    }
}

function getMatchScore(entry, tmdb) {
    // --- DEBUG LOG ---
    // console.log("Kontrol Ediliyor: " + entry.title + " | Link ID: " + entry.imdbId);

    // 1. Kural: IMDb ID Eşleşmesi
    if (entry.imdbId && tmdb.imdbId && entry.imdbId === tmdb.imdbId) {
        return 1000;
    }

    var et = normalize(entry.title);
    var qt = normalize(tmdb.titleTr);
    var qe = normalize(tmdb.titleEn);

    // 2. Kural: İsim Birebir veya İçeriyor mu?
    var isTitleMatch = (et === qt || et === qe || qt.includes(et) || et.includes(qt));
    
    if (isTitleMatch) {
        var score = 50;
        // Yıl kontrolü (Esnek: Yıl yoksa da kabul et, varsa ve doğruysa puan ekle)
        if (entry.year && tmdb.year) {
            if (entry.year === tmdb.year) {
                score += 50;
            } else {
                return 0; // Yıllar farklıysa yanlış filmdir
            }
        }
        return score;
    }

    return 0;
}

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
                if (score >= 40) {
                    matches.push({ entry: e, score: score });
                }
            });

            if (matches.length === 0) {
                console.error("HİÇ EŞLEŞME BULUNAMADI: TMDB Adı: " + tmdb.titleTr + " | TMDB ID: " + tmdb.imdbId);
            }

            matches.sort(function(a, b) { return b.score - a.score; });

            return matches.slice(0, 10).map(function(m) {
                return {
                    url: m.entry.url,
                    name: m.entry.title + " (" + (m.entry.year || "Link") + ")",
                    title: m.entry.author,
                    quality: "1080p"
                };
            });
        });
    })
    .catch(function(err) {
        console.error("Nuvio getStreams Genel Hata: ", err);
        return [];
    });
}

// fetchM3u ve fetchTmdbInfo fonksiyonları v5.2 ile aynı kalacak...
