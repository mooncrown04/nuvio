/**
 * MoOnCrOwN Multi-ID Engine - Yedekli Arama Scripti
 */

const M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

async function findStreamInM3U(targetId) {
    try {
        const response = await fetch(M3U_URL);
        const text = await response.text();
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            
            if (line.startsWith("#EXTINF")) {
                const namePart = line.substring(line.lastIndexOf(',') + 1).trim();
                const baseName = namePart.toLowerCase().replace(/[^a-z0-9]/g, "");

                // --- 3 SEÇENEKLİ ID KONTROLÜ ---
                const option1 = "iptv_" + baseName; // Örn: iptv_trt1hd
                const option2 = "nv_" + baseName;   // Örn: nv_trt1hd
                const option3 = baseName;           // Örn: trt1hd

                // Eğer gelen ID bu 3 seçenekten herhangi birine uyuyorsa:
                if (targetId === option1 || targetId === option2 || targetId === option3) {
                    for (let j = i + 1; j < lines.length; j++) {
                        let nextLine = lines[j].trim();
                        if (nextLine && !nextLine.startsWith("#")) {
                            return { url: nextLine, name: namePart };
                        }
                    }
                }
            }
        }
    } catch (e) { return null; }
    return null;
}

// 1. STREAM (Oynatma İsteği)
globalThis.getStreams = async function(args) {
    const result = await findStreamInM3U(args.id);
    
    if (result) {
        return {
            streams: [{
                name: "MoOnCrOwN",
                title: result.name,
                url: result.url,
                behaviorHints: { isLive: true }
            }]
        };
    }
    return { streams: [] };
};

// 2. META (Kanal Doğrulama)
globalThis.getMeta = async function(args) {
    const result = await findStreamInM3U(args.id);
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
