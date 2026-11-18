let shape: {
	readonly id: string;
	name?: string,
	method(): void
	optional?<T>(value: T): T;
	[key: string]: unknown;
	(call: number): string;
	new (value: string): object;
	get size(): number;
	set size(value: number);
	"quoted": 1;
	42: number;
	[computed]: string;
} = {};
let mapped: { [K in "a" | "b"]: K };
let empty: {} = {};
