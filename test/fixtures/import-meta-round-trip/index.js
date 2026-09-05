import { meta as depMeta, getMeta } from "./dep.js";

const own = import.meta;

console.log(
	JSON.stringify({
		distinct: own !== depMeta,
		stable: depMeta === getMeta(),
		ownUrl: String(own.url).split("/").pop(),
		depUrl: String(depMeta.url).split("/").pop()
	})
);
