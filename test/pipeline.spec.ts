import assert from 'assert';
import { Buffer } from 'buffer/';

import { EbmlStreamDecoder } from '../src/EbmlStreamDecoder';
import { EbmlStreamEncoder } from '../src/EbmlStreamEncoder';
import { EbmlTag } from '../src/models/EbmlTag';
import { EbmlTagId } from '../src/models/enums/EbmlTagId';
import { EbmlTagFactory } from '../src/models/EbmlTagFactory';
import { EbmlTagPosition } from '../src/models/enums/EbmlTagPosition';
import "jasmine";
import { Block } from '../src/models/tags/Block';

describe('ebml', () => {
  describe('Pipeline', () => {
    it('should output input buffer', done => {
      const decoder = new EbmlStreamDecoder();
      const encoder = new EbmlStreamEncoder();
      const buffer = Buffer.from([
        0x1a,
        0x45,
        0xdf,
        0xa3,
        0x84,
        0x42,
        0x86,
        0x81,
        0x00,
      ]);

      encoder.on('data', chunk => {
        assert.strictEqual(chunk.toString('hex'), buffer.toString('hex'));
        encoder.on('finish', done);
        done();
      });
      encoder.on('finish', done);
      decoder.pipe(encoder);
      decoder.write(buffer);
      decoder.end();
    });

    it('should support end === -1', done => {
      const decoder = new EbmlStreamDecoder();
      const encoder = new EbmlStreamEncoder();

      encoder.write(
        Object.assign(EbmlTagFactory.create(EbmlTagId.Cluster), {
          position: EbmlTagPosition.Start,
          size: -1
        })
      );
      encoder.write(
        Object.assign(EbmlTagFactory.create(EbmlTagId.Cluster), {
          position: EbmlTagPosition.End,
          size: -1
        })
      );

      encoder.pipe(decoder).on('data', (tag: EbmlTag) => {
        assert.strictEqual(tag.id, EbmlTagId.Cluster);
        //assert.strictEqual(data[1].start, 0);
        assert.strictEqual(tag.size, -1);
        done();
      });
      encoder.pipe(decoder).on('finish', done);
      encoder.end();
    });

    it('should encode and decode Blocks correctly', (done) => {
      const decoder = new EbmlStreamDecoder();
      const encoder = new EbmlStreamEncoder();

      let block = EbmlTagFactory.create(EbmlTagId.Block);
      block.track = 5;
      block.invisible = true;
      block.payload = Buffer.alloc(50);
      for(let i = 0; i < block.payload.length; i++) {
        block.payload[i] = Math.floor(Math.random()*255);
      }

      encoder.write(
        block
      );

      encoder.pipe(decoder).on('data', (tag: Block) => {
        if(tag) {
          assert.strictEqual(tag.id, EbmlTagId.Block);
          assert.strictEqual(tag.track, block.track);
          assert.strictEqual(tag.invisible, block.invisible);
          assert.strictEqual(tag.payload.toString('hex'), block.payload.toString('hex'));
          done();
        }
      });
      encoder.pipe(decoder).on('finish', done);
      encoder.end();
    })
  });
});
