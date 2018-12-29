import { Buffer } from 'buffer';

import { Tools } from "../../Tools";
import { Block } from "./Block";
import { EbmlTagId } from "../enums/EbmlTagId";

export class SimpleBlock extends Block {

    discardable: boolean;
    keyframe: boolean; 

    constructor() {
        super(EbmlTagId.SimpleBlock);
    }

    encodeContent(): Buffer {
        let flags = this.writeFlagsBuffer();

        if(this.keyframe) {
            flags[0] |= 0x80;
        }
        if(this.discardable) {
            flags[0] |= 0x01;
        }

        return Buffer.concat([
            this.writeTrackBuffer(),
            this.writeValueBuffer(),
            flags,
            this.payload
        ]);
    }

    parseContent(data: Buffer): void {
        super.parseContent(data);

        const track = Tools.readVint(data);
        let flags: number = data[track.length+2];
        this.keyframe = Boolean(flags & 0x80);
        this.discardable = Boolean(flags & 0x01);
    }
}