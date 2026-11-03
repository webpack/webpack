import * as namespace from "./outer";
import { getNamespace } from "./consumer";

it("keeps every export when an activated barrel changes dependencies", () => {
  const expected = Number(WATCH_STEP) === 0
    ? { first: "first", local: "local" }
    : Number(WATCH_STEP) === 1
      ? { local: "local", second: "second" }
      : { first: "first", local: "local", second: "second" };
  expect({ ...namespace }).toEqual(expected);
  expect({ ...getNamespace() }).toEqual(expected);
});
