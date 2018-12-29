import assert from 'assert';
import { Buffer } from 'buffer/';

import { EbmlStreamEncoder } from '../src/EbmlStreamEncoder';
import "jasmine";
import { EbmlTagId } from '../src/models/enums/EbmlTagId';
import { EbmlTag } from '../src/models/EbmlTag';
import { EbmlTagPosition } from '../src/models/enums/EbmlTagPosition';
import { EbmlTagFactory } from '../src/models/EbmlTagFactory';

const invalidTag: EbmlTag = <EbmlTag><any>{
  id: undefined,
  type: <any>'404NotFound',
  position: undefined,
  size: -1,
  data: null
};

const incompleteTag: EbmlTag = undefined;

const ebmlStartTag: EbmlTag = Object.assign(EbmlTagFactory.create(EbmlTagId.EBML), {
  size: 10,
  position: EbmlTagPosition.Start
});

const ebmlEndTag: EbmlTag = Object.assign(EbmlTagFactory.create(EbmlTagId.EBML), {
  size: 10,
  position: EbmlTagPosition.End
});

const ebmlVersion1Tag: EbmlTag = Object.assign(EbmlTagFactory.create(EbmlTagId.EBMLVersion), {
  position: EbmlTagPosition.Content,
  data: 1
});

const ebmlVersion0Tag: EbmlTag = Object.assign(EbmlTagFactory.create(EbmlTagId.EBMLVersion), {
  position: EbmlTagPosition.Content,
  data: 0
});

describe('EBML', () => {
  describe('Encoder', () => {
    function createEncoder(expected: number[], done: () => any) {
      const encoder: EbmlStreamEncoder = new EbmlStreamEncoder();
      encoder.on('data', chunk => {
        assert.strictEqual(
          chunk.toString('hex'),
          Buffer.from(expected).toString('hex'),
        );
        encoder.on('finish', done);
        done();
      });
      encoder.on('finish', done);
      return encoder;
    }

    it('should write a single tag', done => {
      const encoder: EbmlStreamEncoder = createEncoder([0x42, 0x86, 0x81, 0x01], done);
      encoder.write(ebmlVersion1Tag);
      encoder.end();
    });
    it('should write a tag with a single child', done => {
      const encoder: EbmlStreamEncoder = createEncoder(
        [0x1a, 0x45, 0xdf, 0xa3, 0x84, 0x42, 0x86, 0x81, 0x00],
        done,
      );
      encoder.write(ebmlStartTag);
      encoder.write(ebmlVersion0Tag);
      encoder.write(ebmlEndTag);
      encoder.end();
    });
    describe('#cork and #uncork', () => {
      let encoder: EbmlStreamEncoder;
      beforeEach(() => {
        encoder = new EbmlStreamEncoder();
      });
      it('should block flushing when corked', () => {
        encoder.write(ebmlStartTag);
        encoder.write(ebmlVersion0Tag);
        encoder.cork();
        encoder.write(ebmlEndTag);
        encoder.flush();
        assert.ok(
          encoder.buffer.toString('hex'),
          Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x84, 0x42, 0x86, 0x81, 0x00]).toString('hex'),
        );
      });
      it('should not block flushing when uncorked', () => {
        encoder.write(ebmlStartTag);
        encoder.write(ebmlVersion0Tag);
        encoder.cork();
        encoder.write(ebmlEndTag);
        encoder.flush();
        assert.ok(
          encoder.buffer.toString('hex'),
          Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x84, 0x42, 0x86, 0x81, 0x00]).toString('hex'),
        );
        encoder.uncork();
        encoder.flush();
        assert.notStrictEqual(encoder.buffer instanceof Buffer, undefined);
      });
    });
    describe('#writeTag', () => {
      let encoder: EbmlStreamEncoder;
      beforeAll(() => {
        encoder = new EbmlStreamEncoder();
      });
      it('does nothing with incomplete tag data', () => {
        encoder.write(incompleteTag);
        assert.strictEqual(encoder.stack.length, 0);
      });
      it('throws with an invalid tag id', () => {
        assert.throws(
          () => {
            encoder.write(invalidTag);
          },
          /No id found/,
          'Not throwing properly',
        );
      });
    });
    describe('#startTag', () => {
      let encoder: EbmlStreamEncoder;
      beforeAll(() => {
        encoder = new EbmlStreamEncoder();
      });
      it('throws with an invalid tag id', () => {
        assert.throws(
          () => {
            encoder.write(invalidTag);
          },
          /No id found/,
          'Not throwing properly',
        );
      });
    });
    describe('#_transform', () => {
      it('should do nothing on an incomplete tag', () => {
        const encoder: EbmlStreamEncoder = new EbmlStreamEncoder();
        encoder.write(incompleteTag);
        assert.ok(encoder.buffer == null || encoder.buffer.length === 0);
      });
    });
    describe('#_bufferAndFlush', () => {
      /* eslint-disable no-underscore-dangle */
      let encoder: EbmlStreamEncoder;
      beforeEach(() => {
        encoder = new EbmlStreamEncoder();
      });
      it('should create a new buffer (but still be empty after eval) with an empty buffer', () => {
        assert.ok(encoder.buffer == null || encoder.buffer.length === 0);
        encoder._bufferAndFlush(Buffer.from([0x42, 0x86, 0x81, 0x01]));
        assert.ok(encoder.buffer == null || encoder.buffer.length === 0);
      });
      it('should append to the buffer (and empty after eval) with an existing buffer', () => {
        encoder.buffer = Buffer.from([0x42, 0x86, 0x81, 0x01]);
        assert.ok(encoder.buffer instanceof Buffer);
        encoder._bufferAndFlush(Buffer.from([0x42, 0x86, 0x81, 0x01]));
        assert.ok(encoder.buffer == null || encoder.buffer.length === 0);
      });
      /* eslint-enable no-underscore-dangle */
    });
  });
});
