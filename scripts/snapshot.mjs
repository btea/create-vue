#!/usr/bin/env zx
import fs from 'node:fs'
import 'zx/globals'

$.verbose = false

if (!/pnpm/.test(process.env.npm_config_user_agent ?? ''))
  throw new Error("Please use pnpm ('pnpm run snapshot') to generate snapshots!")

const featureFlags = [
  'bare',
  'typescript',
  'jsx',
  'router',
  'pinia',
  'vitest',
  'cypress',
  'playwright',
  'nightwatch',
  'eslint',
  // Skipped oxlint for now as too many files in playground
  // caused GitHub Actions to fail with (EMFILE: too many open files)
  // 'eslint-with-oxlint',
  'prettier',
]
const featureFlagsDenylist = [
  ['cypress', 'playwright'],
  ['playwright', 'nightwatch'],
  ['cypress', 'nightwatch'],
  ['cypress', 'playwright', 'nightwatch'],
  ['eslint', 'eslint-with-oxlint'],
]

// The following code & comments are generated by GitHub CoPilot.
function fullCombination(arr) {
  const combinations = []

  // for an array of 5 elements, there are 2^5 - 1= 31 combinations
  // (excluding the empty combination)
  // equivalent to the following:
  // [0, 0, 0, 0, 1] ... [1, 1, 1, 1, 1]
  // We can represent the combinations as a binary number
  // where each digit represents a flag
  // and the number is the index of the flag
  // e.g.
  // [0, 0, 0, 0, 1] = 0b0001
  // [1, 1, 1, 1, 1] = 0b1111

  // Note we need to exclude the empty combination in our case
  for (let i = 1; i < 1 << arr.length; i++) {
    const combination = []
    for (let j = 0; j < arr.length; j++) {
      if (i & (1 << j)) {
        combination.push(arr[j])
      }
    }
    combinations.push(combination)
  }

  return combinations
}

let flagCombinations = fullCombination(featureFlags)
flagCombinations.push(['default'], ['bare', 'default'])

// `--with-tests` are equivalent of `--vitest --cypress`
// Previously it means `--cypress` without `--vitest`.
// Here we generate the snapshots only for the sake of easier comparison with older templates.
// They may be removed in later releases.
const withTestsFlags = fullCombination(['typescript', 'jsx', 'router', 'pinia']).map((args) => [
  ...args,
  'with-tests',
])
withTestsFlags.push(['with-tests'])

flagCombinations.push(...withTestsFlags)

const playgroundDir = path.resolve(__dirname, '../playground/')
cd(playgroundDir)

// remove all previous combinations
for (const flags of flagCombinations) {
  const projectName = flags.join('-')

  console.log(`Removing previously generated project ${projectName}`)
  fs.rmSync(projectName, { recursive: true, force: true })
}

// Filter out combinations that are not allowed
flagCombinations = flagCombinations
  .filter(
    (combination) =>
      !featureFlagsDenylist.some((denylist) =>
        denylist.every((flag) => combination.includes(flag)),
      ),
  )
  // `--bare` is a supplementary flag and should not be used alone
  .filter((combination) => !(combination.length === 1 && combination[0] === 'bare'))

const bin = path.posix.relative('../playground/', '../bundle.js')

for (const flags of flagCombinations) {
  const projectName = flags.join('-')

  console.log(`Creating project ${projectName}`)
  await $`node ${[bin, projectName, ...flags.map((flag) => `--${flag}`), '--force']}`
}
