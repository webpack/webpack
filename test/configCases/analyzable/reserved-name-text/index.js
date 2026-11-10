import data from "./data.json";
import string from "./string.json";
import text from "./text.txt";
import css from "./style.css";
import * as values from "./values.module.css";
import inline from "data:text/plain,@@webpackFullHash-8@@";
import * as strings from "./strings";

// Spelled in two halves: this file is in the bundle too, and the fill pass
// would rewrite the expected values along with the data.
const AT = "@@";
const FULL_HASH = `${AT}webpackFullHash`;
const CHUNK = `./${AT}webpackAnalyzableChunk:W1sibGl0ZXJhbCIsIngiXV0@@`;

// A real stand-in next to the data, so the fill pass runs over this asset.
const load = () => import(/* webpackChunkName: "lazy" */ "./lazy");

it("should keep text that looks like a reserved name in a JSON module as data", () => {
	expect(data).toEqual({
		fullHash: `${FULL_HASH}@@`,
		shortHash: `${FULL_HASH}-8@@`,
		noHash: `${FULL_HASH}-0@@`,
		chunk: CHUNK
	});
	expect(string).toBe(`${FULL_HASH}@@`);
});

it("should keep text that looks like a reserved name in an asset/source module as data", () => {
	expect(text).toBe(`source ${FULL_HASH}-8@@ ${CHUNK}\n`);
});

it("should keep text that looks like a reserved name in CSS exported as text", () => {
	expect(css).toContain(`content: "${FULL_HASH}@@";`);
});

it("should keep text that looks like a reserved name in a CSS module export as data", () => {
	expect(values.value).toBe(`"${FULL_HASH}@@"`);
});

it("should keep text that looks like a reserved name in an inline data URL", () => {
	expect(inline).toBe(`data:text/plain,${FULL_HASH}-8@@`);
});

it("should keep text that only spells a reserved name in source as written", () => {
	expect(strings.inString).toBe(`see ${CHUNK} here`);
	expect(strings.noHash).toBe(`${FULL_HASH}-0@@`);
	expect(strings.leadingZero).toBe(`${FULL_HASH}-08@@`);
});

it("should still fill the stand-ins webpack writes", async () => {
	const { value } = await load();
	expect(value).toBe("lazy");
});
