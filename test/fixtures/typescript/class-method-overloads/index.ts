class Parser {
	constructor();
	constructor(input: string);
	constructor(input?: string) {}
	parse(value: string): number;
	parse(value: number): number;
	parse(value: unknown): number {
		return 0;
	}
	"quoted"(): void;
	"quoted"() {}
	[Symbol.iterator](): Iterator<number>;
	[Symbol.iterator]() {
		return [][Symbol.iterator]();
	}
}
