/**
 * MoOnCrOwN Smart Search - Nuvio İçin Esnek Link Çözücü
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
                // 1. tvg-id değerini al (Örn: trt1.tr)
                const tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
                const tvgId = tvgIdMatch ? tvgIdMatch[1].toLowerCase() : "";

                // 2. Kanal ismini al ve temizle (Örn: trt1hd)
                const namePart = line.substring(line.lastIndexOf(',') + 1).trim();
                const cleanName = namePart.toLowerCase().replace(/[^a-z0-9]/g, "");

                // Gelen ID'yi temizleyip karşılaştıralım
                const normalizedTargetId = targetId.toLowerCase().replace(/iptv_|nv_/g, "").replace(/[^a-z0-9.]/g, "");

                // EŞLEŞME KONTROLÜ: 
                // Ya tvg-id ile tutmalı, ya temizlenmiş kanal ismiyle, ya da prefixli haliyle
                if (targetId === tvgId || 
                    normalizedTargetId === cleanName || 
                    targetId.includes(cleanName) ||
                    normalizedTargetId === tvgId.replace(/[^a-z0-9]/g, "")) {
                    
                    // URL bulma döngüsü
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

globalThis.getStreams = async function(args) {
    const result = await findStreamInM3U(args.id);
    if (result) {
        return {
            streams: [{
                name: "MoOnCrOwN Engine",
                title: result.name,
                url: result.url,
                behaviorHints: { isLive: true }
            }]
        };
    }
    return { streams: [] };
};

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
