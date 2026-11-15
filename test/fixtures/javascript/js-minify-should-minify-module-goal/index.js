
/*! @preserve banner */
import { readFile } from "node:fs/promises";
export async function read(path) {
	let text = await readFile(path, "utf8");
	return text.length > 0 ? text : null;
}
