import AggregateError from "/-/aggregate-error@v4.0.0-rCH8s5R9g4kQQ807o58j/dist=es2020,mode=imports/optimized/aggregate-error.js";
async function pMap(iterable, mapper, {
  concurrency = Number.POSITIVE_INFINITY,
  stopOnError = true
} = {}) {
  return new Promise((resolve, reject) => {
    if (typeof mapper !== "function") {
      throw new TypeError("Mapper function is required");
    }
    if (!((Number.isSafeInteger(concurrency) || concurrency === Number.POSITIVE_INFINITY) && concurrency >= 1)) {
      throw new TypeError(`Expected \`concurrency\` to be an integer from 1 and up or \`Infinity\`, got \`${concurrency}\` (${typeof concurrency})`);
    }
    const result = [];
    const errors = [];
    const skippedIndexes = [];
    const iterator = iterable[Symbol.iterator]();
    let isRejected = false;
    let isIterableDone = false;
    let resolvingCount = 0;
    let currentIndex = 0;
    const next = () => {
      if (isRejected) {
        return;
      }
      const nextItem = iterator.next();
      const index = currentIndex;
      currentIndex++;
      if (nextItem.done) {
        isIterableDone = true;
        if (resolvingCount === 0) {
          if (!stopOnError && errors.length > 0) {
            reject(new AggregateError(errors));
          } else {
            for (const skippedIndex of skippedIndexes) {
              result.splice(skippedIndex, 1);
            }
            resolve(result);
          }
        }
        return;
      }
      resolvingCount++;
      (async () => {
        try {
          const element = await nextItem.value;
          if (isRejected) {
            return;
          }
          const value = await mapper(element, index);
          if (value === pMapSkip) {
            skippedIndexes.push(index);
          } else {
            result[index] = value;
          }
          resolvingCount--;
          next();
        } catch (error) {
          if (stopOnError) {
            isRejected = true;
            reject(error);
          } else {
            errors.push(error);
            resolvingCount--;
            next();
          }
        }
      })();
    };
    for (let index = 0; index < concurrency; index++) {
      next();
      if (isIterableDone) {
        break;
      }
    }
  });
}
const pMapSkip = Symbol("skip");
export default pMap;
export {pMapSkip};
