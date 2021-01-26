if (Math.random() < 0) {
	import("./foo");
	import("./foo?cjs");
	import("./bar");
	import("./bar?cjs");
	import("./foo?reexport");
	import("./foo?reexport-cjs");
	import("./bar?reexport");
	import("./bar?reexport-cjs");
}

export default 42;
