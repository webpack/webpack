import { createRequire } from "module";

const require = createRequire(import.meta.url);

const identifier =
	/** @type {import("../../../../lib/util/identifier")} */
	(require("../../../../lib/util/identifier.js"));

const CONTEXT = "/home/user/project";

/** @type {string[]} */
let requests = [];
/** @type {string} */
let sink = "";
/** @type {Record<string, unknown>} */
let cacheObject = {};

export default {
	name: "unit/util/identifier",
	setup() {
		requests = [];
		for (let i = 0; i < 400; i++) {
			requests.push(
				`/home/user/project/node_modules/pkg-${
					i % 40
				}/lib/deep/nested/file-${i}.js`,
				`/home/user/project/src/components/feature-${
					i % 25
				}/Component${i}.js?query=${i}#fragment`,
				`/home/user/project/node_modules/loader-${
					i % 7
				}/index.js!/home/user/project/src/entry-${i}.css`
			);
		}
	},
	teardown() {
		requests = [];
		if (sink === "unreachable") console.log(sink);
	},
	benches: [
		{
			name: "makePathsRelative uncached 1200 requests",
			fn() {
				// No associated object → no cache, measures the raw conversion.
				for (const request of requests) {
					sink = identifier.makePathsRelative(CONTEXT, request);
				}
			}
		},
		{
			name: "makePathsRelative cached 1200 requests",
			beforeEach() {
				// Fresh cache per round: measures one miss + reuse per distinct
				// request instead of unbounded cross-round hits.
				cacheObject = {};
			},
			fn() {
				for (const request of requests) {
					sink = identifier.makePathsRelative(CONTEXT, request, cacheObject);
				}
			}
		},
		{
			name: "contextify 1200 requests",
			fn() {
				for (const request of requests) {
					sink = identifier.contextify(CONTEXT, request);
				}
			}
		},
		{
			name: "parseResource 1200 requests",
			beforeEach() {
				cacheObject = {};
			},
			fn() {
				for (const request of requests) {
					sink = identifier.parseResource(request, cacheObject).path;
				}
			}
		}
	]
};
