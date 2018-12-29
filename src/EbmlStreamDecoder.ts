import { Transform, TransformOptions, TransformCallback } from 'stream';
import { Buffer } from 'buffer/';

import { Tools as tools } from './Tools';
import { EbmlTag } from './models/EbmlTag';
import { EbmlElementType } from './models/enums/EbmlElementType';
import { EbmlTagPosition } from './models/enums/EbmlTagPosition';
import { EbmlTagFactory } from './models/EbmlTagFactory';
import { EbmlTagId } from './models/enums/EbmlTagId';

export class EbmlStreamDecoderOptions {
  bufferTagIds?: EbmlTagId[] = [];
}

export class EbmlStreamDecoder extends Transform {
  private _currentBufferOffset: number = 0;
  private _tagStack: ProcessingTag[] = [];
  private _buffer: Buffer = Buffer.alloc(0);
  private _bufferTagIds: EbmlTagId[] = [];

  /* Expose property for testing */
  get buffer(): Buffer {
    return this._buffer;
  }

  constructor(options: TransformOptions & EbmlStreamDecoderOptions = {}) {
    super(<TransformOptions>{ ...options, readableObjectMode: true });
    this._bufferTagIds = options.bufferTagIds || [];
  }
// @ts-ignore
  _transform(chunk: any, enc: string, done: TransformCallback): void {
    this._buffer = Buffer.concat([this._buffer, Buffer.from(chunk)]);
    while(this.parseTags());
    done();
  }

  private parseTags(): boolean {
    const currentTag = this.readTagHeader(this._buffer);
    if(!currentTag) {
      return false;
    }

    if(currentTag.type === EbmlElementType.Master && !this._bufferTagIds.some(i => i ===currentTag.id)) {
      this._tagStack.push(currentTag);
      this.emitTag(currentTag, EbmlTagPosition.Start);
      this.advanceBuffer(currentTag.tagHeaderLength);
      return true;
    } else {
      if(this._buffer.length < currentTag.tagHeaderLength + currentTag.size) {
        return false;
      }

      const data = this._buffer.slice(currentTag.tagHeaderLength, currentTag.tagHeaderLength+ currentTag.size);
      this.emitTag(currentTag, EbmlTagPosition.Content, data);
      this.advanceBuffer(currentTag.tagHeaderLength + currentTag.size);

      while (this._tagStack.length > 0) {
        const nextTag = this._tagStack[this._tagStack.length - 1];
        if (this._currentBufferOffset < (nextTag.absoluteStart + nextTag.tagHeaderLength + nextTag.size)) {
          break;
        }
        this.emitTag(nextTag, EbmlTagPosition.End);
        this._tagStack.pop();
      }
    }

    return true;
  }

  private advanceBuffer(length: number): void {
      this._currentBufferOffset += length;
      this._buffer = this._buffer.slice(length);
  }

  private readTagHeader(buffer: Buffer, offset: number = 0): ProcessingTag {
    if (buffer.length == 0) {
      return null;
    }
    const tag = tools.readVint(buffer, offset);
    if (tag == null) {
      return null;
    }
    const size = tools.readVint(buffer, offset + tag.length);
    if(size == null) {
      return null;
    }

    const tagIdHex = tools.readHexString(buffer, offset, offset + tag.length)
    const tagId = Number.parseInt(tagIdHex, 16);
    let tagObject = EbmlTagFactory.create(tagId);

    tagObject.size = size.value;
    
    return Object.assign(tagObject, {
      absoluteStart: this._currentBufferOffset + offset,
      tagHeaderLength: tag.length + size.length
    });
  }

  private emitTag(tag: ProcessingTag, position: EbmlTagPosition, data?: Buffer): void {
    let emittedTag = EbmlTagFactory.create(tag.id);
    emittedTag.size = tag.size;
    emittedTag.position = position;
    if(position === EbmlTagPosition.Content) {
      emittedTag.parseContent(data);
    }
    this.push(emittedTag);
  }

}

type ProcessingTag = EbmlTag & {
  absoluteStart: number;
  tagHeaderLength: number;
};