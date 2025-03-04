import { externalValue, externalFunction } from './external-module';

// Define local exports
export const localValue = "local-value";
export function localFunction() {
  return "local-function";
}

// Re-export from external module
export * from './external-module';

it("should correctly re-export external module values", () => {
  expect(externalValue).toBe("external-value");
  expect(externalFunction()).toBe("external-function");
});

it("should correctly export local module values", () => {
  expect(localValue).toBe("local-value");
  expect(localFunction()).toBe("local-function");
});
