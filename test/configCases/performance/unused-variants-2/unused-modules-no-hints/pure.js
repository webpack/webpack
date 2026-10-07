// No side effect, so tree shaking drops it and there is nothing to report.
export const unusedHelper = () => "also never called";
