/**
 * MoOnCrOwN Dinamik Motor - SSL Bypass Sürümü
 */

// GitHub SSL hatasını aşmak için HTTPS -> HTTP dönüşümü yapan proxy kullanıyoruz
const RAW_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";
const M3U_URL = "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(RAW_URL);

async function getM3UData() {
    try {
        const res = await fetch(M3U_URL);
        const text = await res.text();
        const lines = text.split('\n');
        const list = [];
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("#EXTINF")) {
                const name = lines[i].split(',').pop().trim();
                const url = lines[i + 1] ? lines[i + 1].trim() : "";
                if (url.startsWith("http")) {
                    list.push({
                        id: "nv_" + btoa(encodeURIComponent(name)).substring(0, 8).toLowerCase(),
                        name: name,
                        url: url
                    });
                }
            }
        }
        return list;
    } catch (e) { return []; }
}

globalThis.getCatalog = async function(type, id) {
    const channels = await getM3UData();
    return {
        metas: channels.map(ch => ({
            id: ch.id,
            type: "tv",
            name: ch.name,
            poster: "https://i.imgur.com/Dlsm9XP.png"
        }))
    };
};

globalThis.getMeta = async function(type, id) {
    const channels = await getM3UData();
    const ch = channels.find(c => c.id === id);
    return {
        meta: {
            id: id,
            type: "tv",
            name: ch ? ch.name : "Kanal",
            poster: "https://i.imgur.com/Dlsm9XP.png",
            videos: [{ id: id, title: "Yayını Başlat" }]
        }
    };
};

globalThis.getStreams = async function(type, id) {
    const channels = await getM3UData();
    const ch = channels.find(c => c.id === id);
    return {
        streams: ch ? [{ name: "NUVIO", url: ch.url }] : []
    };
};
