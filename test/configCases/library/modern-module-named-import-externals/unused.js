// This file tests the case where imports are made but not used
// This should trigger the imported.length === 0 code path
import { unusedA, unusedB, unusedC } from 'externals0';

// Don't use any of the imports
// This should result in an empty import when tree-shaking is enabled

export const loaded = true;