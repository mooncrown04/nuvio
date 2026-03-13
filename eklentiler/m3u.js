/**
 * MoOnCrOwN Debug Scraper - Console Log Destekli
 * Statik Katalog ID'lerini M3U ile eşleştirir.
 */

const M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

async function findStreamInM3U(targetId) {
    console.log("🚀 [MoOnCrOwN] Arama başlatıldı. Hedef ID:", targetId);
    
    try {
        console.log("🌐 [MoOnCrOwN] M3U dosyası indiriliyor:", M3U_URL);
        const response = await fetch(M3U_URL);
        
        if (!response.ok) {
            console.error("❌ [MoOnCrOwN] M3U indirilemedi! Durum Kodu:", response.status);
            return null;
        }

        const text = await response.text();
        const lines = text.split('\n');
        console.log("📄 [MoOnCrOwN] M3U okundu. Toplam satır sayısı:", lines.length);

        // Nuvio'dan gelen ID'yi normalize et
        const cleanTarget = targetId.toLowerCase().replace(/nv_|tmdb_|[^a-z0-9]/g, "");
        console.log("🧹 [MoOnCrOwN] Normalize edilmiş hedef ID:", cleanTarget);

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            
            if (line.startsWith("#EXTINF")) {
                // tvg-id çekme
                const tvgIdMatch = line.match(/tvg-id="([^"]+)"/i);
                const tvgId = tvgIdMatch ? tvgIdMatch[1].toLowerCase().replace(/[^a-z0-9]/g, "") : "";

                // Kanal ismi çekme
                const namePart = line.substring(line.lastIndexOf(',') + 1).trim();
                const cleanName = namePart.toLowerCase().replace(/[^a-z0-9]/g, "");

                // Eşleşme Kontrolü (Log ile izle)
                if (cleanTarget === cleanName || cleanTarget === tvgId || cleanName.includes(cleanTarget) || cleanTarget.includes(cleanName)) {
                    console.log(`✅ [MoOnCrOwN] Eşleşme bulundu! M3U İsmi: ${namePart} -> Hedef: ${targetId}`);
                    
                    // URL bulma döngüsü
                    for (let j = i + 1; j < lines.length; j++) {
                        let nextLine = lines[j].trim();
                        if (nextLine && !nextLine.startsWith("#")) {
                            console.log("🔗 [MoOnCrOwN] URL başarıyla alındı:", nextLine);
                            return { url: nextLine, name: namePart };
                        }
                        if (nextLine.startsWith("#EXTINF")) break;
                    }
                }
            }
        }
        console.warn("⚠️ [MoOnCrOwN] M3U içinde eşleşen bir kanal bulunamadı.");
    } catch (e) {
        console.error("🔥 [MoOnCrOwN] Kritik Hata:", e.message);
    }
    return null;
}

// STREAM: Nuvio oynatıcıyı tetiklediğinde
globalThis.getStreams = async function(args) {
    console.log("📥 [MoOnCrOwN] getStreams tetiklendi. Gelen ID:", args.id);
    
    const result = await findStreamInM3U(args.id);
    
    if (result) {
        console.log("🎥 [MoOnCrOwN] Stream Nuvio'ya teslim ediliyor.");
        return {
            streams: [{
                name: "NUVIO",
                title: `${result.name} \nMoOnCrOwN Kesintisiz`,
                url: result.url,
                behaviorHints: { isLive: true }
            }]
        };
    }
    
    console.error("🚫 [MoOnCrOwN] Oynatılabilecek bir kaynak bulunamadı (null).");
    return { streams: [] };
};

// META: Detay sayfası doğrulaması
globalThis.getMeta = async function(args) {
    return {
        meta: {
            id: args.id,
            type: "tv",
            videos: [{ id: args.id, title: "Canlı Yayını Başlat" }]
        }
    };
};
