import { fn } from './a';

const num = 1

export { fn } from './a';

fn(num);

it("should not break on ASI-code", () => {});
