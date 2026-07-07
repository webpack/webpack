import path from "path";
import { pathToFileURL } from "url";

const sourceFilename = path.resolve(
	"./test/configCases/module/import-meta-parser-options/disabled-fields.js"
);
const sourceDirname = path.dirname(sourceFilename);
const sourceUrl = pathToFileURL(sourceFilename).toString();
const meta = import.meta;
const { env, url, webpack } = import.meta;

export default {
	contextType: typeof import.meta.webpackContext,
	dirname: import.meta.dirname,
	envType: typeof import.meta.env,
	filename: import.meta.filename,
	main: import.meta.main,
	meta: meta,
	sourceDirname,
	sourceFilename,
	sourceUrl,
	url,
	destructuredEnvType: typeof env,
	destructuredUrl: url,
	destructuredWebpack: webpack,
	webpack
};
