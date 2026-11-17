interface Point {
	x: number;
	y: number;
}
interface Shape extends Point, Named<string> {
	readonly id: string;
	name?: string;
	area(): number;
	move?(dx: number, dy: number): void;
	[key: string]: unknown;
	(call: number): string;
	new (value: string): Shape;
	get size(): number;
	set size(value: number);
	generic<T>(value: T): T;
}
interface Empty {}
export interface Exported<T> {
	value: T
	other: T,
}
export default interface Default {}
const after = 1;
