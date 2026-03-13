/**
 * MoOnCrOwN Scraper - Statik Katalog Uyumlu
 * Bu kod 'nv_trt1', 'star', 'tmdb_atv' gibi ID'leri M3U ile eşleştirir.
 */

const M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

async function getStreamFromM3U(targetId) {
    try {
        const response = await fetch(M3U_URL);
        const text = await response.text();
        const lines = text.split('\n');
        
        // Nuvio'dan gelen ID'yi temizleyelim (nv_ veya tmdb_ eklerini ve özel karakterleri atalım)
        const cleanTarget = targetId.toLowerCase().replace(/nv_|tmdb_|[^a-z0-9]/g, "");

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            
            if (line.startsWith("#EXTINF")) {
                // 1. tvg-id ile kontrol (trt1.tr gibi)
                const tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
                const tvgId = tvgIdMatch ? tvgIdMatch[1].toLowerCase().replace(/[^a-z0-9]/g, "") : "";

                // 2. Kanal ismi ile kontrol (TRT 1 HD -> trt1hd)
                const namePart = line.substring(line.lastIndexOf(',') + 1).trim();
                const cleanName = namePart.toLowerCase().replace(/[^a-z0-9]/g, "");

                // EŞLEŞME MANTIĞI: 
                // Hedef ID; kanal ismine veya tvg-id'ye dahil mi veya tam tersi mi?
                if (cleanTarget === cleanName || 
                    cleanTarget === tvgId || 
                    cleanName.includes(cleanTarget) || 
                    cleanTarget.includes(cleanName)) {
                    
                    // URL'yi bul (alt satırlara bakarak)
                    for (let j = i + 1; j < lines.length; j++) {
                        let nextLine = lines[j].trim();
                        if (nextLine && !nextLine.startsWith("#")) {
                            return { url: nextLine, name: namePart };
                        }
                        if (nextLine.startsWith("#EXTINF")) break;
                    }
                }
            }
        }
    } catch (e) { return null; }
    return null;
}

// STREAM: Oynat tuşuna basıldığında linki döner
globalThis.getStreams = async function(args) {
    const { id } = args;
    const result = await getStreamFromM3U(id);
    
    if (result) {
        return {
            streams: [{
                name: "NUVIO",
                title: `${result.name} \n1080p | Kesintisiz`,
                url: result.url,
                behaviorHints: {
                    notClickable: false,
                    isLive: true
                }
            }]
        };
    }
    return { streams: [] };
};

// META: Katalogdaki detay sayfası için doğrulama yapar
globalThis.getMeta = async function(args) {
    // Statik katalog kullandığın için meta bilgisini 
    // doğrudan Nuvio'ya bırakabiliriz ama boş dönmemesi iyidir.
    return {
        meta: {
            id: args.id,
            type: "tv",
            videos: [{ id: args.id, title: "Canlı Yayın" }]
        }
    };
};
