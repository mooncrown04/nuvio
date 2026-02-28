const { getStreams } = require('./eklentiler/dizipal.js');



getStreams('157336', 'movie', null, null).then(function(streams) {
    console.log('Film stream sayisi:', streams.length);
    streams.forEach(function(s) {
        console.log(s.name, '-', s.quality, '-', s.url);
    });
}).catch(console.error);



getStreams('1396', 'tv', 1, 1).then(function(streams) {
    console.log('Dizi stream sayisi:', streams.length);
    streams.forEach(function(s) {
        console.log(s.name, '-', s.quality, '-', s.url);
    });
}).catch(console.error);