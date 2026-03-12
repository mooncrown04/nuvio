/**
 * MoOnCrOwN Ultimate - Manifest Uyumlu Arama Motoru
 */

const M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

async function findStream(targetId) {
    try {
        const response = await fetch(M3U_URL);
        const text = await response.text();
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            
            if (line.startsWith("#EXTINF")) {
                // M3U'daki kanal ismini al (Virgülden sonrası)
                const namePart = line.substring(line.lastIndexOf(',') + 1).trim();
                
                // Manifestteki kurala göre ID oluştur: iptv_ + temizlenmiş isim
                const generatedId = "iptv_" + namePart.toLowerCase().replace(/[^a-z0-9]/g, "");

                // Eğer Nuvio'dan gelen ID bizim oluşturduğumuzla eşleşirse linki dön
                if (targetId === generatedId) {
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

// Oynatıcı (Stream) İsteği
globalThis.getStreams = async function(args) {
    const result = await findStream(args.id);
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

// Detay (Meta) İsteği
globalThis.getMeta = async function(args) {
    const result = await findStream(args.id);
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
