export enum OpCode {
    UNKNOWN = -1,
    AUTHENTICATE = 0,
    AUTHENTICATE_RESPONSE = 1,
    DISPATCH = 2,
}

export class SocketEvent<T = any> {
    public op: number;
    public data: T;
    public type?: string;

    constructor(op: OpCode, data: T, type?: string) {
        this.op = op;
        this.data = data;
        this.type = type;
    }

    static fromJSON(json: string): SocketEvent | undefined {
        const obj = tryParse(json);

        if (obj === null) {
            return;
        }

        return new SocketEvent(obj?.op, obj?.data, obj?.type);
    }
}
function tryParse(str: string) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return null;
    }
}