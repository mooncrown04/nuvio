/**
 * V7 - FINAL REGISTRATION
 */

const getStreams = async function(tmdbId, mediaType, seasonNum, episodeNum, channelName) {
    // BU LOGU GÖRMEDEN DURMAK YOK!
    console.error("CRITICAL_LOG: PROVIDER_STARTED_CHECK");
    
    return new Promise(async (resolve) => {
        try {
            const url = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";
            
            // Sertifika hatalarını aşmak için en yalın fetch
            const response = await fetch(url);
            const text = await response.text();
            const lines = text.split('\n');
            
            let results = [];
            // Filtreleme yapmadan TRT olanları direkt döndür (Test amaçlı)
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes("#EXTINF") && lines[i].toLowerCase().includes("trt")) {
                    let streamUrl = lines[i+1]?.trim();
                    if (streamUrl && streamUrl.startsWith("http")) {
                        results.push({
                            name: "📡 " + lines[i].split(',').pop().trim(),
                            url: streamUrl
                        });
                    }
                }
            }
            
            console.error("CRITICAL_LOG: RESULTS_FOUND: " + results.length);
            resolve(results);
        } catch (e) {
            console.error("CRITICAL_LOG: FETCH_ERROR: " + e.message);
            resolve([]);
        }
    });
};

// Her yere kayıt et ki uygulama hangisini okuyorsa onu bulsun
globalThis.getStreams = getStreams;
if (typeof window !== 'undefined') { window.getStreams = getStreams; }
