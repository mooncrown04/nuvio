const M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

async function parseM3U() {
    try {
        const response = await fetch(M3U_URL);
        const text = await response.text();
        const lines = text.split('\n');
        const list = [];
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("#EXTINF")) {
                const name = lines[i].split(',').pop().trim();
                const url = lines[i + 1] ? lines[i + 1].trim() : "";
                const logoMatch = lines[i].match(/tvg-logo="([^"]+)"/);
                
                if (url.startsWith("http")) {
                    list.push({
                        id: "nv_" + name.toLowerCase().replace(/[^a-z0-9]/g, ""),
                        name: name,
                        url: url,
                        logo: logoMatch ? logoMatch[1] : ""
                    });
                }
            }
        }
        return list;
    } catch (e) {
        return [];
    }
}

// BU KISIM KATALOĞU OLUŞTURAN ANA NOKTADIR
globalThis.getCatalog = async function(type, id) {
    const channels = await parseM3U();
    return {
        metas: channels.map(ch => ({
            id: ch.id,
            type: "tv",
            name: ch.name,
            poster: ch.logo
        }))
    };
};

globalThis.getMeta = async function(type, id) {
    const channels = await parseM3U();
    const ch = channels.find(c => c.id === id);
    return {
        meta: {
            id: id,
            type: "tv",
            name: ch ? ch.name : "Kanal",
            poster: ch ? ch.logo : "",
            videos: [{ id: id, title: "Oynat" }]
        }
    };
};

globalThis.getStreams = async function(type, id) {
    const channels = await parseM3U();
    const ch = channels.find(c => c.id === id);
    return {
        streams: ch ? [{ name: "Oynatıcı", url: ch.url }] : []
    };
};
