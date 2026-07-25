import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);

const { runLoaders } =
	/** @type {typeof import("../../../../lib/loaders/LoaderRunner")} */
	(require("../../../../lib/loaders/LoaderRunner.js"));

const fixtures = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../../../fixtures/loader-runner"
);
const resource = path.join(fixtures, "resource.bin");
const resourceBuffer = Buffer.from("benchmark resource");
const identityLoader = path.join(fixtures, "identity-loader.js");
const pitchingLoader = path.join(fixtures, "pitching-loader.js");
const simpleLoader = path.join(fixtures, "simple-loader.js");

/** @type {unknown} */
let sink;

/** @type {import("../../../../lib/loaders/LoaderRunner").ProcessOptions["processResource"]} */
const processResource = (loaderContext, currentResource, callback) => {
	loaderContext.addDependency(currentResource);
	callback(null, resourceBuffer);
};

/**
 * @param {string[]} loaders loader chain
 * @param {number} count pipeline count
 * @returns {Promise<void>}
 */
function runPipelines(loaders, count) {
	return new Promise((resolve, reject) => {
		let remaining = count;
		/**
		 * @param {Error | null} err loader error
		 * @param {import("../../../../lib/loaders/LoaderRunner").RunLoaderResult} result loader result
		 */
		const onResult = (err, result) => {
			if (err) {
				reject(err);
				return;
			}
			sink = result.result;
			if (--remaining === 0) resolve();
		};
		for (let i = 0; i < count; i++) {
			runLoaders(
				{
					resource: `${resource}?variant=${i % 10}#fragment`,
					loaders,
					processResource
				},
				onResult
			);
		}
	});
}

export default {
	name: "unit/loaders/LoaderRunner",
	teardown() {
		if (sink === "unreachable") console.log(sink);
	},
	benches: [
		{
			name: "process 2000 resources without loaders",
			fn() {
				return runPipelines([], 2000);
			}
		},
		{
			name: "run 1000 three-loader pipelines",
			fn() {
				return runPipelines([identityLoader, simpleLoader, identityLoader], 1000);
			}
		},
		{
			name: "run 1000 pitching short circuits",
			fn() {
				return runPipelines([simpleLoader, pitchingLoader, simpleLoader], 1000);
			}
		}
	]
};
