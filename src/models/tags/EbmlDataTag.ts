import { Buffer } from 'buffer';

import { EbmlTag } from "../EbmlTag";
import { EbmlElementType } from "../enums/EbmlElementType";
import { Tools } from "../../Tools";
import { EbmlTagPosition } from "../enums/EbmlTagPosition";

export class EbmlDataTag extends EbmlTag {

    data: any;

    constructor(
        id: number,
        type: EbmlElementType
    ) {
        super(id, type, EbmlTagPosition.Content);
    }

    parseContent(data: Buffer): void {
        switch (this.type) {
            case EbmlElementType.UnsignedInt:
                this.data = Tools.readUnsigned(data);
                break;
            case EbmlElementType.Float:
                this.data = Tools.readFloat(data);
                break;
            case EbmlElementType.Integer:
                this.data = Tools.readSigned(data);
                break
            case EbmlElementType.String:
                this.data = String.fromCharCode(...data);
                break
            case EbmlElementType.UTF8:
                this.data = Tools.readUtf8(data);
                break;
            default:
                this.data = data;
                break;
        }
    }

    encodeContent(): Buffer {
        switch (this.type) {
        case EbmlElementType.UnsignedInt:
            return Tools.writeUnsigned(<number>this.data);
        case EbmlElementType.Float:
            return Tools.writeFloat(<number>this.data);
        case EbmlElementType.Integer:
            return Tools.writeSigned(<number>this.data);
        case EbmlElementType.String:
            return Buffer.from(<string>this.data, "ascii");
        case EbmlElementType.UTF8:
            return Buffer.from(<string>this.data, "utf8");
        case EbmlElementType.Binary:
        default:
            return <Buffer>this.data;
        }
    }
}