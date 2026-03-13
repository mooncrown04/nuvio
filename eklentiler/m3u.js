/**
 * MoOnCrOwN Pro Scraper - Fire Stick & Android TV Uyumlu
 * Loglardaki 'Certificate Trust' hatasını aşmak için optimize edildi.
 */

const M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

async function findStreamInM3U(targetId) {
    try {
        console.log("🔍 [MoOnCrOwN] Aranan ID:", targetId);
        
        // Sertifika hatalarını azaltmak için fetch'e basit bir cache-control ekleyelim
        const response = await fetch(M3U_URL, {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) {
            console.error("❌ [MoOnCrOwN] Liste indirilemedi. HTTP:", response.status);
            return null;
        }

        const text = await response.text();
        const lines = text.split('\n');
        
        // ID Normalizasyonu (Hem hedef hem liste için)
        const normalize = (str) => str.toLowerCase().replace(/nv_|tmdb_|[^a-z0-9]/g, "");
        const cleanTarget = normalize(targetId);

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            
            if (line.startsWith("#EXTINF")) {
                const namePart = line.substring(line.lastIndexOf(',') + 1).trim();
                const cleanName = normalize(namePart);
                
                // tvg-id değerini de kontrol edelim
                const tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
                const cleanTvgId = tvgIdMatch ? normalize(tvgIdMatch[1]) : "";

                // EŞLEŞME: Hedef isimle mi, tvg-id ile mi yoksa isim-içerik olarak mı tutuyor?
                if (cleanTarget === cleanName || cleanTarget === cleanTvgId || cleanName.includes(cleanTarget)) {
                    console.log("✅ [MoOnCrOwN] Eşleşti:", namePart);
                    
                    for (let j = i + 1; j < lines.length; j++) {
                        let urlLine = lines[j].trim();
                        if (urlLine && !urlLine.startsWith("#")) {
                            return { url: urlLine, name: namePart };
                        }
                        if (urlLine.startsWith("#EXTINF")) break;
                    }
                }
            }
        }
    } catch (e) {
        console.error("🔥 [MoOnCrOwN] Bağlantı Hatası (Sertifika kaynaklı olabilir):", e.message);
    }
    return null;
}

globalThis.getStreams = async function(args) {
    if (!args.id) return { streams: [] };
    
    const result = await findStreamInM3U(args.id);
    
    if (result) {
        return {
            streams: [{
                name: "MoOnCrOwN-PRO",
                title: `${result.name} \n1080p | Aktif`,
                url: result.url,
                behaviorHints: { isLive: true }
            }]
        };
    }
    
    // Eğer hiçbir şey bulunamazsa en azından boş dönerek uygulamanın çökmesini engelle
    return { streams: [] };
};

globalThis.getMeta = async function(args) {
    return {
        meta: {
            id: args.id,
            type: "tv",
            videos: [{ id: args.id, title: "Yayını Başlat" }]
        }
    };
};
