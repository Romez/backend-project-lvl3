import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import nock from 'nock';
import loadPage, { makeFileName } from '../src';

const getFixturesPath = (fileName) => path.join(__dirname, '__fixtures__', fileName);

let tmpdir;
const host = 'http://hexlet.io';

beforeEach(async () => {
  tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), '/'));
});

const targetsSet = [
  ['http://hexlet.io/courses', 'hexlet-io-courses.html'],
  ['http://hexlet.io/courses/', 'hexlet-io-courses.html'],
];

test.each(targetsSet)('should_make_valid_name from "%s" to "%s"', (target, result) => {
  expect(makeFileName(target)).toBe(result);
});

test('should_save_page', async () => {
  nock(host).get('/courses').replyWithFile(200, getFixturesPath('index.html'));

  await loadPage(`${host}/courses`, tmpdir);

  const [expected, result] = await Promise.all([
    fs.readFile(getFixturesPath('index.html'), 'utf8'),
    fs.readFile(path.join(tmpdir, 'hexlet-io-courses.html'), 'utf8'),
  ]);

  expect(result).toMatch(expected);
});
