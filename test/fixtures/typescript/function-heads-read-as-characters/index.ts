function objectType(): { a: number };
function objectType(): { a: number } {
	return { a: 1 };
}
function union(): string | { b: string } {
	return "";
}
function arrowType(): () => { c: 1 } {
	return () => ({ c: 1 });
}
function generic(): Promise<Array<number>> {
	return Promise.resolve([]);
}
function conditional<T>(): T extends string ? { d: T } : never {
	return undefined as never;
}
function literal(): "text" {
	return "text";
}
function predicate(value: unknown): value is { e: 1 } {
	return true;
}
function multiline():
	| number
	| string {
	return 1;
}
function comment(/* a */ a: number): void {}
function overloadedNoSemicolon(a: string): void
function overloadedNoSemicolon(a: unknown) {}
export function exportedOverload(): { f: 1 };
export function exportedOverload() {
	return { f: 1 };
}
async function asyncOverload(): Promise<{ g: 1 }>;
async function asyncOverload() {
	return { g: 1 };
}
class Members {
	field = 1;
	typed: number = 2;
	method(): { h: 1 };
	method() {
		return { h: 1 };
	}
	other(a = ")") {}
	optional?(): void;
	"quoted"(): void {}
}
const arrow = (a = ")"): void => {};
const arrowWithComment = (/* b */ b: number) => b;
