function getStreams(id, mediaType, season, episode) {
    // --- CIHAZIN GÖNDERDİĞİ HAM PARAMETRELER (HİÇBİR DEĞİŞİKLİK YAPMADAN) ---
    console.error("DEBUG_START >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
    console.error("[CIHAZ_HAM_ID]: " + id + " | Tipi: " + (typeof id));
    console.error("[CIHAZ_HAM_TYPE]: " + mediaType + " | Tipi: " + (typeof mediaType));
    console.error("[CIHAZ_HAM_SEASON]: " + season + " | Tipi: " + (typeof season));
    console.error("[CIHAZ_HAM_EPISODE]: " + episode + " | Tipi: " + (typeof episode));
    
    // Eğer gelen 'id' bir objeyse içindekileri de görelim (çökmemesi için try-catch içinde)
    try {
        if (typeof id === 'object') {
            console.error("[CIHAZ_ID_DETAY]: " + JSON.stringify(id));
        }
    } catch(e) {
        console.error("[CIHAZ_ID_DETAY_ERROR]: Veri JSON olarak basılamadı.");
    }
    console.error("DEBUG_END <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<");

    // --- BURADAN SONRASI YAZILIMIN KENDİ İŞLEYİŞİ ---
    // (Burada senin paylaştığın orijinal kodun devam edebilir)
    
    var safeId = (id !== undefined && id !== null) ? id.toString().replace(/[^0-9]/g, '') : null;
    // ... devamı ...
}
