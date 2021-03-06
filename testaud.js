const fs = require('fs');
const { EbmlStreamDecoder, EbmlStreamEncoder, EbmlTagId } = require('./lib');
const { Transform } = require('stream');

const ebmlDecoder = new EbmlStreamDecoder({
    bufferTagIds: [
        EbmlTagId.TrackEntry
    ]
});
const ebmlEncoder = new EbmlStreamEncoder();

let strippedTracks = {};

fs.createReadStream('media/audiosample.webm')
    .pipe(ebmlDecoder)
    .pipe(new Transform({
        transform(chunk, enc, cb) {
            if(chunk.id === EbmlTagId.TrackEntry) {
                if(chunk.Children.find(c => c.id === EbmlTagId.TrackType).data != 2) {
                    strippedTracks[chunk.Children.find(c => c.id === EbmlTagId.TrackNumber).data] = true;
                    chunk = null;
                }
            } else if(chunk.id === EbmlTagId.Block || chunk.id === EbmlTagId.SimpleBlock) {
                if(strippedTracks[chunk.track]) {
                    chunk = null;
                }
            }            
            cb(null, chunk);
        },
        readableObjectMode: true,
        writableObjectMode: true
    }))
    .pipe(ebmlEncoder)
    .pipe(fs.createWriteStream('media/audioout.webm'));