/**
 * MoOnCrOwN - Live TV (Stremio/Nuvio Protocol V9)
 * Hem katalog (liste) hem de stream (oynatma) sağlar.
 */

const MANIFEST = {
    "id": "org.mooncrown.nuvio.live",
    "version": "1.0.0",
    "name": "MoOnCrOwN Live",
    "description": "GitHub M3U Live TV Addon",
    "resources": ["catalog", "stream", "meta"], // Katalog ve Meta desteği eklendi
    "types": ["tv", "movie"],
    "idPrefixes": ["mc_live_"],
    "catalogs": [
        {
            "id": "mc_live_channels",
            "type": "tv",
            "name": "MoOnCrOwN Canlı TV",
            "extra": [{"name": "search"}, {"name": "genre"}]
        }
    ]
};

const M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

// 1. KATALOG OLUŞTURUCU (Kanalları Ekrana Dizer)
const getCatalog = async function(type, id, extra) {
    if (id !== "mc_live_channels") return { metas: [] };

    try {
        const res = await fetch(M3U_URL);
        const text = await res.text();
        const lines = text.split('\n');
        let metas = [];

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith("#EXTINF")) {
                let name = lines[i].split(',').pop().trim();
                // Benzersiz ID oluştur (mc_live_ + kanal adı)
                let metaId = "mc_live_" + name.toLowerCase().replace(/ /g, "_");

                metas.push({
                    id: metaId,
                    type: "tv",
                    name: name,
                    poster: "https://via.placeholder.com/150?text=" + name, // Geçici logo
                    background: "https://via.placeholder.com/1024x768",
                    description: "Canlı Yayın: " + name
                });
            }
        }
        return { metas: metas };
    } catch (e) {
        return { metas: [] };
    }
};

// 2. STREAM ÇÖZÜCÜ (Kanala Tıklandığında Linki Verir)
const getStreams = async function(type, id) {
    if (!id.startsWith("mc_live_")) return { streams: [] };

    try {
        const res = await fetch(M3U_URL);
        const text = await res.text();
        const lines = text.split('\n');
        
        // ID'den kanal adını geri çıkar
        let targetName = id.replace("mc_live_", "").replace(/_/g, " ");

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(targetName)) {
                let streamUrl = lines[i+1]?.trim();
                if (streamUrl && streamUrl.startsWith("http")) {
                    return {
                        streams: [{
                            title: "YAYINI BAŞLAT",
                            url: streamUrl,
                            behaviorHints: {
                                notSearchable: true,
                                proxyHeaders: { "User-Agent": "VLC/3.0.18" }
                            }
                        }]
                    };
                }
            }
        }
    } catch (e) {
        return { streams: [] };
    }
};

// Kayıt İşlemleri
globalThis.manifest = MANIFEST;
globalThis.getCatalog = getCatalog;
globalThis.getStreams = getStreams;
