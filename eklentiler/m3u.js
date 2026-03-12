/**
 * MoOnCrOwN Dinamik M3U Motoru
 */

const M3U_URL = "https://api.codetabs.com/v1/proxy?quest=https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

// M3U dosyasını işleyip diziye çeviren yardımcı fonksiyon
async function getChannels() {
    try {
        const res = await fetch(M3U_URL);
        const text = await res.text();
        const lines = text.split('\n');
        const channels = [];

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith("#EXTINF")) {
                const name = lines[i].split(',').pop().trim();
                const url = lines[i + 1] ? lines[i + 1].trim() : "";
                if (url.startsWith("http")) {
                    channels.push({
                        // İsimden benzersiz bir ID oluşturur (nv_trt1 gibi)
                        id: "nv_" + btoa(encodeURIComponent(name)).substring(0, 8).toLowerCase(),
                        name: name,
                        url: url
                    });
                }
            }
        }
        return channels;
    } catch (e) { return []; }
}

// 1. KATALOG BÖLÜMÜ (Giriş)
globalThis.getCatalog = async function(type, id) {
    const channels = await getChannels();
    return {
        metas: channels.map(ch => ({
            id: ch.id,
            type: "tv",
            name: ch.name,
            poster: "https://i.imgur.com/Dlsm9XP.png", // Varsayılan logo
            description: "Canlı Yayın: " + ch.name
        }))
    };
};

// 2. META BÖLÜMÜ (Hakkında/Detay)
globalThis.getMeta = async function(type, id) {
    const channels = await getChannels();
    const ch = channels.find(c => c.id === id);
    return {
        meta: {
            id: id,
            type: "tv",
            name: ch ? ch.name : "Kanal",
            poster: "https://i.imgur.com/Dlsm9XP.png",
            description: "M3U Listesinden otomatik eşleşti.",
            videos: [{ id: id, title: "Canlı Yayını Başlat" }]
        }
    };
};

// 3. STREAM BÖLÜMÜ (Linkler)
globalThis.getStreams = async function(type, id) {
    const channels = await getChannels();
    const ch = channels.find(c => c.id === id);
    if (ch) {
        return {
            streams: [{
                name: "MC-PLAYER",
                title: ch.name,
                url: ch.url
            }]
        };
    }
    return { streams: [] };
};
