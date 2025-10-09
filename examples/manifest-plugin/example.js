import fooURL from "./foo.txt";

const barURL = new URL("./bar.txt", import.meta.url);

async function loadAsync() {
	return import("./async.js");
}

await loadAsync();

export default [fooURL, barURL];
