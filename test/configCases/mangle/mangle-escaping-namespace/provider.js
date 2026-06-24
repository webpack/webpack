import * as ns from "./enums";

// The whole namespace object escapes via a function return, so it can't be
// statically tracked by the consumer.
export const getEnums = () => ns;
