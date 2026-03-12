/**
 * MoOnCrOwN - Local Provider (V10)
 * Sertifika hatalarını aşmak için liste kodun içine gömülmüştür.
 */

const MANIFEST = {
    "id": "org.mooncrown.local",
    "version": "1.0.0",
    "name": "MoOnCrOwN Yerel",
    "description": "Offline M3U Test",
    "resources": ["catalog", "stream"],
    "types": ["tv"],
    "idPrefixes": ["mc_"],
    "catalogs": [{
        "id": "mc_channels",
        "type": "tv",
        "name": "Canlı Kanallar"
    }]
};

// 1. KATALOG: Kanalları internete gitmeden direkt buradan veriyoruz.
const getCatalog = function(type, id) {
    console.error(">>> KATALOG TETIKLENDI: " + id);
    
    // Buraya GitHub'daki canli.m3u içeriğinden bir kısmını manuel ekledim
    const localMetas = [
        { id: "mc_trt1", type: "tv", name: "TRT 1 HD" },
        { id: "mc_trtspor", type: "tv", name: "TRT SPOR HD" },
        { id: "mc_trthaber", type: "tv", name: "TRT HABER HD" }
    ];

    return Promise.resolve({ metas: localMetas });
};

// 2. STREAM: Kanala tıklandığında dönecek linkler
const getStreams = function(type, id) {
    console.error(">>> STREAM TETIKLENDI: " + id);
    
    let streamUrl = "";
    if (id === "mc_trt1") streamUrl = "https://tv-trt1.medya.trt.com.tr/master.m3u8";
    if (id === "mc_trtspor") streamUrl = "https://tv-trtspor.medya.trt.com.tr/master.m3u8";
    if (id === "mc_trthaber") streamUrl = "https://tv-trthaber.medya.trt.com.tr/master.m3u8";

    if (streamUrl) {
        return Promise.resolve({
            streams: [{
                title: "Oynat",
                url: streamUrl,
                behaviorHints: { proxyHeaders: { "User-Agent": "VLC/3.0.18" } }
            }]
        });
    }
    return Promise.resolve({ streams: [] });
};

// Kayıtlar
globalThis.manifest = MANIFEST;
globalThis.getCatalog = getCatalog;
globalThis.getStreams = getStreams;
