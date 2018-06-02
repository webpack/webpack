import { doStuff } from "./require-me";

it("should compile correctly", () => {
    expect(doStuff()).toEqual(42);
    expect(WATCH_STEP).toEqual("1");
});