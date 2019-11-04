export { default as e } from "../data/e.json";
export { default as f } from "../data/f.json?default-exported";
export { named as fNamed } from "../data/f.json?only-named-exported";
import * as fStar from "../data/f.json?namespace-object-exported";
export { fStar };
import * as fStarPartial from "../data/f.json?namespace-object-exported-but-only-default-named-used";
export { fStarPartial };
import * as fStarPartial2 from "../data/f.json?namespace-object-exported-but-only-named-used";
export { fStarPartial2 };
