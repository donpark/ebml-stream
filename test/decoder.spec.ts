import assert from 'assert';
import { Buffer } from 'buffer';

import { EbmlStreamDecoder as Decoder } from '../src/EbmlStreamDecoder';
import "jasmine";
import { EbmlTagPosition } from '../src/models/enums/EbmlTagPosition';
import { EbmlElementType } from '../src/models/enums/EbmlElementType';
import { EbmlDataTag } from '../src/models/tags/EbmlDataTag';

describe('EBML', () => {
  describe('Decoder', () => {
    it('should wait for more data if a tag is longer than the buffer', () => {
      const decoder = new Decoder();
      decoder.write(Buffer.from([0x1a, 0x45]));

      assert.strictEqual(2, decoder.buffer.length);
    });

    it('should clear the buffer after a full tag is written in one chunk', () => {
      const decoder = new Decoder();
      decoder.write(Buffer.from([0x42, 0x86, 0x81, 0x01]));

      assert.strictEqual(0, decoder.buffer.length);
    });

    it('should clear the buffer after a full tag is written in multiple chunks', () => {
      const decoder = new Decoder();

      decoder.write(Buffer.from([0x42, 0x86]));
      decoder.write(Buffer.from([0x81, 0x01]));

      assert.strictEqual(0, decoder.buffer.length);
    });

    it('should increment the cursor on each step', () => {
      const decoder = new Decoder();

      decoder.write(Buffer.from([0x42])); // 4

      assert.strictEqual(1, decoder.buffer.length);

      decoder.write(Buffer.from([0x86])); // 5

      assert.strictEqual(2, decoder.buffer.length);

      decoder.write(Buffer.from([0x81])); // 6 & 7

      assert.strictEqual(3, decoder.buffer.length);

      decoder.write(Buffer.from([0x01])); // 6 & 7

      assert.strictEqual(0, decoder.buffer.length);
    });

    it('should emit correct tag events for simple data', done => {
      const decoder = new Decoder();
      decoder.on('data', (tag: EbmlDataTag) => {
        assert.strictEqual(tag.position, EbmlTagPosition.Content);
        //assert.strictEqual(tag, 0x286);
        assert.strictEqual(tag.id.toString(16), '4286');
        assert.strictEqual(tag.size, 0x01);
        assert.strictEqual(tag.type, EbmlElementType.UnsignedInt);
        assert.deepStrictEqual(tag.data, 1);
        done();
        decoder.on('finish', done);
      });
      decoder.on('finish', done);
      decoder.write(Buffer.from([0x42, 0x86, 0x81, 0x01]));
      decoder.end();
    });

    it('should emit correct EBML tag events for master tags', done => {
      const decoder = new Decoder();

      decoder.on('data', (tag: EbmlDataTag) => {
        assert.strictEqual(tag.position, EbmlTagPosition.Start);
        //assert.strictEqual(tag, 0x0a45dfa3);
        assert.strictEqual(tag.id.toString(16), '1a45dfa3');
        assert.strictEqual(tag.size, 0);
        assert.strictEqual(tag.type, EbmlElementType.Master);
        assert.strictEqual(tag.data, undefined); // eslint-disable-line no-undefined
        done();
        decoder.on('finish', done);
      });
      decoder.on('finish', done);

      decoder.write(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x80]));
      decoder.end();
    });

    it('should emit correct EBML:end events for master tags', done => {
      const decoder = new Decoder();
      let tags = 0;
      decoder.on('data', (tag: EbmlDataTag) => {
        if (tag.position === EbmlTagPosition.End) {
          assert.strictEqual(tags, 2); // two tags
          //assert.strictEqual(data.tag, 0x0a45dfa3);
          assert.strictEqual(tag.id.toString(16), '1a45dfa3');
          assert.strictEqual(tag.size, 4);
          assert.strictEqual(tag.type, EbmlElementType.Master);
          assert.strictEqual(tag.data, undefined); // eslint-disable-line no-undefined
          done();
          decoder.on('finish', done);
        } else {
          tags += 1;
        }
      });
      decoder.on('finish', done);

      decoder.write(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
      decoder.write(Buffer.from([0x84, 0x42, 0x86, 0x81, 0x00]));
      decoder.end();
    });
  });
});
