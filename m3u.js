const M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";
let channelsCache = null;

async function getChannels() {
    if (channelsCache) return channelsCache;
    try {
        const response = await fetch(M3U_URL);
        const text = await response.text();
        const lines = text.split('\n');
        const list = [];
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF")) {
                // Regex ile tırnak içindeki değerleri güvenli çek
                const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
                const groupMatch = line.match(/group-title="([^"]+)"/i);
                
                // Kanal adını virgülden sonrasını alarak bul
                const namePart = line.substring(line.lastIndexOf(',') + 1).trim();
                
                // URL'yi bul (sonraki satırlarda gezerek)
                let url = "";
                for (let j = i + 1; j < lines.length; j++) {
                    let nextLine = lines[j].trim();
                    if (nextLine && !nextLine.startsWith("#")) {
                        url = nextLine;
                        break;
                    }
                    if (nextLine.startsWith("#EXTINF")) break;
                }

                if (url) {
                    list.push({
                        id: "nv_" + namePart.toLowerCase().replace(/[^a-z0-9]/g, ""),
                        name: namePart,
                        url: url,
                        logo: logoMatch ? logoMatch[1] : "https://i.imgur.com/Dlsm9XP.png",
                        group: groupMatch ? groupMatch[1] : "Genel"
                    });
                }
            }
        }
        channelsCache = list;
        return list;
    } catch (e) { return []; }
}

// Nuvio'nun beklediği standart fonksiyon yapısı
globalThis.getCatalog = async function(args) {
    const list = await getChannels();
    const extra = args.extra || {};
    let filtered = list;

    // Arama desteği
    if (extra.search) {
        filtered = list.filter(ch => ch.name.toLowerCase().includes(extra.search.toLowerCase()));
    }

    // Kategori desteği
    if (extra.genre) {
        filtered = list.filter(ch => ch.group === extra.genre);
    }

    return {
        metas: filtered.map(ch => ({
            id: ch.id,
            type: "tv",
            name: ch.name,
            poster: ch.logo,
            background: ch.logo,
            description: ch.group,
            posterShape: "square"
        }))
    };
};

globalThis.getMeta = async function(args) {
    const list = await getChannels();
    const ch = list.find(c => c.id === args.id);
    if (!ch) return { meta: null };

    return {
        meta: {
            id: ch.id,
            type: "tv",
            name: ch.name,
            poster: ch.logo,
            videos: [{ id: ch.id, title: ch.name }]
        }
    };
};

globalThis.getStreams = async function(args) {
    const list = await getChannels();
    const ch = list.find(c => c.id === args.id);
    if (ch) {
        return {
            streams: [{
                name: "MoOnCrOwN",
                title: ch.name,
                url: ch.url,
                behaviorHints: { isLive: true }
            }]
        };
    }
    return { streams: [] };
};
