import fs from "fs/promises";
import path from "path";
import createApp from "../benchmark/create-app.mjs";

/**
 * Writes a server-rendering Node.js app: the React app `create-app.mjs`
 * generates, served by an `http` server that renders each lazy route with
 * `react-dom/server`.
 * @param {string} folder output folder
 * @param {number} features count of lazy-loaded feature routes
 * @param {number} components count of components in each feature
 * @returns {Promise<void>}
 */
async function createServer(folder, features, components) {
	await createApp(folder, features, components);

	const routes = Array.from(
		{ length: features },
		(_, feature) =>
			`\t${JSON.stringify(`/feature-${feature}`)}: () => import(/* webpackChunkName: "feature-${feature}" */ "./features/feature-${feature}/index.js")`
	);

	await fs.writeFile(
		path.join(folder, "server.js"),
		`import { createServer } from "http";
import { readFile } from "fs/promises";
import { join } from "path";
import { createElement } from "react";
import { renderToString } from "react-dom/server";

const routes = {
${routes.join(",\n")}
};

const layout = readFile(join(process.cwd(), "public/index.html"), "utf8").catch(
	() => '<!doctype html><html><body><div id="root"><!--app--></div></body></html>'
);

const send = (response, status, type, body) => {
	response.writeHead(status, {
		"content-type": type,
		"content-length": Buffer.byteLength(body)
	});
	response.end(body);
};

createServer(async (request, response) => {
	const { pathname } = new URL(request.url, "http://localhost");
	const load = routes[pathname];
	if (!load) return send(response, 404, "text/plain", "Not found");
	try {
		const { default: Feature } = await load();
		const html = renderToString(createElement(Feature));
		const page = (await layout).replace("<!--app-->", html);
		send(response, 200, "text/html; charset=utf-8", page);
	} catch (error) {
		console.error(error);
		send(response, 500, "text/plain", "Internal server error");
	}
}).listen(Number(process.env.PORT) || 3000);
`
	);
}

export default createServer;
