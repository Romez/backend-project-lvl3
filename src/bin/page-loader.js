#!/usr/bin/env node

import program from 'commander';
import { version, description } from '../../package.json';

program
  .description(description)
  .version(version)
  .arguments('<target>')
  .option('-o, --output [dest]', 'Output directory', __dirname)
  .parse(process.argv);
