import { Buffer } from 'buffer/';

import { EbmlTag } from "../EbmlTag";
import { EbmlElementType } from "../enums/EbmlElementType";
import { EbmlTagPosition } from "../enums/EbmlTagPosition";
import { Tools } from "../../Tools";
import { EbmlTagFactory } from "../EbmlTagFactory";

export class EbmlMasterTag extends EbmlTag {

    private _children: EbmlTag[] = [];
    get Children(): EbmlTag[] {
        return this._children;
    }
    set Children(value: EbmlTag[]) {
        this._children = value;
    }
    
    constructor(
        id: number,
        position: EbmlTagPosition = EbmlTagPosition.Content
    ) {
        super(id, EbmlElementType.Master, position);
    }

    encodeContent(): Buffer {
        return Buffer.concat(this._children.map(child => child.encode()));
    }

    parseContent(content: Buffer): void {
        while(content.length > 0) {
            const tag = Tools.readVint(content);
            const size = Tools.readVint(content, tag.length);
            
            const tagIdHex = Tools.readHexString(content, 0, tag.length)
            const tagId = Number.parseInt(tagIdHex, 16);
            let tagObject = EbmlTagFactory.create(tagId);
            tagObject.size = size.value;

            let totalTagLength = tag.length + size.length + size.value;
            tagObject.parseContent(content.slice(tag.length + size.length, totalTagLength));
            this._children.push(tagObject);

            content = content.slice(totalTagLength);
        }
    }
}