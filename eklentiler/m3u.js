/**
 * MoOnCrOwN Ultimate Engine - Manifest v008 Uyumlu
 */

const M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";
let cache = null;

// M3U dosyasını çeken ve işleyen ana fonksiyon
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
                // İsmi temizle (Virgülden sonrasını al)
                const name = info.split(',').pop().trim();
                const url = lines[i + 1] ? lines[i + 1].trim() : "";
                const logoMatch = info.match(/tvg-logo="([^"]+)"/);
                const groupMatch = info.match(/group-title="([^"]+)"/);

                if (url.startsWith("http")) {
                    list.push({
                        // Manifestteki nv_ prefixine uygun ID üretimi
                        id: "nv_" + name.toLowerCase().replace(/[^a-z0-9]/g, ""),
                        name: name,
                        url: url,
                        logo: logoMatch ? logoMatch[1] : "",
                        genre: groupMatch ? groupMatch[1] : "Genel"
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

// 1. KATALOG: Manifestteki "tum_liste" ID'si ile eşleşmeli
globalThis.getCatalog = async (type, id, extra) => {
    const list = await getChannels();
    let filtered = list;

    // Eğer tür (genre) seçildiyse filtrele
    if (extra && extra.genre) {
        filtered = list.filter(ch => ch.genre.includes(extra.genre));
    }
    
    // Eğer arama yapılıyorsa filtrele
    if (extra && extra.search) {
        filtered = list.filter(ch => ch.name.toLowerCase().includes(extra.search.toLowerCase()));
    }

    return {
        metas: filtered.map(ch => ({
            id: ch.id,
            type: "tv",
            name: ch.name,
            poster: ch.logo,
            description: ch.genre
        }))
    };
};

// 2. META: TMDB veya Yerel ID'yi karşılar
globalThis.getMeta = async (type, id) => {
    const list = await getChannels();
    
    // Eğer TMDB'den geliyorsa (Arama sonucu tıklandıysa)
    if (id.startsWith("tmdb_")) {
        return {
            meta: {
                id: id,
                type: type,
                videos: [{ id: id, title: "M3U İçinde Ara ve Oynat" }]
            }
        };
    }

    const ch = list.find(c => c.id === id);
    return {
        meta: {
            id: id,
            type: "tv",
            name: ch ? ch.name : "Kanal",
            poster: ch ? ch.logo : "",
            videos: [{ id: id, title: "Canlı Yayını İzle" }]
        }
    };
};

// 3. STREAM: Oynatıcıya linki gönderir
globalThis.getStreams = async (type, id) => {
    const list = await getChannels();
    let targetStream = null;

    if (id.startsWith("nv_")) {
        // Doğrudan M3U kanalımız
        const ch = list.find(c => c.id === id);
        if (ch) targetStream = ch.url;
    } else if (id.startsWith("tmdb_")) {
        // TMDB üzerinden gelindiğinde M3U içinde akıllı arama yap (Opsiyonel)
        // Şimdilik test için listedeki ilk uygun yayını deneyebilirsin
    }

    return {
        streams: targetStream ? [{ name: "MoOnCrOwN", url: targetStream }] : []
    };
};
