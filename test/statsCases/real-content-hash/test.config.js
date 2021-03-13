const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const hashedFiles = {
	"file.jpg": a => a.name.endsWith(".jpg"),
	"file.png": a => a.name.endsWith(".png")
};

module.exports = {
	validate(stats) {
		for (let i = 0; i < 4; i += 2) {
			const a = stats.stats[i + 0].toJson({
				assets: true
			});
			const b = stats.stats[i + 1].toJson({
				assets: true
			});
			expect(Object.keys(a.assetsByChunkName).length).toBe(5);
			expect(a.assetsByChunkName.main).toEqual(b.assetsByChunkName.main);
			expect(a.assetsByChunkName.lazy).toEqual(b.assetsByChunkName.lazy);
			expect(a.assetsByChunkName.a).toEqual(b.assetsByChunkName.a);
			expect(a.assetsByChunkName.b).toEqual(b.assetsByChunkName.b);
			expect(a.assetsByChunkName.a).toEqual(a.assetsByChunkName.b);
		}
		for (let i = 0; i < 4; i++) {
			const statsData = stats.stats[i].toJson({
				assets: true
			});
			for (const name of Object.keys(hashedFiles)) {
				const asset = statsData.assets.find(hashedFiles[name]);
				expect(asset).not.toBe(undefined);
				const content = fs.readFileSync(path.resolve(__dirname, "a", name));
				const hash = crypto
					.createHash("md4")
					.update(content)
					.digest("hex")
					.slice(0, 20);
				expect(asset.name.slice(0, 20)).toBe(hash);
			}
		}
	}
};
