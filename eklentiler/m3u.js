/**
 * MoOnCrOwN Light Engine - Sadece Arama ve Link Sağlayıcı
 */

const M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

// M3U dosyasından sadece ID ve URL eşleşmesini bulan fonksiyon
async function findStreamById(targetId) {
    try {
        const response = await fetch(M3U_URL);
        const text = await response.text();
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            
            // Kanalın adını ayıklayıp ID ile eşleştiriyoruz
            if (line.startsWith("#EXTINF")) {
                const namePart = line.substring(line.lastIndexOf(',') + 1).trim();
                const currentId = "iptv_" + namePart.toLowerCase().replace(/[^a-z0-9]/g, "");

                // Eğer aranan ID ile eşleşirse, bir sonraki satırdaki URL'yi al
                if (currentId === targetId) {
                    for (let j = i + 1; j < lines.length; j++) {
                        let nextLine = lines[j].trim();
                        if (nextLine && !nextLine.startsWith("#")) {
                            return {
                                url: nextLine,
                                name: namePart
                            };
                        }
                    }
                }
            }
        }
    } catch (e) {
        return null;
    }
    return null;
}

// 1. ARAMA (Stream): Kullanıcı kanala tıkladığında çalışır
globalThis.getStreams = async function(args) {
    const { id } = args; // Nuvio'dan gelen kanal ID'si (Örn: iptv_trt1hd)
    
    const result = await findStreamById(id);
    
    if (result && result.url) {
        return {
            streams: [{
                name: "MoOnCrOwN",
                title: result.name,
                url: result.url,
                behaviorHints: {
                    isLive: true,
                    notWebReady: false
                }
            }]
        };
    }
    
    return { streams: [] };
};

// 2. META: Kanal detaylarını doğrular (Oynat tuşunun görünmesi için şart)
globalThis.getMeta = async function(args) {
    const result = await findStreamById(args.id);
    if (!result) return { meta: null };

    return {
        meta: {
            id: args.id,
            type: args.type || "tv",
            name: result.name,
            videos: [{ id: args.id, title: result.name }]
        }
    };
};
