declare const literal = "value", count = 2;
declare let definite!: number;
declare const [first, second]: [number, number];
declare const { a, b }: { a: number; b: number };
declare interface Ambient {}
declare type AmbientAlias = string;
declare class Derived extends Base<string[]> implements Thing<number> {}
declare class Generic<T extends object = {}> {}
const after = 1;
