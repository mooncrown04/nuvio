/**
 * JetFilmizle — MoOnCrOwN V31 (Dynamic Hash Hunter)
 */

async function getStreams(id, mediaType, season, episode) {
    // 1. ADIM: Hedef sayfa (Bu sayfaya girmeden o bölüme özel hash'i alamayız)
    const targetUrl = `https://jetfilmizle.net/dizi/cobra-kai/${season}-sezon-${episode}-bolum`;

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.google.com/'
            }
        });

        const html = await response.text();

        // 2. ADIM: Sayfanın içinde o bölüme özel üretilen o devasa kodu arıyoruz
        // Senin verdiğin örnek: ABASGR9XRlUcCT4PDBYHAAhPChIlHUVCWgcFAkYcBQYOAxZwR...
        const workerRegex = /workers\.dev\/[i|e]\/([a-zA-Z0-9_-]{50,})/;
        const match = html.match(workerRegex);

        if (match && match[1]) {
            const newHash = match[1]; // İşte bu 6. bölüme özel olan yeni hash!
            console.error(`[SUCCESS] Yeni Bölüm Hash'i Bulundu: ${newHash.substring(0, 10)}...`);

            return [{
                name: "JetFilmizle",
                title: `⌜ MoOnCrOwN ⌟ | S${season} E${episode}`,
                url: `https://videopark.erikkalinina1994.workers.dev/i/${newHash}`,
                type: 'video',
                headers: { 
                    'Referer': 'https://videopark.top/',
                    'Origin': 'https://videopark.top'
                }
            }];
        } else {
            console.error("[FAIL] Sayfada yeni hash bulunamadı. Muhtemelen 58361 engeline takıldık.");
        }
    } catch (e) {
        console.error("[ERROR] V31: " + e.message);
    }
    return [];
}
