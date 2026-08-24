import fs from "fs";
import path from "path";
import { lookalikes } from "./lookalikes";

// A real reference next to them, so the pass definitely ran over this asset.
const load = () => import(/* webpackChunkName: "lazy" */ "./lazy");

it("should leave a stand-in it cannot read exactly as written", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);

	expect(typeof load).toBe("function");
	// The pass ran: the real reference next to these was filled in.
	expect(bundle).toContain(`${"__webpack_require__"}.ei(`);
	for (const [name, text] of Object.entries(lookalikes)) {
		expect([name, bundle.includes(text)]).toEqual([name, true]);
	}
});

// Naming each shape keeps a payload-format change from leaving the case testing
// nothing: a blob that stopped spelling its own name would still reach the bundle.
it("should carry the shape each lookalike is named for", () => {
	const NOT_JSON = "not json";
	const decoded = {};

	for (const [name, specifier] of Object.entries(lookalikes)) {
		const payload = /:([\w-]+)@@$/.exec(specifier)[1];
		try {
			decoded[name] = JSON.parse(
				Buffer.from(
					payload.replace(/-/g, "+").replace(/_/g, "/"),
					"base64"
				).toString()
			);
		} catch (_error) {
			decoded[name] = NOT_JSON;
		}
	}

	expect(decoded).toEqual({
		notJson: NOT_JSON,
		notArray: { a: 1 },
		notTuples: ["literal", "x"],
		wrongLength: [["literal"]],
		unknownKind: [["nonsense", "x"]],
		wrongValueType: [["literal", { a: 1 }]],
		numericTemplate: [["template", 0]],
		numericLiteral: [["literal", 7]],
		unknownChunk: [["chunk", "no-such-chunk-id"]]
	});
});

it("should leave an asset alone when it can read none of its stand-ins", async () => {
	const { unreadable } = await load();
	const lazyName = __STATS__.assets.find((asset) =>
		/^lazy\./.test(asset.name)
	).name;
	const chunk = fs.readFileSync(
		path.join(__STATS__.outputPath, lazyName),
		"utf8"
	);

	expect(chunk).toContain(unreadable);
});
