const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should list the stylesheet of the last removed entry as removed", () => {
	if (WATCH_STEP === "0") return;
	// Step 1: the `style` compiler is left without an entry, so without a runtime.
	const directory = path.join(__dirname, "style");
	const [file] = fs
		.readdirSync(directory)
		.filter((name) => name.endsWith(".hot-update.json"));
	const manifest = JSON.parse(
		fs.readFileSync(path.join(directory, file), "utf8")
	);
	expect(manifest.r).toEqual(["style"]);
	expect(manifest.css.r).toEqual(["style"]);
});
