import direct from "./marker.js?direct";
import regexpA from "./regexp-a.js?regexp";
import regexpB from "./regexp-b.js?regexp";
import include from "./include.js?include";
import excluded from "./plain.js?excluded";
import excludeOnly from "./plain.js?exclude-only";
import emptyRegexp from "./plain.js?empty-regexp";
import empty from "./plain.js?empty";
import unicode from "./unicode.js?unicode";
import rightOutput from "./plain.js?right-output";
import functional from "./functional.js?functional";
import bomHit from "./plain.js?bom-hit";
import bomMiss from "./plain.js?bom-miss";
import stringBom from "./plain.js?string-bom";
import invalidUtf8 from "./plain.js?invalid-utf8";
import metadata from "./plain.js?metadata";
import pitch from "./plain.js?pitch";

it("filters normal loaders using their current input", () => {
	expect(direct).toBe("direct");
	expect(regexpA).toBe("regexp");
	expect(regexpB).toBe("regexp");
	expect(include).toBe("include");
	expect(excluded).toBe("__VALUE__");
	expect(excludeOnly).toBe("exclude-only");
	expect(emptyRegexp).toBe("empty-regexp");
	expect(empty).toBe("empty");
	expect(unicode).toBe("unicode");
	expect(rightOutput).toBe("right-output");
	expect(functional).toBe("functional");
});

it("ignores a UTF-8 buffer BOM", () => {
	expect(bomHit).toBe("bom-hit");
	expect(bomMiss).toBe("__VALUE__");
	expect(stringBom).toBe("string-bom");
});

it("preserves loader state on a miss or undecodable input", () => {
	expect(invalidUtf8).toBe("invalid-preserved");
	expect(metadata).toBe("__VALUE__");
});

it("still runs the pitch phase", () => {
	expect(pitch).toBe("pitch-result");
});
