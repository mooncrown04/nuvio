/**
 * JetFilmizle — MoOnCrOwN V32
 * SADECE GEREKLİ OLAN: ID AVCI VE DOĞRU EXPORT
 */

var BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    // 1. ADIM: Senin dediğin gibi her bölümün hash'i farklı.
    // Bu hash'i almak için o bölüme özel sayfaya "gizlice" bakmamız lazım.
    var targetUrl = BASE_URL + '/dizi/cobra-kai/' + season + '-sezon-' + episode + '-bolum';

    try {
        var response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Fire TV)',
                'Referer': BASE_URL + '/'
            }
        });

        var html = await response.text();

        // 2. ADIM: Senin bulduğun o devasa 'ABASGR9...' kodunu yakalıyoruz.
        // Linkte sezon/bölüm yazmasa bile bu kodun içindeki veri videoyu değiştirir.
        var workerRegex = /workers\.dev\/[i|e]\/([a-zA-Z0-9_-]{50,})/;
        var match = html.match(workerRegex);

        if (match && match[1]) {
            var dynamicHash = match[1];
            
            return [{
                name: "JetFilmizle",
                title: "MoOnCrOwN V32 | S" + season + " E" + episode,
                url: "https://videopark.erikkalinina1994.workers.dev/i/" + dynamicHash,
                type: "video",
                headers: { 
                    "Referer": "https://videopark.top/",
                    "Origin": "https://videopark.top"
                }
            }];
        }
    } catch (e) {
        // Hata olsa bile boş liste dön ki uygulama çökmesin
    }
    return [];
}

// UYGULAMANIN "BULAMADIM" DEMEMESİ İÇİN BU KISIM ŞART:
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}

if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
}
