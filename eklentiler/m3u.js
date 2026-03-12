/**
 * MoOnCrOwN - Live TV Provider (V3 - DEBUG MODE)
 * Adım adım konsol logları eklenmiş sürüm.
 */

const LIVE_SOURCE = "https://raw.githubusercontent.com/mooncrown04/nuvio/refs/heads/master/liste/canli.m3u";

const getStreams = function(tmdbId, mediaType, seasonNum, episodeNum, channelName) {
    return new Promise(function(resolve) {
        console.log("🚀 [Provider] İstek Alındı - Tip:", mediaType, "| Kanal:", channelName, "| ID:", tmdbId);

        // 1. KONTROL: Doğru tipte miyiz?
        if (mediaType !== 'live') {
            console.warn("⚠️ [Provider] Tip 'live' değil, işlem durduruldu.");
            return resolve([]);
        }

        let nameToSearch = channelName || tmdbId;
        if (!nameToSearch) {
            console.error("❌ [Provider] HATA: Aratılacak kanal ismi bulunamadı!");
            return resolve([]);
        }

        const normalize = (text) => {
            if (!text) return "";
            return text.toString().toLowerCase()
                .replace(/[İı]/g, 'i').replace(/[Ğğ]/g, 'g').replace(/[Üü]/g, 'u')
                .replace(/[Şş]/g, 's').replace(/[Öö]/g, 'o').replace(/[Çç]/g, 'c')
                .trim();
        };

        const query = normalize(nameToSearch);
        console.log("🔍 [Provider] Aranıyor (Normalize):", query);

        // 2. KONTROL: M3U Dosyasına Erişim
        console.log("📡 [Provider] M3U indiriliyor:", LIVE_SOURCE);
        
        fetch(LIVE_SOURCE)
            .then(res => {
                if (!res.ok) throw new Error("M3U dosyası indirilemedi! Statü: " + res.status);
                return res.text();
            })
            .then(content => {
                console.log("✅ [Provider] M3U indirildi. Satır sayısı:", content.split('\n').length);
                
                const lines = content.split('\n');
                let results = [];
                let matchCount = 0;
                
                for (let i = 0; i < lines.length; i++) {
                    let line = lines[i];
                    
                    if (line.startsWith("#EXTINF")) {
                        let normLine = normalize(line);

                        if (normLine.includes(query)) {
                            matchCount++;
                            console.log(`🎯 [Match #${matchCount}] Satır bulundu:`, line.substring(0, 50) + "...");

                            let qualityMatch = line.match(/tvg-quality="([^"]*)"/i);
                            let langMatch = line.match(/tvg-language="([^"]*)"/i);
                            let q = (qualityMatch && qualityMatch[1]) ? ` [${qualityMatch[1]}]` : "";
                            let l = (langMatch && langMatch[1]) ? ` [${langMatch[1]}]` : "";

                            let streamUrl = "";
                            for (let j = 1; j <= 4; j++) {
                                if (lines[i + j] && lines[i + j].trim().startsWith("http")) {
                                    streamUrl = lines[i + j].trim();
                                    break;
                                }
                            }

                            if (streamUrl) {
                                results.push({
                                    name: `📡 CANLI${l}${q}`,
                                    title: line.split(',').pop().trim() || "Kanal",
                                    url: streamUrl,
                                    http_headers: { "User-Agent": "VLC/3.0.18" }
                                });
                            } else {
                                console.error("❌ [Provider] HATA: Kanal bulundu ama altında URL yok! Satır:", i);
                            }
                        }
                    }
                }

                console.log("📊 [Provider] Arama bitti. Toplam Sonuç:", results.length);
                resolve(results.slice(0, 10));
            })
            .catch(err => {
                console.error("🔴 [Provider] KRİTİK HATA:", err.message);
                resolve([]);
            });
    });
};

globalThis.getStreams = getStreams;
