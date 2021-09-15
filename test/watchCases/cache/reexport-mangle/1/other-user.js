if (Math.random() < 0) {
	import("./foo");
	import("./foo?cjs");
	import("./foo?reexport");
	import("./foo?reexport-cjs");
}

export default 42;
