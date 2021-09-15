let avgJs = `
const str = "we" + "do" + "some" + "ops";
for(const x of str.split("")) {
	if(x.charCodeAt(0) > 40) {
		console.log("omg");
	} else {
		console.log(Math.random() * 2 + 3 * 2);
	}
}

// Some comment
switch(a.b.c.d.f.e.g.h.i) {
	case true:
		break;
	case "magic":
		throw new Error("Error!");
	case 9:
		(function() {
			// extra scope
			var x = 123;
			var y = 456;
			var z = x + z * x / y;
			x && y && (z = x ? y : x);
		}())
}

function a() {}
function b() {}
function c() {}
function d() {}
function e() {}
function f() {}
`;

for (let i = 0; i < 2; i++) {
	avgJs += `(function() {${avgJs}}());`;
}

const fs = require("fs");
const root = __dirname;

createTree(fs, 100, `${root}/modules-100`);
createTree(fs, 500, `${root}/modules-500`);
createTree(fs, 1000, `${root}/modules-1000`);
createTree(fs, 3000, `${root}/modules-3000`);
createTree(fs, 5000, `${root}/modules-5000`);

function createTree(fs, count, folder) {
	fs.mkdirSync(folder);
	let remaining = count - 1;

	function make(prefix, count, depth) {
		if (count === 0) {
			fs.writeFileSync(`${folder}/${prefix}.js`, `export default 1;\n${avgJs}`);
		} else {
			const list = [];
			for (let i = 0; i < count; i++) {
				if (remaining-- <= 0) break;
				if (depth <= 4 && i >= 3 && i <= 4) {
					list.push(
						`const module${i} = import("./${prefix}-${i}");\ncounter += module${i};`
					);
				} else {
					list.push(
						`import module${i} from "./${prefix}-${i}";\ncounter += module${i};`
					);
				}
				make(
					`${prefix}-${i}`,
					depth > 4 || count > 30 ? 0 : count + depth + Math.pow(i, 2),
					depth + 1
				);
			}
			fs.writeFileSync(
				`${folder}/${prefix}.js`,
				`let counter = 0;\n${list.join(
					"\n"
				)};\nexport default counter;\n${avgJs}`
			);
		}
	}
	make("index", 2, 0);
}
