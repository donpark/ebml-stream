import { Buffer } from 'buffer/';

import { EbmlTagPosition } from "./enums/EbmlTagPosition";
import { EbmlTagId } from "./enums/EbmlTagId";
import { EbmlElementType } from "./enums/EbmlElementType";
import { Tools } from "../Tools";

export abstract class EbmlTag {
    
    size: number;

    // level: number;
    // minver: number;
    // description: string;

    constructor(
        public id: number,
        public type: EbmlElementType,
        public position: EbmlTagPosition
    ) {
    }

    protected abstract encodeContent(): Buffer;

    public abstract parseContent(content: Buffer): void;

    private getTagDeclaration(): Buffer {
        let tagHex = this.id.toString(16);
        if(tagHex.length%2!==0) {
            tagHex = `0${tagHex}`;
        }
        return Buffer.from(tagHex, 'hex');
    }

    public encode(): Buffer {
        let vintSize = null;
        let content = this.encodeContent();

        if(this.size === -1) {
            vintSize = Buffer.from('01ffffffffffffff', 'hex');
        } else {
            let specialLength: number = undefined;
            if([
                EbmlTagId.Segment,
                EbmlTagId.Cluster
            ].some(i => i === this.id)) {
                specialLength = 8;
            }
            vintSize = Tools.writeVint(content.length, specialLength);
        }
        
        return Buffer.concat([
            this.getTagDeclaration(),
            vintSize,
            content
        ]);
    }
}