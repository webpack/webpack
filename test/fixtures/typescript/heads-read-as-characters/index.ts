function defined<T extends { id: string }>(value: T): T {
	return value;
}
function overloaded<T = () => void>(value: T): T;
function overloaded(value: unknown) {
	return value;
}
function constrained<T extends "a" | "b", U extends Record<string, (x: number) => void>>(value: T, map: U): T {
	return value;
}
function members<T extends { a: 1; b: 2 }>(value: T): T {
	return value;
}
function described(label: string = "a)b", /* a ) here */ count: number): { label: string; count: number } {
	// a line comment ) here
	return { label, count };
}
function literal(): "on" {
	return "on";
}
function escaped(label = 'it\'s'): string {
	return label;
}
function templated(label = `x`): string {
	return label;
}
function patterned(pattern = /\)/): RegExp {
	return pattern;
}
const arrow = (a: string = ")"): string => a;
function lined(a: number, // a ) in a comment
	b: number): number {
	return a + b;
}
function \u0061b(): void {}
export default async function exported<T>(value: T): Promise<T> {
	return value;
}
export async function loaded(): Promise<void> {}
export async function waited(): Promise<void>;
export async function waited() {}
export const value = 1;
