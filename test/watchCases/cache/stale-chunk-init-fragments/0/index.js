import fs from "fs";
import path from "path";
import { value } from "./shared";

// The import the `__dirname` replacement pulls in; line-anchored so this file's own source never matches.
const FILE_URL_TO_PATH_IMPORT =
	/^import \{[^}]*fileURLToPath[^}]*\} from "(?:node:)?url";/m;

it("should drop the init fragments of a removed dependency", () => {
	const source = fs.readFileSync(
		path.join(STATS_JSON.outputPath, "bundle.mjs"),
		"utf8"
	);
	if (WATCH_STEP === "0") {
		expect(typeof value).toBe("string");
		expect(source).toMatch(FILE_URL_TO_PATH_IMPORT);
	} else {
		expect(value).toBe("static");
		expect(source).not.toMatch(FILE_URL_TO_PATH_IMPORT);
	}
});
