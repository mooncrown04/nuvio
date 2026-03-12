const M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";
let cache = null;

async function getM3U() {
    if (cache) return cache;
    try {
        const res = await fetch(M3U_URL);
        const text = await res.text();
        const lines = text.split('\n');
        const list = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("#EXTINF")) {
                const name = lines[i].split(',').pop().trim();
                const url = lines[i+1] ? lines[i+1].trim() : "";
                if (url.startsWith("http")) {
                    list.push({ 
                        id: "nv_" + name.replace(/\s+/g, '').toLowerCase(), 
                        name: name, 
                        url: url 
                    });
                }
            }
        }
        cache = list;
        return list;
    } catch (e) { return []; }
}

globalThis.getCatalog = async (type, id) => {
    const list = await getM3U();
    return { metas: list.map(c => ({ id: c.id, type: "tv", name: c.name, poster: "https://i.imgur.com/Dlsm9XP.png" })) };
};

globalThis.getMeta = async (type, id) => {
    if (id.startsWith("tmdb_")) {
        return { meta: { id: id, type: type, videos: [{ id: id, title: "M3U Listesinden Oynat" }] } };
    }
    const list = await getM3U();
    const item = list.find(c => c.id === id);
    return { meta: { id: id, type: "tv", name: item ? item.name : "Kanal", videos: [{ id: id, title: "Oynat" }] } };
};

globalThis.getStreams = async (type, id) => {
    const list = await getM3U();
    
    // Eğer TMDB üzerinden bir film/dizi aratılıyorsa:
    if (id.startsWith("tmdb_")) {
        // Burada ileri seviye eşleşme mantığı kurulabilir (şimdilik basit geçiyoruz)
        // Örnek: TMDB ID'si ile M3U'daki kanal adını karşılaştırabilirsin.
    }

    const ch = list.find(c => c.id === id);
    return { streams: ch ? [{ name: "MC-PLAYER", url: ch.url }] : [] };
};
