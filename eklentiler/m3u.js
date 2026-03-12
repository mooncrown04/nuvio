/**
 * MoOnCrOwN Ultimate Engine - Nuvio Kararlı Sürüm
 * Manifest ve Scraper tek bir dosyada.
 */

// 1. MANIFEST TANIMI (Nuvio bu objeyi en başta okur)
const manifest = {
    "id": "org.stremio.m3u-epg-addon",
    "version": "1.2.0",
    "name": "MoOnCrOwN M3U",
    "description": "MoOnCrOwN M3U Scraper for Nuvio",
    "resources": ["catalog", "stream", "meta"],
    "types": ["tv", "movie"],
    "idPrefixes": ["iptv_"],
    "catalogs": [
        {
            "type": "tv",
            "id": "iptv_channels",
            "name": "MoOnCrOwN TV Kanalları",
            "extra": [
                { "name": "genre" },
                { "name": "search" },
                { "name": "skip" }
            ],
            "genres": ["ULUSAL KANALLAR", "SPOR KANALLARI", "HABER KANALLARI", "SİNEMA KANALLARI", "All Channels"]
        },
        {
            "type": "movie",
            "id": "iptv_movies",
            "name": "MoOnCrOwN Filmler",
            "extra": [{ "name": "search" }, { "name": "skip" }]
        }
    ],
    "behaviorHints": {
        "configurable": true,
        "configurationRequired": false
    }
};

// Nuvio'nun manifesti görmesi için export ediyoruz
globalThis.getManifest = function() {
    return manifest;
};

// -------------------------------------------------------------------------

const M3U_URL = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";
let channelsCache = null;

// M3U Çözücü Motor
async function getChannels() {
    if (channelsCache) return channelsCache;
    try {
        const response = await fetch(M3U_URL);
        const text = await response.text();
        const lines = text.split('\n');
        const list = [];
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith("#EXTINF")) {
                const logoMatch = line.match(/tvg-logo="([^"]+)"/i);
                const groupMatch = line.match(/group-title="([^"]+)"/i);
                const namePart = line.substring(line.lastIndexOf(',') + 1).trim();
                
                let url = "";
                for (let j = i + 1; j < lines.length; j++) {
                    let nextLine = lines[j].trim();
                    if (nextLine && !nextLine.startsWith("#")) {
                        url = nextLine;
                        break;
                    }
                    if (nextLine.startsWith("#EXTINF")) break;
                }

                if (url) {
                    list.push({
                        id: "iptv_" + namePart.toLowerCase().replace(/[^a-z0-9]/g, ""),
                        name: namePart,
                        url: url,
                        logo: logoMatch ? logoMatch[1] : "https://i.imgur.com/Dlsm9XP.png",
                        group: groupMatch ? groupMatch[1] : "All Channels"
                    });
                }
            }
        }
        channelsCache = list;
        return list;
    } catch (e) { return []; }
}

// 2. KATALOG YÖNETİMİ
globalThis.getCatalog = async function(args) {
    const { type, id, extra } = args;
    const list = await getChannels();
    let filtered = list;

    if (extra && extra.genre && extra.genre !== "All Channels") {
        filtered = list.filter(ch => ch.group === extra.genre);
    }
    if (extra && extra.search) {
        filtered = list.filter(ch => ch.name.toLowerCase().includes(extra.search.toLowerCase()));
    }

    return {
        metas: filtered.map(ch => ({
            id: ch.id,
            type: type,
            name: ch.name,
            poster: ch.logo,
            background: ch.logo,
            description: ch.group,
            posterShape: type === "movie" ? "poster" : "square"
        }))
    };
};

// 3. META YÖNETİMİ
globalThis.getMeta = async function(args) {
    const list = await getChannels();
    const ch = list.find(c => c.id === args.id);
    if (!ch) return { meta: null };
    return {
        meta: {
            id: ch.id,
            type: args.type,
            name: ch.name,
            poster: ch.logo,
            videos: [{ id: ch.id, title: ch.name }]
        }
    };
};

// 4. STREAM YÖNETİMİ
globalThis.getStreams = async function(args) {
    const list = await getChannels();
    const ch = list.find(c => c.id === args.id);
    if (ch) {
        return {
            streams: [{
                name: "MoOnCrOwN",
                title: ch.name,
                url: ch.url,
                behaviorHints: { isLive: true }
            }]
        };
    }
    return { streams: [] };
};
