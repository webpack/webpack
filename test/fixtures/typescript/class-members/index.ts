class Point<T> extends Base<T> implements Comparable<Point<T>>, Serializable {
	declare readonly brand: unique symbol;
	private x: number = 0;
	protected y?: number;
	public z!: number;
	readonly w = 1;
	static readonly origin = new Point();
	private static count: number = 0;
	override name = "point";
	[key: string]: unknown;
	static [other: number]: string;
	#secret?: string;
	#definite!: number;
	public constructor(x?: number) {
		super();
	}
	public get length(): number {
		return 0;
	}
	protected set length(value: number) {}
	private async *items<U>(this: Point<T>, value: U): AsyncGenerator<U> {}
	optional?(): void {}
	static {
		Point.count = 1;
	}
}
