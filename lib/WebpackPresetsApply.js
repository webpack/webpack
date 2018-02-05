const path = require("path");
const PresetsApply = require("./PresetsApply");

const pkgPath = path.join(process.cwd(), "package.json");
const pkg = require(pkgPath);
const presets = Object.keys(pkg.devDependencies)
	.filter(pkgName => pkgName.startsWith("webpack-preset-"))
	.map(pkgName => path.resolve(process.cwd(), "node_modules", pkgName))
	.map(require);

class WebpackPresetsApply extends PresetsApply {
	constructor() {
		super(); // will set this.presets;
		presets.forEach(preset => {
			this.presets.add(preset);
		});
	}
}

module.exports = WebpackPresetsApply;
