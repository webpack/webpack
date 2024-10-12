import "./non-strict"
import fs from "fs";

it("should not have iife for entry module when modules strict is different", () => {
  const code = fs.readFileSync(__filename, 'utf-8');
  const iifeComment = ["This entry needs to be wrapped in an IIFE", "because it needs to be in strict mode."].join(' ');
  expect(code).not.toMatch(iifeComment);
});
