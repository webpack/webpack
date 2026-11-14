const fs = require("fs");
const path = require("path");

it("should list it under the public path in the SSR manifest", async () => {
	await import(/* webpackChunkName: "/rooted/node" */ "./value");
	const manifest = JSON.parse(
		fs.readFileSync(path.join(__dirname, "ssr-manifest.json"), "utf8")
	);
	expect(manifest["./value.js"]).toEqual(["/rooted/node.js"]);
});
