/**
 * MoOnCrOwN Ultimate Engine - Nuvio Kararlı Sürüm
 * Bu dosya manifest.json içindeki "filename" kısmıyla aynı isimde olmalıdır.
 */

const M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";
let channelsCache = null;

// M3U dosyasını indirip işleyen ana motor
async function getChannels() {
    if (channelsCache) return channelsCache;

    try {
        // Doğrudan fetch (Eğer cihaz takılırsa proxy eklenebilir)
        const response = await fetch(M3U_URL);
        if (!response.ok) throw new Error("M3U dosyasına erişilemedi");
        
        const text = await response.text();
        const lines = text.split('\n');
        const list = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith("#EXTINF")) {
                // Kanal ismini temizle (Virgülden sonrasını al)
                const namePart = line.split(',').pop().trim();
                // İsmi daha da temizle (nv_ veya tmdb_ eklerini ayıkla)
                const cleanName = namePart.split(',')[0].replace(/nv_|tmdb_/g, '').trim();
                
                // URL bir sonraki satırdadır
                const url = lines[i + 1] ? lines[i + 1].trim() : "";
                
                // Logo ve Grup bilgilerini ayıkla
                const logoMatch = line.match(/tvg-logo="([^"]+)"/);
                const groupMatch = line.match(/group-title="([^"]+)"/);

                if (url.startsWith("http")) {
                    list.push({
                        // Manifest'teki nv_ prefixine uygun güvenli ID
                        id: "nv_" + cleanName.toLowerCase().replace(/[^a-z0-9]/g, ""),
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

// 1. KATALOG: Kanalları Nuvio ana sayfasında ve Favori sekmesinde gösterir
globalThis.getCatalog = async function(type, id, extra) {
    const list = await getChannels();
    let filtered = list;

    // Kategori (Genre) filtrelemesi
    if (extra && extra.genre) {
        filtered = list.filter(ch => ch.group.toUpperCase().includes(extra.genre.toUpperCase()));
    }
    
    // Arama filtrelemesi
    if (extra && extra.search) {
        filtered = list.filter(ch => ch.name.toLowerCase().includes(extra.search.toLowerCase()));
    }

    return {
        metas: filtered.map(ch => ({
            id: ch.id,
            type: "tv",
            name: ch.name,
            poster: ch.logo,
            description: ch.group
        }))
    };
};

// 2. META: Kanala tıklandığında detayları ve oynat tuşunu getirir
globalThis.getMeta = async function(type, id) {
    const list = await getChannels();
    
    // TMDB Araması için (Arama sonuçlarında eklentinin görünmesini sağlar)
    if (id.startsWith("tmdb_")) {
        return {
            meta: {
                id: id,
                type: type,
                videos: [{ id: id, title: "M3U Listesinde Ara" }]
            }
        };
    }

    const ch = list.find(c => c.id === id);
    return {
        meta: {
            id: id,
            type: "tv",
            name: ch ? ch.name : "Canlı TV",
            poster: ch ? ch.logo : "",
            videos: [{ id: id, title: "Yayın Akışını Başlat" }]
        }
    };
};

// 3. STREAM: Oynat tuşuna basıldığında ham linki video oynatıcıya gönderir
globalThis.getStreams = async function(type, id) {
    const list = await getChannels();

    // Eğer TMDB ID'si ile gelindiyse (Gelişmiş arama eşleşmesi buraya eklenebilir)
    if (id.startsWith("tmdb_")) {
        // Henüz eşleşme mantığı yoksa boş dönmemesi için test yapılabilir
    }

    const ch = list.find(c => c.id === id);
    if (ch) {
        return {
            streams: [{
                name: "MoOnCrOwN",
                title: ch.name,
                url: ch.url
            }]
        };
    }
    return { streams: [] };
};
