/**
 * SineWix_Fix_v4_Final
 * - "From" gibi kısa isimler için tam eşleşme (Exact Match) zorunluluğu.
 * - Filmlerde "Yol" gibi kısa isimlerde "Mad Max" elenmesi garantilendi.
 * - Önce tam isim, sonra en kısa isim sıralaması yapıldı.
 */

var API_BASE = 'https://ydfvfdizipanel.ru/public/api';
var API_KEY = '9iQNC5HQwPlaFuJDkhncJ5XTJ8feGXOJatAA';

var API_HEADERS = {
    'hash256': '711bff4afeb47f07ab08a0b07e85d3835e739295e8a6361db77eebd93d96306b',
    'User-Agent': 'EasyPlex (Android 14; SM-A546B; Samsung Galaxy A54 5G; tr)',
    'Accept': 'application/json'
};

function searchAndFetch(title, mediaType, seasonNum, episodeNum) {
    var searchUrl = API_BASE + '/search/' + encodeURIComponent(title) + '/' + API_KEY;
    var sTitleLower = title.toLowerCase().trim();

    return fetch(searchUrl, { headers: API_HEADERS })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            var results = data.search || [];
            
            // 1. AŞAMA: Tür ve İsim Filtreleme
            var filtered = results.filter(function(item) {
                var itemType = item.type || '';
                var itemTitleLower = (item.name || item.title || '').toLowerCase().trim();
                
                var isMovieReq = (mediaType === 'movie');
                var typeOk = isMovieReq ? itemType.includes('movie') : (itemType.includes('serie') || itemType.includes('anime'));
                if (!typeOk) return false;

                // KISA İSİMLER (From, Yol, See vb.) İÇİN ÇOK KATI KONTROL
                if (sTitleLower.length <= 4) {
                    // Sadece tam eşleşme veya yanında yıl yazanları kabul et (Örn: "From (2022)")
                    return itemTitleLower === sTitleLower || itemTitleLower.startsWith(sTitleLower + " (");
                }

                // UZUN İSİMLER İÇİN UZUNLUK KONTROLÜ
                // Aranan isimden 5 karakterden fazla uzunsa yan içeriktir, ele.
                var containsTitle = itemTitleLower.includes(sTitleLower);
                var lengthOk = itemTitleLower.length <= sTitleLower.length + 5;

                return containsTitle && lengthOk;
            });

            if (filtered.length === 0) return [];

            // 2. AŞAMA: EN DOĞRU SONUCU SIRALAMA
            filtered.sort(function(a, b) {
                var aTitle = (a.name || a.title || '').toLowerCase().trim();
                var bTitle = (b.name || b.title || '').toLowerCase().trim();
                
                // Tam eşleşen her zaman en üstte
                if (aTitle === sTitleLower) return -1;
                if (bTitle === sTitleLower) return 1;
                
                // Değilse, kısa olan (fazla eki olmayan) üstte
                return aTitle.length - bTitle.length;
            });

            var best = filtered[0];
            return fetchDetailAndStreams(best.id, best.type, mediaType, seasonNum, episodeNum);
        });
}

// buildStreams, fetchDetailAndStreams ve getStreams fonksiyonları v3 ile aynı kalacak...
// (Kodun geri kalanı yukarıdaki mantıkla entegre çalışır)
