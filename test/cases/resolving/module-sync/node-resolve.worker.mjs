import { workerData, parentPort } from "node:worker_threads";
import { createRequire } from "node:module";

const r = createRequire(workerData.fixture);
const requireResults = {};
for (const name of workerData.fixtures) requireResults[name] = r(name);

const importResults = {};
for (const name of workerData.fixtures) {
	const mod = await import(name);
	importResults[name] = mod.default;
}

parentPort.postMessage({ require: requireResults, import: importResults });
