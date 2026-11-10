// `new Klass()` must keep binding to the class, not to the wrapper accessor
import { Klass, Factory } from "./classes";

export const tags = [new Klass().tag(), new Factory().tag()];
