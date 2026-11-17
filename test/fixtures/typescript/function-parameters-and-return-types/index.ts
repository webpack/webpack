function add(a: number, b: number): number {
	return a + b;
}
function optional(a?: string, b: number = 1, ...rest: string[]): void {}
function destructured({ x, y }: { x: number; y: number }, [z]: number[] = []): number {
	return x + y + z;
}
const expression = function named(value: unknown): value is string {
	return typeof value === "string";
};
async function load(url: string): Promise<Response> {
	return fetch(url);
}
function* generate(): Generator<number, void, unknown> {
	yield 1;
}
