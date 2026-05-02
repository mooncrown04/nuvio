// filmmodu.js (Yerel dosyanın içeriği)
async function loadRemoteProvider() {
    const remoteUrl = "https://raw.githubusercontent.com/hihihihihiiray/plugins/refs/heads/main/providers/filmmodu.js";
    try {
        const response = await fetch(remoteUrl);
        const code = await response.text();
        // Uzak sunucudaki kodu çalıştırır
        eval(code); 
    } catch (e) {
        console.error("Sağlayıcı yüklenemedi:", e);
    }
}

loadRemoteProvider();
