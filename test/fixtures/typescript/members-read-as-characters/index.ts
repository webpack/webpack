class Shape {
	protected size(): number {
		return 1;
	}
	public static make(): Shape {
		return new Shape();
	}
	private readonly label: string = "shape";
	protected draw(): void;
	protected draw() {}
	static #count = 0;
	public "quoted"(): string {
		return "q";
	}
	public [Symbol.iterator](): Iterator<number> {
		return [][Symbol.iterator]();
	}
	static {}
	get area(): number {
		return 1;
	}
	public async *items(): AsyncGenerator<number> {}
	static
	field = 1;
	method(label = `x`): string {
		return label;
	}
	public get(): [number, number] {
		return [1, 2];
	}
}
export default Shape;
