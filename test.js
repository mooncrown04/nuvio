const { getStreams } = require('./eklentiler/dizipal.js');


console.log('=== Film Testi ===');
getStreams('27205', 'movie', null, null).then(function(streams) {
    console.log('Film stream sayisi:', streams.length);
    streams.forEach(function(s) {
        console.log(s.name, '-', s.quality, '-', s.url);
        if (s.subtitles && s.subtitles.length > 0) {
            console.log('  Altyazilar:');
            s.subtitles.forEach(function(sub) {
                console.log('   ', sub.lang, '-', sub.url);
            });
        } else {
            console.log('  Altyazi yok');
        }
    });
}).catch(console.error);


console.log('=== Dizi Testi ===');
getStreams('1434', 'tv', 1, 1).then(function(streams) {
    console.log('Dizi stream sayisi:', streams.length);
    streams.forEach(function(s) {
        console.log(s.name, '-', s.quality, '-', s.url);
        if (s.subtitles && s.subtitles.length > 0) {
            console.log('  Altyazilar:');
            s.subtitles.forEach(function(sub) {
                console.log('   ', sub.lang, '-', sub.url);
            });
        } else {
            console.log('  Altyazi yok');
        }
    });
}).catch(console.error);