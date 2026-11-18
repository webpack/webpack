declare const version: string;
declare let mutable: number, other: string;
declare var legacy: any;
declare function helper(value: string): void;
declare function overload(): void
declare class Ambient<T> extends Base<T> implements Thing {
	method(): void;
	property: T;
}
declare abstract class AbstractAmbient {}
declare enum AmbientEnum { A, B }
declare const enum AmbientConstEnum { C }
declare namespace Space.Inner {
	const value: number;
}
declare module "virtual" {
	export const value: number;
}
declare module "shorthand";
declare global {
	interface Window {
		custom: string;
	}
}
export declare const exported: number;
export declare function exportedFunction(): void;
const after = 1;
