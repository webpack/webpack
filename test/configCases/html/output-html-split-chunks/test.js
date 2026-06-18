const fs = require("fs");
const path = require("path");
const vm = require("vm");

const read = (file) => fs.readFileSync(path.resolve(__dirname, file), "utf-8");
const scriptSrcs = (html) =>
	Array.from(html.matchAll(/<script src="([^"]+)"><\/script>/g)).map(
		(m) => m[1]
	);

it("injects the runtime and vendor chunks before the entry chunk", () => {
	const srcs = scriptSrcs(read("app.html"));
	// runtime, vendor, app
	expect(srcs).toHaveLength(3);
	expect(srcs[0]).toMatch(/runtime/);
	expect(srcs[1]).toMatch(/vendor/);
});

it("executes with the split chunks loaded in order", () => {
	const contents = scriptSrcs(read("app.html")).map(read);
	const sandbox = {};
	sandbox.self = sandbox;
	vm.createContext(sandbox);
	for (const content of contents) vm.runInContext(content, sandbox);
	expect(sandbox.order).toEqual(["APP:LIB_VALUE"]);
});
