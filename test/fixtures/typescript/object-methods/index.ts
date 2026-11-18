const object = {
	method<T>(value: T): T {
		return value;
	},
	get value(): number {
		return 1;
	},
	set value(next: number) {},
	async *generator<T>(): AsyncGenerator<T> {},
	arrow: (x: number): number => x
};
