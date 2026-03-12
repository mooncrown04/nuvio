const M3U_URL = "https://api.codetabs.com/v1/proxy?quest=https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

// M3U dosyasini indirip diziye ceviren yardimci fonksiyon
async function parseM3U() {
    const res = await fetch(M3U_URL);
    const text = await res.text();
    const lines = text.split('\n');
    const channels = [];

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith("#EXTINF")) {
            const info = lines[i];
            const name = info.split(',').pop().trim();
            // Logo varsa m3u'dan cek, yoksa varsayilan koy
            const logoMatch = info.match(/tvg-logo="([^"]+)"/);
            const logo = logoMatch ? logoMatch[1] : "https://i.imgur.com/Dlsm9XP.png";
            const url = lines[i + 1] ? lines[i + 1].trim() : "";

            if (url.startsWith("http")) {
                channels.push({
                    id: "nv_" + btoa(encodeURIComponent(name)).substring(0, 10),
                    name: name,
                    logo: logo,
                    url: url
                });
            }
        }
    }
    return channels;
}

// 1. ADIM: KATALOG OLUSTURMA
globalThis.getCatalog = async function(type, id) {
    const channels = await parseM3U();
    const metas = channels.map(ch => ({
        id: ch.id,
        type: "tv",
        name: ch.name,
        poster: ch.logo,
        description: ch.name + " Canlı Yayın",
        releaseInfo: "LIVE"
    }));
    return { metas };
};

// 2. ADIM: FILM/KANAL HAKKINDAKI BOLUM
globalThis.getMeta = async function(type, id) {
    const channels = await parseM3U();
    const channel = channels.find(ch => ch.id === id);
    return {
        meta: {
            id: id,
            type: "tv",
            name: channel ? channel.name : "Bilinmeyen Kanal",
            poster: channel ? channel.logo : "",
            background: channel ? channel.logo : "",
            description: "M3U üzerinden dinamik olarak getirildi.",
            videos: [{ id: id, title: "Canlı Yayını Başlat" }]
        }
    };
};

// 3. ADIM: LINKLERIN GELDIGI BOLUM
globalThis.getStreams = async function(type, id) {
    const channels = await parseM3U();
    const channel = channels.find(ch => ch.id === id);
    if (channel) {
        return {
            streams: [{
                name: "MC-DYNAMIC",
                title: channel.name + " - HD",
                url: channel.url
            }]
        };
    }
    return { streams: [] };
};
