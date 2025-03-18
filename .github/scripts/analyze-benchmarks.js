const fs = require('fs');
const path = require('path');

// Configuration
const REGRESSION_THRESHOLD = 0.05; // 5% regression threshold
const SIGNIFICANT_CHANGE_THRESHOLD = 0.02; // 2% is considered a significant change

function parseBenchmarkResults(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.trim().split('\n');
    const results = {};

    lines.forEach(line => {
        const [name, min, max] = line.split('\t');
        if (name && min && max) {
            results[name.trim()] = {
                min: parseInt(min, 10),
                max: parseInt(max, 10),
                mean: (parseInt(min, 10) + parseInt(max, 10)) / 2
            };
        }
    });

    return results;
}

function compareResults(baseResults, prResults) {
    const comparison = {
        regressions: [],
        improvements: [],
        unchanged: [],
        hasRegression: false
    };

    for (const [testName, prResult] of Object.entries(prResults)) {
        const baseResult = baseResults[testName];
        if (!baseResult) continue;

        const changePct = (prResult.mean - baseResult.mean) / baseResult.mean;

        const result = {
            name: testName,
            baseMean: baseResult.mean,
            prMean: prResult.mean,
            changePercent: changePct * 100
        };

        if (changePct > REGRESSION_THRESHOLD) {
            comparison.regressions.push(result);
            comparison.hasRegression = true;
        } else if (changePct < -SIGNIFICANT_CHANGE_THRESHOLD) {
            comparison.improvements.push(result);
        } else {
            comparison.unchanged.push(result);
        }
    }

    return comparison;
}

function generateReport(comparison) {
    let summary = '';
    let details = '';

    if (comparison.hasRegression) {
        summary = '🔴 Performance regressions detected that exceed the threshold of 5%.\n';
    } else if (comparison.improvements.length > 0) {
        summary = '🟢 Performance improvements detected!\n';
    } else {
        summary = '🟡 No significant performance changes detected.\n';
    }

    if (comparison.regressions.length > 0) {
        details += '### Regressions\n\n';
        details += '| Test | Base (ms) | PR (ms) | Change |\n';
        details += '|------|-----------|---------|--------|\n';
        comparison.regressions.forEach(r => {
            details += `| ${r.name} | ${r.baseMean.toFixed(2)} | ${r.prMean.toFixed(2)} | +${r.changePercent.toFixed(2)}% |\n`;
        });
        details += '\n';
    }

    if (comparison.improvements.length > 0) {
        details += '### Improvements\n\n';
        details += '| Test | Base (ms) | PR (ms) | Change |\n';
        details += '|------|-----------|---------|--------|\n';
        comparison.improvements.forEach(r => {
            details += `| ${r.name} | ${r.baseMean.toFixed(2)} | ${r.prMean.toFixed(2)} | ${r.changePercent.toFixed(2)}% |\n`;
        });
        details += '\n';
    }

    return {
        hasRegression: comparison.hasRegression,
        summary,
        details
    };
}

// Main execution
const baseResults = parseBenchmarkResults(path.join('benchmark-results', 'base.txt'));
const prResults = parseBenchmarkResults(path.join('benchmark-results', 'pr.txt'));

const comparison = compareResults(baseResults, prResults);
const report = generateReport(comparison);

// Write analysis results
fs.writeFileSync(
    path.join('benchmark-results', 'analysis.json'),
    JSON.stringify(report, null, 2)
); 