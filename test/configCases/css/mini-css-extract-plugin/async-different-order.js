async function load1() {
	import("./async-different-order-one.js");
}

async function load2() {
	import("./async-different-order-two.js");
}

load1().catch(() => {});
load2().catch(() => {});
