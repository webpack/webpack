const load = (name) => import("./" + name);
const chained = (name) => import("./" + name);
const made = (name) => import("./" + name);
const tagged = (name) => import("./" + name);
const json = (name) => import("./" + name, { with: { type: "json" } });
function later(run, done) {
	if (run) {
		load("a").then(done);
		chained("b")?.then(done);
		new (made("c"))();
		tagged("d")`e`;
		json("f").then(done);
	}
	console.log("loaded");
}
later(Math.random() < 0, console.log);
