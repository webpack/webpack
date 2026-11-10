// never called: each construct is only parsed
export function ensure() {
	require.ensure(["./dir/a.js"], function (require) {
		return require("./dir/a.js");
	}, function (error) {
		return error;
	}, "ensured");
}

export async function lazy(name) {
	const plain = await import("./dir/a.js");
	const templated = await import(`./dir/${name}.js`);
	const attributed = await import("./dir/b.js", { with: { type: "javascript" } });
	const { name: destructured } = await import("./dir/b.js");
	import("./dir/a.js").then((m) => m.name);
	const context = require.context("./dir", false, /\.js$/);
	const glob = import.meta.glob("./glob/*.js", { eager: true });
	const webpackContext = import.meta.webpackContext("./dir", { recursive: false });
	const worker = new Worker(new URL("./worker.js", import.meta.url));
	return [plain, templated, attributed, destructured, context, glob, webpackContext, worker];
}
