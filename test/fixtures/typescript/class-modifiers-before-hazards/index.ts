class A {
	private *generator() {}
	private [computed] = 1;
	private get [accessor]() {
		return 1;
	}
	readonly [key] = 1;
	private async method() {}
	private static *staticGenerator() {}
	private "quoted" = 1;
	private 1 = 1;
}
