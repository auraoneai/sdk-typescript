/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { 
      useESM: true,
      tsconfig: "<rootDir>/tsconfig.json" 
    }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  moduleFileExtensions: ["ts", "tsx", "js", "mjs"],
  testTimeout: 30000,
  maxWorkers: process.env.CI ? 2 : 1,
  bail: false,
};
