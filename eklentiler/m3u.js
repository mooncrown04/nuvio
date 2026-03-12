/**
 * MoOnCrOwN Ultimate Dynamic Engine
 * M3U -> Katalog, Meta ve Stream Dönüştürücü
 */

const RAW_M3U = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";
// SSL ve CORS sorunlarını aşmak için proxy kullanıyoruz
const PROXY_URL = "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(RAW_M3U);

async function fetchM3U() {
    try {
        const response = await fetch(PROXY_URL);
        const data = await response.text();
        const lines = data.split('\n');
        const channels = [];

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("#EXTINF")) {
                const infoLine = lines[i];
                const name = infoLine.split(',').pop().trim();
                const url = lines[i + 1] ? lines[i + 1].trim() : "";
                
                // M3U içinde tvg-logo varsa çek, yoksa varsayılan koy
                const logoMatch = infoLine.match(/tvg-logo="([^"]+)"/);
                const logo = logoMatch ? logoMatch[1] : "https://i.imgur.com/Dlsm9XP.png";

                if (url.startsWith("http")) {
                    channels.push({
                        // İsimden benzersiz ID oluşturma
                        id: "nv_" + btoa(encodeURIComponent(name)).substring(0, 10).toLowerCase(),
                        name: name,
                        url: url,
                        logo: logo
                    });
                }
            }
        }
        return channels;
    } catch (e) {
        console.error("M3U Okuma Hatası:", e);
        return [];
    }
}

// 1. KATALOG MANTIĞI: M3U'daki her satırı bir kanal kartına dönüştürür
globalThis.getCatalog = async function(type, id) {
    const list = await fetchM3U();
    return {
        metas: list.map(ch => ({
            id: ch.id,
            type: "tv",
            name: ch.name,
            poster: ch.logo,
            description: "M3U Canlı Yayın"
        }))
    };
};

// 2. META MANTIĞI: Kanala tıklandığında açılan detay sayfası
globalThis.getMeta = async function(type, id) {
    const list = await fetchM3U();
    const ch = list.find(c => c.id === id);
    
    // Eğer TMDB ID'si gelirse (başka katalogdan tıklandıysa)
    if (id.startsWith("tmdb_")) {
        return {
            meta: {
                id: id,
                type: type,
                videos: [{ id: id, title: "M3U üzerinden oynat" }]
            }
        };
    }

    return {
        meta: {
            id: id,
            type: "tv",
            name: ch ? ch.name : "Canlı Kanal",
            poster: ch ? ch.logo : "",
            background: ch ? ch.logo : "",
            videos: [{ id: id, title: "Yayını Başlat" }]
        }
    };
};

// 3. STREAM MANTIĞI: "Oynat" dendiğinde linki verir
globalThis.getStreams = async function(type, id) {
    const list = await fetchM3U();
    
    // TMDB ID'si ile gelindiyse isim eşleşmesi denenebilir (Gelişmiş özellik)
    if (id.startsWith("tmdb_")) {
        // Şimdilik sadece ID bazlı stream döndürüyoruz
        // Buraya TMDB ID'sini M3U'daki bir kanal ismiyle eşleştirme mantığı eklenebilir.
    }

    const ch = list.find(c => c.id === id);
    if (ch) {
        return {
            streams: [{
                name: "NUVIO-MC",
                title: ch.name + "\n1080p | Canlı",
                url: ch.url
            }]
        };
    }
    return { streams: [] };
};
