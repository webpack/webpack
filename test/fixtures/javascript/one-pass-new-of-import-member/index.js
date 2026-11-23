const load = (name) => import("./" + name);
const json = (name) => import("./" + name, { with: { type: "json" } });
function later(run, key) {
	if (run) {
		new (import("./a").y)();
		new (import("./b").y)();
		new (import("./c")[key])(1);
		new (import("./d").then(key).y)();
		new (import("./e").y.z)();
		new (import("./f")?.y)();
		new (load("g").y)();
		new (load("h")[0])();
		new (json("i").y)();
	}
	console.log("built");
}
later(Math.random() < 0, "k");
