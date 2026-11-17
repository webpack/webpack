
      class Number {

      }

      /("|')(?<value>(\\(\1)|[^\1])*)?(\1)/.exec(`'\\"\\'aa'`);

      const x = `"${label.replace(/"/g, "\\\"")}"`
    