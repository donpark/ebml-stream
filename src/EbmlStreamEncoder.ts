import { Transform, TransformOptions, TransformCallback } from 'stream';
import { Buffer } from 'buffer';

import { EbmlTag } from './models/EbmlTag';
import { EbmlTagPosition } from './models/enums/EbmlTagPosition';
import { EbmlTagId } from './models/enums/EbmlTagId';
import { EbmlMasterTag } from './models/tags/EbmlMasterTag';

export class EbmlStreamEncoder extends Transform {
  private dataBuffer: Buffer = Buffer.alloc(0);
  private mCorked: boolean = false;
  private openTags: EbmlMasterTag[] = [];

  constructor(options: TransformOptions = {}) {
    super({ ...options, writableObjectMode: true });
  }
// @ts-ignore
  _transform(chunk: EbmlTag, enc: string, done: TransformCallback) {
    if(chunk) {
      if (!chunk.id) {
        throw new Error(`No id found for ${JSON.stringify(chunk)}`);
      }

      switch (chunk.position) {
        case EbmlTagPosition.Start:
          this.startTag(<EbmlMasterTag>chunk);
          break;
        case EbmlTagPosition.Content:
          this.writeTag(chunk);
          break;
        case EbmlTagPosition.End:
          this.endTag(<EbmlMasterTag>chunk);
          break;

        default:
          break;
      }
    }

    done();
  }

  bufferAndFlush(buffer: Buffer) {
    this.dataBuffer = Buffer.concat([this.dataBuffer, buffer]);
    this._flush(() => {});
  }

  _flush(callback: TransformCallback): void {
    let chunk: Buffer = null;
    if (this.dataBuffer.length > 0 && !this.mCorked) {
      chunk = Buffer.from(this.dataBuffer);
      this.dataBuffer = Buffer.alloc(0);
      this.push(chunk);
    }
    callback();
  }

  /* For testing */
  _bufferAndFlush(buffer: Buffer) {
    this.bufferAndFlush(buffer);
  }

  flush(): void {
    this._flush(() => {});
  }
  get buffer(): Buffer {
    return this.dataBuffer;
  }
  set buffer(val: Buffer) {
    this.dataBuffer = val;
  }
  get stack(): EbmlMasterTag[] {
    return this.openTags;
  }

  cork() {
    this.mCorked = true;
  }

  uncork() {
    this.mCorked = false;
    this._flush(() => {});
  }

  writeTag(tag: EbmlTag): void {
    if (this.openTags.length > 0) {
      this.openTags[this.openTags.length-1].Children.push(tag);
    } else {
      this.bufferAndFlush(tag.encode());
    }
  }

  startTag(tag: EbmlMasterTag): void {
    if (this.openTags.length > 0) {
      this.openTags[this.openTags.length - 1].Children.push(tag);
    }
    this.openTags.push(tag);
  }

  endTag(tag: EbmlMasterTag) {
    const inMemoryTag = this.openTags.pop();
    if(tag.id !== inMemoryTag.id) {
      throw `Logic error - closing tag "${EbmlTagId[tag.id]}" is not expected tag "${EbmlTagId[inMemoryTag.id]}"`;
    }

    if (this.openTags.length < 1) {
      this.bufferAndFlush(inMemoryTag.encode());
    }
  }
}