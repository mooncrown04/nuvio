/**
 * Nuvio Rec-Master - API & Token Auth (V97)
 */

var config = {
    name: "RecTV (API-V97)",
    mainUrl: "https://a.prectv67.lol",
    swKey: "4F5A9C3D9A86FA54EACEDDD635185/c3c5bd17-e37b-4b94-a944-8a3688a30452",
    proxyUrl: "https://goproxy.watchbuddy.tv/proxy/video"
};

// Global değişkenler (Token takibi için)
var _token = null;
var _tokenTime = 0;

/**
 * Kotlin'deki getValidToken mantığı: Token yoksa veya süresi dolmuşsa yeniler.
 */
async function ensureToken() {
    let now = Date.now();
    // Token yoksa veya süresi (30 dk varsayıldı) dolmak üzereyse
    if (!_token || (_tokenTime + 30 * 60 * 1000) < now) {
        console.error("[Kekik-Log] Token Yenileniyor...");
        try {
            let res = await fetch(`${config.mainUrl}/api/attest/nonce`, {
                headers: { "User-Agent": "googleusercontent" }
            });
            let text = await res.text();
            
            // API bazen direkt string, bazen JSON döner. Kotlin'deki try-catch mantığı:
            try {
                let json = JSON.parse(text);
                _token = json.accessToken;
            } catch(e) {
                _token = text.trim();
            }
            
            _tokenTime = now;
            console.error("[Kekik-Log] Yeni Token Alındı.");
        } catch (err) {
            console.error("[Kekik-Log] Token Hatası: " + err);
        }
    }
    return _token;
}

async function getStreams(input) {
    try {
        console.error("[Kekik-Log] 1. API Modu Başlatıldı");
        let query = (typeof input === 'object') ? (input.title || input.name) : input;
        
        // 1. Token'ı Hazırla
        let token = await ensureToken();
        let commonHeaders = {
            "User-Agent": "googleusercontent",
            "Referer": "https://twitter.com/",
            "Authorization": `Bearer ${token}`
        };

        // 2. ARAMA (API üzerinden)
        let sRes = await fetch(`${config.mainUrl}/api/search/${encodeURIComponent(query)}/${config.swKey}/`, {
            headers: commonHeaders
        });
        let sData = await sRes.json();
        
        // API yanıtındaki 'posters' veya 'channels' kısmını al
        let items = (sData.posters || []).concat(sData.channels || []);
        if (items.length === 0) return [];

        let firstItem = items[0];
        console.error("[Kekik-Log] 2. İçerik Bulundu: " + firstItem.title);

        let streams = [];

        // 3. KAYNAK AYRIŞTIRMA
        // Eğer içerik bir dizi ise (Season/Episode API'sine git)
        if (firstItem.type === "serie") {
            console.error("[Kekik-Log] 3. Dizi saptandı, bölümler çekiliyor...");
            let dRes = await fetch(`${config.mainUrl}/api/season/by/serie/${firstItem.id}/${config.swKey}/`, {
                headers: commonHeaders
            });
            let seasons = await dRes.json();
            // Basitlik için ilk sezonun ilk bölümünü alıyoruz (Nuvio yapısına göre geliştirilebilir)
            let firstEp = seasons[0].episodes[0];
            firstItem.sources = firstEp.sources;
        }

        // 4. LİNKLERİ OLUŞTUR
        if (firstItem.sources && firstItem.sources.length > 0) {
            for (let src of firstItem.sources) {
                streams.push({
                    name: `RecTV - ${src.type.toUpperCase()}`,
                    url: `${config.proxyUrl}?url=${encodeURIComponent(src.url)}&referer=${encodeURIComponent("https://twitter.com/")}&ignore_ssl=true`,
                    headers: { 
                        "User-Agent": "googleusercontent", 
                        "Referer": "https://twitter.com/" 
                    }
                });
            }
        }

        console.error(`[Kekik-Log] 4. Başarılı! Yayın sayısı: ${streams.length}`);
        return streams;

    } catch (e) {
        console.error("[Kekik-Log] CRASH: " + e.toString());
        return [];
    }
}

globalThis.getStreams = getStreams;
