#!/usr/bin/env node
const path = require("path");
const rootDir = path.resolve(__dirname, "..");
process.chdir(__dirname);
require(path.join(rootDir, "node_modules", "eslint", "bin", "eslint.js"));
