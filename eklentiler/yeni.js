/**
 * @name PornHub
 * @author Kraptor123
 * @version 1.0.0
 */

const mainUrl = "https://www.pornhub.com";

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Cookie': 'hasVisited=1; accessAgeDisclaimerPH=1'
};

async function search(query, page = 1) {
    const url = `${mainUrl}/video/search?search=${encodeURIComponent(query)}&page=${page}`;
    const res = await http.get(url, { headers });
    const doc = jsparse(res.body);

    return doc.select("div.gridWrapper li.pcVideoListItem").map(item => {
        const link = item.selectFirst("a");
        const img = item.selectFirst("img");
        return {
            title: img?.attr("alt") || "No Title",
            url: mainUrl + link?.attr("href"),
            poster: img?.attr("data-mediumthumb") || img?.attr("src")
        };
    });
}

async function loadLinks(videoUrl, callback) {
    const res = await http.get(videoUrl, { headers, referer: mainUrl + "/" });
    const html = res.body;

    // flashvars içindeki JSON verisini ayıklama
    const flashvarsMatch = html.match(/var flashvars_\d+ = ({.*?});/s) || html.match(/var flashvars = ({.*?});/s);
    
    if (flashvarsMatch) {
        try {
            const data = JSON.parse(flashvarsMatch[1]);
            const definitions = data.mediaDefinitions;

            definitions.forEach(def => {
                if (def.videoUrl && def.videoUrl !== "") {
                    callback({
                        name: `PornHub - ${def.quality}p`,
                        url: def.videoUrl,
                        quality: parseInt(def.quality),
                        isM3u8: def.format === "hls" || def.videoUrl.includes(".m3u8")
                    });
                }
            });
        } catch (e) {
            console.error("Link parsing error:", e);
        }
    }
}

// Nuvio'nun beklediği export yapısı
export default {
    search,
    loadLinks,
    mainPage: [
        { title: "Featured", url: `${mainUrl}/video` },
        { title: "Trending", url: `${mainUrl}/video?o=tr` }
    ]
};
