const M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";
let cache = null;

async function getChannels() {
    if (cache) return cache;
    try {
        const res = await fetch(M3U_URL);
        const text = await res.text();
        const lines = text.split('\n');
        const list = [];
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith("#EXTINF")) {
                const info = lines[i];
                // İsim kısmını virgülden sonra al ve temizle
                const name = info.split(',').pop().trim();
                const url = lines[i + 1] ? lines[i + 1].trim() : "";
                const logoMatch = info.match(/tvg-logo="([^"]+)"/);

                if (url.startsWith("http")) {
                    list.push({
                        // İsimden güvenli bir ID üret (Örn: nv_trt1hd)
                        id: "nv_" + name.toLowerCase().replace(/[^a-z0-9]/g, ""),
                        name: name,
                        url: url,
                        logo: logoMatch ? logoMatch[1] : ""
                    });
                }
            }
        }
        cache = list;
        return list;
    } catch (e) {
        return [];
    }
}

// KATALOG: Kanalları ekrana dizer
globalThis.getCatalog = async (type, id) => {
    const list = await getChannels();
    return {
        metas: list.map(ch => ({
            id: ch.id,
            type: "tv",
            name: ch.name,
            poster: ch.logo,
            description: "Canlı Yayın"
        }))
    };
};

// META: Kanala tıklandığında detayları açar
globalThis.getMeta = async (type, id) => {
    if (id.startsWith("tmdb_")) {
        return { meta: { id: id, type: type, videos: [{ id: id, title: "M3U Linkini Kullan" }] } };
    }
    const list = await getChannels();
    const ch = list.find(c => c.id === id);
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

// STREAM: Linki oynatıcıya gönderir
globalThis.getStreams = async (type, id) => {
    const list = await getChannels();
    
    // TMDB Araması için basit eşleşme (Opsiyonel: Geliştirilebilir)
    let streamUrl = null;
    let ch = list.find(c => c.id === id);
    
    if (ch) {
        streamUrl = ch.url;
    }

    return {
        streams: streamUrl ? [{ name: "MC Player", url: streamUrl }] : []
    };
};
