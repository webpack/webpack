import path from "path";
import { pathToFileURL } from "url";

const sourceUrl = pathToFileURL(
	path.resolve("./test/configCases/module/import-meta-parser-options/empty-options.js")
).toString();
const meta = import.meta;

if (!import.meta.UNKNOWN_PROPERTY) {
	import.meta.UNKNOWN_PROPERTY = "runtime";
}

const { UNKNOWN_PROPERTY, env, url, webpack } = import.meta;

export default {
	env,
	meta: meta,
	sourceUrl,
	unknown: UNKNOWN_PROPERTY,
	url,
	webpack
};
