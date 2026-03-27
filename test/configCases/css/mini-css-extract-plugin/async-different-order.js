function load1() {
	return import("./async-different-order-one.js");
}

function load2() {
	return import("./async-different-order-two.js");
}

Promise.all([load1(), load2()]).catch(() => {});
