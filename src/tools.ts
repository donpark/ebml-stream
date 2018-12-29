import { Buffer } from 'buffer/';

export class Tools {
  static readVint(buffer: Buffer | Uint8Array, start: number = 0): {length: number, value: number} {
    const length = 8 - Math.floor(Math.log2(buffer[start]));
    if (length > 8) {
      const number = Tools.readHexString(buffer, start, start + length);
      throw new Error(`Unrepresentable length: ${length} ${number}`);
    }

    if (isNaN(length) || start + length > buffer.length) {
      return null;
    }

    //Max representable integer in JS
    if(length === 8 && buffer[start + 1] >= 0x20 && buffer.subarray(start + 2, start + 8).some(i => i > 0x00)) {
      return {
        length: 8,
        value: -1
      };
    }

    let value = buffer[start] & ((1 << (8 - length)) - 1);
    for (let i = 1; i < length; i += 1) {
      value *= 2 ** 8;
      value += buffer[start + i];
    }
    
    if (value === (2 ** (length*7) - 1)) {
      value = -1;
    }

    return {
      length,
      value,
    };
  }

  static writeVint(value: number, desiredLength?: number): Buffer {
    if (value < 0 || value > (2 ** 53)) {
      throw new Error(`Unrepresentable value: ${value}`);
    }

    let length = desiredLength;
    if(!length) {
      for (length = 1; length <= 8; length += 1) {
        if (value < 2 ** (7 * length) - 1) {
          break;
        }
      }
    }

    const buffer = Buffer.alloc(length);
    let val = value;
    for (let i = 1; i <= length; i += 1) {
      const b = val & 0xff;
      buffer[length - i] = b;
      val -= b;
      val /= 2 ** 8;
    }
    buffer[0] |= 1 << (8 - length);

    return buffer;
  }

  static padStart(val: string): string {
    if(val.length == 0) {
      return '00';
    }
    if(val.length == 1) {
      return '0' + val;
    }
    return val;
  }

  static readHexString(buff: Buffer | Uint8Array, start: number = 0, end: number = buff.byteLength): string {
    return Array.from(buff.subarray(start, end))
      .map(q => Number(q).toString(16))
      .reduce((acc, current) => `${acc}${this.padStart(current)}`, '');
  }

  static readUtf8(buff: Buffer | Uint8Array): string {
    try {
      return Buffer.from(buff).toString('utf8');
    } catch (exception) {
      return null;
    }
  }

  static readUnsigned(buff: Buffer | Uint8Array): number | string {
    const b = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
    switch (buff.byteLength) {
      case 1:
        return b.getUint8(0);
      case 2:
        return b.getUint16(0);
      case 4:
        return b.getUint32(0);
      default:
        break;
    }
    if (buff.byteLength <= 6) {
      return buff.reduce((acc, current) => acc * 256 + current, 0);
    }

    return Tools.readHexString(buff, 0, buff.byteLength);
  }

  static writeUnsigned(num: number | string): Buffer {
    //TODO improve this
    if(typeof num === 'string') {
      return Buffer.from(num, 'hex');
    } else {
      //Any larger numbers should be passed as hexadecimal
      var buf = Buffer.alloc(4);
      buf.fill(0);
      buf.writeUInt32BE(num, 0);
      let firstValueIndex = buf.findIndex(b => b !== 0);
      if(firstValueIndex === -1) {
        firstValueIndex = buf.length - 1;
      }
      let ret = buf.slice(firstValueIndex);
      return ret;
    }
  }

  static readSigned(buff: Buffer | Uint8Array): number {
    const b = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
    switch (buff.byteLength) {
      case 1:
        return b.getInt8(0);
      case 2:
        return b.getInt16(0);
      case 4:
        return b.getInt32(0);
      default:
        return NaN;
    }
  }

  static writeSigned(num: number): Buffer {
    var buf = Buffer.alloc(8);
    buf.writeInt32BE(num, 0);
    return buf;
  }

  static readFloat(buff: Buffer | Uint8Array): number {
    const b = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
    switch (buff.byteLength) {
      case 4:
        return b.getFloat32(0);
      case 8:
        return b.getFloat64(0);
      default:
        return NaN;
    }
  }

  static writeFloat(num: number): Buffer {
    let buf = Buffer.alloc(8);
    let written = buf.writeFloatBE(num, 0);
    if(written <= 4) {
      buf = buf.slice(0,4);
    }
    return buf;
  }
}
