#!/usr/bin/env node
// Cross-platform runner for Next.js avoiding Windows cmd ampersand escaping bugs
const { resolve } = require("path");

process.argv.splice(1, 1, "next");
require("next/dist/bin/next");
