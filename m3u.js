/**
 * MoOnCrOwN Ultimate Engine - Nuvio Kararlı Sürüm
 * v0.1.1 - Optimize Edilmiş Parser
 */

const M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";
let channelsCache = null;

// M3U Parser: Daha esnek ve hata payı düşük sürüm
async function getChannels() {
    if (channelsCache) return channelsCache;

    try {
        const response = await fetch(M3U_URL);
        if (!response.ok) throw new Error("M3U dosyasına erişilemedi");
        
        const text = await response.text();
        const lines = text.split('\n');
        const list = [];
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            
            if (line.startsWith("#EXTINF")) {
                // Regex ile logo ve grup bilgilerini daha güvenli çekelim
                const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
                const groupMatch = line.match(/group-title="([^"]+)"/i);
                
                // Kanal ismini temizle: Virgülden sonrasını al, nv_ gibi ekleri temizle
                let namePart = line.split(',').pop().trim();
                const cleanName = namePart.replace(/nv_|tmdb_/g, '').trim();
                
                // URL'yi bulana kadar sonraki satırlara bak (boş satırları atla)
                let url = "";
                let nextIdx = i + 1;
                while (nextIdx < lines.length) {
                    const nextLine = lines[nextIdx].trim();
                    if (nextLine && !nextLine.startsWith("#")) {
                        url = nextLine;
                        break;
                    }
                    if (nextLine.startsWith("#")) break; // Yeni bir tag gelirse dur
                    nextIdx++;
                }

                if (url && url.startsWith("http")) {
                    list.push({
                        // ID oluştururken Türkçe karakterleri ve boşlukları temizle
                        id: "nv_" + cleanName.toLowerCase()
                            .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
                            .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
                            .replace(/[^a-z0-9]/g, ""),
                        name: cleanName,
                        url: url,
                        logo: logoMatch ? logoMatch[1] : "https://i.imgur.com/Dlsm9XP.png",
                        group: groupMatch ? groupMatch[1] : "Genel"
                    });
                }
            }
        }
        channelsCache = list;
        return list;
    } catch (e) {
        console.error("Scraper Hatası:", e.message);
        return [];
    }
}

// 1. KATALOG
globalThis.getCatalog = async function(args) {
    const { type, id, extra } = args;
    const list = await getChannels();
    let filtered = list;

    // Arama filtrelemesi (Stremio/Nuvio standart arama parametresi)
    if (extra && extra.search) {
        const query = extra.search.toLowerCase();
        filtered = list.filter(ch => ch.name.toLowerCase().includes(query));
    }

    // Genre/Kategori filtrelemesi
    if (extra && extra.genre) {
        filtered = list.filter(ch => ch.group === extra.genre);
    }

    return {
        metas: filtered.map(ch => ({
            id: ch.id,
            type: "tv",
            name: ch.name,
            poster: ch.logo,
            background: ch.logo, // TV kanallarında background genelde logo olur
            description: `Kategori: ${ch.group}`,
            posterShape: "square" // Kanallar genelde kare logoludur
        }))
    };
};

// 2. META
globalThis.getMeta = async function(args) {
    const { type, id } = args;
    const list = await getChannels();
    
    // TMDB desteği için fallback (Gerekirse)
    if (id.startsWith("tmdb_")) {
        return { meta: { id, type, name: "M3U Arama Sonucu", videos: [] } };
    }

    const ch = list.find(c => c.id === id);
    if (!ch) return { meta: null };

    return {
        meta: {
            id: ch.id,
            type: "tv",
            name: ch.name,
            poster: ch.logo,
            background: ch.logo,
            description: `MoOnCrOwN Canlı TV - ${ch.group}`,
            // TV kanallarında tek bir video (yayın) olur
            videos: [{
                id: ch.id,
                title: ch.name,
                released: new Date().toISOString()
            }]
        }
    };
};

// 3. STREAM
globalThis.getStreams = async function(args) {
    const { type, id } = args;
    const list = await getChannels();
    
    const ch = list.find(c => c.id === id);
    if (ch) {
        return {
            streams: [{
                name: "MoOnCrOwN",
                title: `Canlı: ${ch.name}\n${ch.group}`,
                url: ch.url,
                behaviorHints: {
                    notWebReady: false,
                    isLive: true // Canlı yayın olduğunu player'a bildirir
                }
            }]
        };
    }
    return { streams: [] };
};
