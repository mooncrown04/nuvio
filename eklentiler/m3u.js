/**
 * MoOnCrOwN - Live TV Engine (V12)
 * Bol logcat çıktıları ile hata ayıklama modu aktif.
 */

const M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

// 1. KATALOG FONKSİYONU (Kanal listesini çeker ve Nuvio'ya basar)
const getCatalog = async function(type, id, extra) {
    console.error(">>> MOONCROWN: Katalog isteği geldi. ID: " + id);

    try {
        const response = await fetch(M3U_URL);
        if (!response.ok) throw new Error("M3U dosyasi indirilemedi! Status: " + response.status);
        
        const data = await response.text();
        const lines = data.split('\n');
        const metas = [];

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith("#EXTINF")) {
                const name = lines[i].split(',').pop().trim();
                const streamUrl = lines[i + 1] ? lines[i + 1].trim() : "";
                
                if (streamUrl.startsWith("http")) {
                    metas.push({
                        id: "mc_" + encodeURIComponent(name),
                        type: "tv",
                        name: name,
                        poster: "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/logo.png",
                        description: "Canlı Yayın: " + name
                    });
                }
            }
        }

        console.error(">>> MOONCROWN: Katalog basariyla olusturuldu. Toplam Kanal: " + metas.length);
        return { metas: metas };

    } catch (error) {
        console.error(">>> MOONCROWN KRITIK HATA (Catalog): " + error.message);
        return { metas: [] };
    }
};

// 2. STREAM FONKSİYONU (Kanala tıklandığında linki çözer)
const getStreams = async function(type, id) {
    console.error(">>> MOONCROWN: Stream isteği geldi. ID: " + id);

    if (!id.startsWith("mc_")) {
        console.error(">>> MOONCROWN: Gecersiz ID prefixi!");
        return { streams: [] };
    }

    try {
        const channelName = decodeURIComponent(id.replace("mc_", ""));
        console.error(">>> MOONCROWN: Aranan Kanal: " + channelName);

        const response = await fetch(M3U_URL);
        const data = await response.text();
        const lines = data.split('\n');

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes(channelName)) {
                const streamUrl = lines[i + 1] ? lines[i + 1].trim() : "";
                if (streamUrl.startsWith("http")) {
                    console.error(">>> MOONCROWN: Link Bulundu: " + streamUrl);
                    return {
                        streams: [{
                            title: "MoOnCrOwN HLS Player",
                            url: streamUrl,
                            behaviorHints: {
                                proxyHeaders: { "User-Agent": "VLC/3.0.18" },
                                notSearchable: true
                            }
                        }]
                    };
                }
            }
        }

        console.error(">>> MOONCROWN: Link bulunamadi!");
        return { streams: [] };

    } catch (error) {
        console.error(">>> MOONCROWN KRITIK HATA (Stream): " + error.message);
        return { streams: [] };
    }
};

// Global Tanımlamalar (Nuvio ve Stremio motorları için)
globalThis.getCatalog = getCatalog;
globalThis.getStreams = getStreams;

// Bazı eski motorlar için exports
if (typeof exports !== 'undefined') {
    exports.getCatalog = getCatalog;
    exports.getStreams = getStreams;
}

console.error(">>> MOONCROWN: m3u.js basariyla yuklendi ve hazır! <<<");
