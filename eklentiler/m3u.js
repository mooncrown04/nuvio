/**
 * MoOnCrOwN - Nuvio Hybrid Engine (V15)
 * Bu dosya Catalog, Meta ve Stream isteklerini tek basina karsilar.
 */

const M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

// 1. KATALOG (Kanal Listesini Olusturur)
const getCatalog = async function(type, id) {
    console.error(">>> MOONCROWN [Catalog]: Istek geldi -> " + id);
    try {
        const res = await fetch(M3U_URL);
        const text = await res.text();
        const metas = [];
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith("#EXTINF")) {
                const name = lines[i].split(',').pop().trim();
                const streamUrl = lines[i + 1] ? lines[i + 1].trim() : "";
                if (streamUrl.startsWith("http")) {
                    metas.push({
                        id: "nv_" + btoa(name).substring(0, 10), // Isimden benzersiz ID uretir
                        type: "tv",
                        name: name,
                        poster: "https://i.imgur.com/Dlsm9XP.png", // Varsayilan logo
                        description: "Canli Yayin: " + name,
                        releaseInfo: "LIVE"
                    });
                }
            }
        }
        console.error(">>> MOONCROWN [Catalog]: " + metas.length + " kanal hazir.");
        return { metas: metas };
    } catch (e) {
        console.error(">>> MOONCROWN [Catalog] HATA: " + e.message);
        return { metas: [] };
    }
};

// 2. META (Kanal Detay Sayfasini Olusturur - Nuvio bunu mutlaka bekler)
const getMeta = async function(type, id) {
    console.error(">>> MOONCROWN [Meta]: Detay istendi -> " + id);
    // Katalogda olusturdugumuz temel veriyi geri dondurur
    return {
        meta: {
            id: id,
            type: "tv",
            name: "Kanal Detayi",
            poster: "https://i.imgur.com/Dlsm9XP.png",
            description: "Yayin yukleniyor, lutfen bekleyin...",
            runtime: "Canli Yayin"
        }
    };
};

// 3. STREAM (Oynat Butonuna Basildiginda Linki Verir)
const getStreams = async function(type, id) {
    console.error(">>> MOONCROWN [Stream]: Link araniyor -> " + id);
    try {
        const res = await fetch(M3U_URL);
        const text = await res.text();
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith("#EXTINF")) {
                const name = lines[i].split(',').pop().trim();
                const currentId = "nv_" + btoa(name).substring(0, 10);
                
                if (currentId === id) {
                    const streamUrl = lines[i + 1].trim();
                    console.error(">>> MOONCROWN [Stream]: Link bulundu -> " + streamUrl);
                    return {
                        streams: [{
                            name: "NUVIO",
                            title: name + " | Kesintisiz",
                            url: streamUrl,
                            behaviorHints: { notClickable: false }
                        }]
                    };
                }
            }
        }
        return { streams: [] };
    } catch (e) {
        console.error(">>> MOONCROWN [Stream] HATA: " + e.message);
        return { streams: [] };
    }
};

// Global tanimlamalar
globalThis.getCatalog = getCatalog;
globalThis.getMeta = getMeta;
globalThis.getStreams = getStreams;

console.error(">>> MOONCROWN: Hibrit Motor Aktif! <<<");
