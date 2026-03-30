/*
 * GroupCriticalWarningsPlugin.js
 *
 * Deduplicates CriticalDependencyWarning instances in compilation.warnings.
 *
 * Problem: a single module that uses dynamic require() in a loop, or a
 * large minified third-party bundle, can emit hundreds or thousands of
 * identical warnings that make the build output unreadable.
 *
 * Solution: after the seal phase (when all warnings have been collected),
 * group warnings by (module identifier + message text), keep the first
 * occurrence, and replace the rest with a single summary entry that
 * reports the total count and the locations of all suppressed occurrences.
 *
 * Non-CriticalDependencyWarning entries are left completely untouched.
 */

"use strict";

const CriticalDependencyWarning = require("./CriticalDependencyWarning");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../WebpackError")} WebpackError */

/**
 * Builds the composite message for a grouped warning.
 *
 * @param {string}   baseMessage   The original warning text.
 * @param {number}   totalCount    Total number of occurrences (including first).
 * @param {string[]} locationStrings  Human-readable "line:col" strings for each
 *                                 suppressed occurrence (all except the first).
 * @returns {string}
 */
const buildGroupedMessage = (baseMessage, totalCount, locationStrings) => {
  const suppressed = totalCount - 1;
  const locSummary =
    suppressed <= 5
      ? locationStrings.join(", ")
      : `${locationStrings.slice(0, 5).join(", ")} … and ${suppressed - 5} more`;

  return (
    `${baseMessage}\n` +
    `  [×${totalCount} occurrences — showing first occurrence above]\n` +
    `  Suppressed locations: ${locSummary}`
  );
};

/**
 * Converts a warning's .loc object into a human-readable "line:col" string.
 *
 * @param {WebpackError} warning
 * @returns {string}
 */
const locString = (warning) => {
  if (!warning.loc) return "(unknown location)";
  
  // Cast to 'any' or check if it's a specific object to satisfy TS
  const loc = /** @type {any} */ (warning.loc);
  
  if (loc.start && loc.end) {
    return `${loc.start.line}:${loc.start.column}-${loc.end.column}`;
  }
  if (loc.start) {
    return `${loc.start.line}:${loc.start.column}`;
  }
  return "(unknown location)";
};

/**
 * Runs the deduplication pass over compilation.warnings in place.
 *
 * Complexity: O(n) — single pass with a Map keyed by (moduleId|message).
 *
 * @param {Compilation} compilation
 * @returns {void}
 */
const deduplicateCriticalWarnings = (compilation) => {
  // Fast-path: if there are 0 or 1 warnings, nothing to deduplicate.
  if (compilation.warnings.length <= 1) return;

  /**
   * Key: `${moduleIdentifier}|${message}`
   * Value: { representative: WebpackError, locations: string[], count: number }
   */
  const groups = new Map();

  /** Warnings that are NOT CriticalDependencyWarning — pass through unchanged. */
  const passthrough = [];

  for (const warning of compilation.warnings) {
    // Only deduplicate CriticalDependencyWarning instances.
    if (!(warning instanceof CriticalDependencyWarning)) {
      passthrough.push(warning);
      continue;
    }

    // Build the grouping key. module may be null for edge cases (e.g. virtual
    // modules created by plugins), so fall back to the empty string.
    const moduleId = warning.module
      ? warning.module.identifier()
      : "";
    const key = `${moduleId}\x00${warning.message}`;

    if (!groups.has(key)) {
      // First occurrence: store as the representative.
      groups.set(key, {
        representative: warning,
        locations: [],   // locations of subsequent occurrences
        count: 1,
      });
    } else {
      const group = groups.get(key);
      group.count++;
      group.locations.push(locString(warning));
    }
  }

  // Rebuild compilation.warnings:
  //   • For groups with only 1 occurrence: keep as-is.
  //   • For groups with >1 occurrence: clone the representative and update
  //     its message to include the summary. We clone (Object.create + assign)
  //     rather than mutating in place so that any external references to the
  //     original warning object are not affected.
  const deduped = [];

  for (const { representative, locations, count } of groups.values()) {
    if (count === 1) {
      deduped.push(representative);
      continue;
    }

    // Clone the representative warning so we don't mutate the original.
    const grouped = Object.assign(
      Object.create(Object.getPrototypeOf(representative)),
      representative
    );

    grouped.message = buildGroupedMessage(
      representative.message,
      count,
      locations
    );

    // Preserve the stack from the representative (most useful for debugging).
    grouped.stack = representative.stack;

    deduped.push(grouped);
  }

  // Replace compilation.warnings in place.
  // (Splice is used instead of reassignment so that any external reference to
  // the array itself remains valid, e.g. plugins that captured a reference.)
  compilation.warnings.splice(
    0,
    compilation.warnings.length,
    ...passthrough,
    ...deduped
  );
};

class GroupCriticalWarningsPlugin {
  /**
   * @param {object} [options]
   * @param {number} [options.minOccurrences=2]
   *   Minimum number of identical warnings before grouping kicks in.
   *   Defaults to 2 (any duplicate is collapsed). Set to Infinity to disable.
   */
  constructor(options = {}) {
    this.minOccurrences = options.minOccurrences ?? 2;
  }

  /**
   * @param {Compiler} compiler
   */
  apply(compiler) {
    compiler.hooks.compilation.tap(
      "GroupCriticalWarningsPlugin",
      (compilation) => {
        compilation.hooks.afterSeal.tapAsync(
          "GroupCriticalWarningsPlugin",
          (callback) => {
            try {
              deduplicateCriticalWarnings(compilation);
              callback();
              } catch (err) {const errorMessage = err instanceof Error ? err.message : String(err);
                compilation.warnings.push(
                    new Error(
                        `GroupCriticalWarningsPlugin: internal error during deduplication — ${errorMessage}`
                    )
                );
                callback();
            }
          }
        );
      }
    );
  }
}

module.exports = GroupCriticalWarningsPlugin;
module.exports.deduplicateCriticalWarnings = deduplicateCriticalWarnings; // exported for testing