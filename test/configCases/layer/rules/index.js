import { object as direct } from "./module";
import { object as reexported } from "./reexport";
import { __loaderValue as entryLayerValue } from "./module";
import { external1 as entryLayerExternal1 } from "./module";
import { external2 as entryLayerExternal2 } from "./module";

import { direct as layerDirect } from "./module-layer-change";
import { reexported as layerReexported } from "./module-layer-change";
import { __loaderValue as layerValue } from "./module-layer-change";
import { external1 as layerExternal1 } from "./module-layer-change";
import { external2 as layerExternal2 } from "./module-layer-change";

import { direct as otherLayerDirect } from "./module-other-layer-change";
import { reexported as otherLayerReexported } from "./module-other-layer-change";
import { __loaderValue as otherLayerValue } from "./module-other-layer-change";

it("should allow to duplicate modules with layers", () => {
	expect(direct).toBe(reexported);
	expect(layerDirect).toBe(layerReexported);
	expect(otherLayerDirect).toBe(otherLayerReexported);

	expect(layerDirect).not.toBe(direct);
	expect(otherLayerDirect).not.toBe(direct);
	expect(otherLayerDirect).not.toBe(layerDirect);
});

it("apply rules based on layer", () => {
	expect(layerValue).toBe("ok");
	expect(otherLayerValue).toBe("other");
	expect(entryLayerValue).toBe("entry");
});

it("apply externals based on layer", () => {
	expect(entryLayerExternal1).toBe(42);
	expect(entryLayerExternal2).toBe(42);
	expect(layerExternal1).toBe(43);
	expect(layerExternal2).toBe(43);
});
