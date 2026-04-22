// Arama sonucundan gelen linki al ve dizi ise sezon/bölüm ekle
var finalUrl = '';

if (m) {
    // m[1] tam URL'yi verir (https://jetfilmizle.net/dizi/cobra-kai gibi)
    finalUrl = m[1]; 
    
    if (mediaType === 'tv') {
        // JetFilmizle dizi yapısı: /sezon-1/bolum-1
        finalUrl += '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
    }
} else {
    // Arama sonuç vermezse manuel tahmin (Slug temizleme fonksiyonunu kullanır)
    var fallbackSlug = titleToSlug(originalTitle);
    
    if (mediaType === 'tv') {
        finalUrl = BASE_URL + '/dizi/' + fallbackSlug + '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
    } else {
        finalUrl = BASE_URL + '/film/' + fallbackSlug;
    }
}

console.error('[JetFilm-Debug] Gidilen Sayfa: ' + finalUrl);
