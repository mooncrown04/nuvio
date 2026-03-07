function fetchWithBypass(url, headers) {
    // Eğer Nuvio'da app.fetchCloudflare veya benzeri varsa
    if (typeof app !== 'undefined' && app.fetchCloudflare) {
        return app.fetchCloudflare(url, { headers: headers });
    }
    
    // Yoksa normal fetch
    return fetch(url, { headers: headers });
}
