// filmmodu.js (Güncellenmiş Yerel Dosya)

async function loadRemoteProviders() {
    // Yüklemek istediğiniz tüm linkleri bu diziye ekleyebilirsiniz
    const remoteUrls = [
        "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/eklentiler/dizix.js",
        "https://raw.githubusercontent.com/hihihihihiiray/plugins/refs/heads/main/providers/filmmodu.js",
        "https://raw.githubusercontent.com/Wekmed/nuvio/refs/heads/main/providers/diziyo.js",
        "https://raw.githubusercontent.com/Wekmed/nuvio/refs/heads/main/providers/diziyou.js",
        "https://raw.githubusercontent.com/Wekmed/nuvio/refs/heads/main/providers/hdfilmcehennemi.js",
        // Yeni linkleri buraya virgül koyarak ekleyebilirsiniz:
        // "https://ornek.com/yeni-saglayici.js"
    ];

    // Hepsini sırayla yüklemek için döngü kullanıyoruz
    for (const url of remoteUrls) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP hatası! Durum: ${response.status}`);
            }
            const code = await response.text();
            
            // Uzak sunucudaki kodu çalıştırır
            eval(code);
            console.log(`Başarıyla yüklendi: ${url}`);
        } catch (e) {
            console.error(`Sağlayıcı yüklenemedi (${url}):`, e);
        }
    }
}

loadRemoteProviders();
