import axios from 'axios';
import fs from 'fs';
import path from 'path';

const ZALLY_URL = 'http://localhost:8000/api-violations';

async function checkSpec(filePath: string, expectedMustViolations: number | 'greater_than_zero'): Promise<boolean> {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ File not found: ${absolutePath}`);
    return false;
  }

  const specContent = fs.readFileSync(absolutePath, 'utf8');
  const payload = {
    api_definition_string: specContent
  };

  try {
    const response = await axios.post(ZALLY_URL, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    // Zally returns violations grouped by violation_type (MUST, SHOULD, MAY, HINT)
    const violations = response.data.violations || [];
    const mustViolations = violations.filter((v: any) => v.violation_type === 'MUST');
    const mustCount = mustViolations.length;

    console.log(`\n--- Results for ${path.basename(filePath)} ---`);
    console.log(`MUST Violations found: ${mustCount}`);

    let passedAssertion = false;
    if (expectedMustViolations === 'greater_than_zero') {
      passedAssertion = mustCount > 0;
      if (passedAssertion) {
        console.log(`✅ Assertion Passed: Expected > 0 MUST violations, got ${mustCount}.`);
        console.log(`Sample Violation Caught: "${mustViolations[0].title}" - ${mustViolations[0].description}`);
      } else {
        console.error(`❌ Assertion Failed: Expected > 0 MUST violations, but got 0. The gate is broken.`);
      }
    } else {
      passedAssertion = mustCount === expectedMustViolations;
      if (passedAssertion) {
        console.log(`✅ Assertion Passed: Expected exactly ${expectedMustViolations} MUST violations.`);
      } else {
        console.error(`❌ Assertion Failed: Expected ${expectedMustViolations} MUST violations, got ${mustCount}.`);
        mustViolations.forEach((v: any, i: number) => {
          console.error(`   [${i + 1}] ${v.title}: ${v.description}`);
        });
      }
    }

    return passedAssertion;

  } catch (error: any) {
    console.error(`❌ Network or API Error reaching Zally at ${ZALLY_URL}:`, error.message);
    return false;
  }
}

async function runGateVerification() {
  console.log('Starting Zally Gate Self-Verification...');

  // 1. Check the real spec (Assertion: MUST = 0)
  const realSpecPassed = await checkSpec('specs/openapi.yaml', 0);

  // 2. Check the known-bad spec (Assertion: MUST > 0)
  const badSpecPassed = await checkSpec('specs/openapi-known-bad.yaml', 'greater_than_zero');

  console.log('\n=======================================');
  if (realSpecPassed && badSpecPassed) {
    console.log('✅ GATE VERIFIED: The Zally linter is active and correctly enforcing rules.');
    process.exit(0);
  } else {
    console.error('❌ GATE FAILED: The verification script detected an assertion failure.');
    process.exit(1);
  }
}

runGateVerification();
