import { increment as inc, value } from "./counter";
import { resetCounter, print } from "./methods";
print(value);
inc();
inc();
inc();
print(value);
resetCounter();
print(value);

export { inc, print };
