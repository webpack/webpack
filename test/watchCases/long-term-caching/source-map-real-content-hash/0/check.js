import fs from "fs";
import path from "path";

export default function check() {
	const asset = STATS_JSON.assets.find((a) => /^main\..+\.js$/.test(a.name));
	expect(asset).toBeDefined();
	const mapName = asset.info.related.sourceMap;
	expect(mapName).toBe(`${asset.name}.map`);

	const content = fs.readFileSync(path.join(__dirname, asset.name), "utf8");
	expect(content).toContain(`//# sourceMappingURL=${mapName}`);

	const map = JSON.parse(
		fs.readFileSync(path.join(__dirname, mapName), "utf8")
	);
	expect(map.file).toBe(asset.name);
	expect(fs.existsSync(path.join(__dirname, map.file))).toBe(true);
	return asset.name;
}
