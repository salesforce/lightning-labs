#!/usr/bin/env node
import { main } from './src/runner.js';

main().then(console.log, console.error);
