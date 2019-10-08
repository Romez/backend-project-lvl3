#!/usr/bin/env node

import program from 'commander';
import { version, description } from '../../package.json';
import loadPage from '..';

program
  .description(description)
  .version(version)
  .arguments('<target>')
  .option('-o, --output [dest]', 'Output directory', process.cwd())
  .action((target, { output }) => loadPage(target, output).catch((err) => {
    console.error(err);
    process.exit(1);
  }))
  .parse(process.argv);
