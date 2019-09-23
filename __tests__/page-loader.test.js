import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import nock from 'nock';
import loadPage from '../src';

const getFixrurePath = (fileName) => path.join(__dirname, '__fixtures__', fileName);

const host = 'http://hexlet.io';

let tmpdir;

beforeEach(async () => {
  tmpdir = await fs.mkdtemp(os.tmpdir());
});

test('page-loader', async () => {
  nock(host).get('/courses').replyWithFile(200, getFixrurePath('index.html'));
  nock(host).get('/assets/inferno.jpg').replyWithFile(200, getFixrurePath('assets/inferno.jpg'));
  nock(host).get('/assets/styles.css').replyWithFile(200, getFixrurePath('assets/styles.css'));
  nock(host).get('/assets/scripts.js').replyWithFile(200, getFixrurePath('assets/scripts.js'));

  await loadPage('http://hexlet.io/courses', tmpdir);

  const [expected, result, assets] = await Promise.all([
    fs.readFile(getFixrurePath('result.html'), 'utf8'),
    fs.readFile(path.join(tmpdir, 'hexlet-io-courses.html'), 'utf8'),
    fs.readdir(path.join(tmpdir, 'hexlet-io-courses_files')),
  ]);

  expect(result).toMatch(expected);
  expect(assets).toEqual(['inferno.jpg', 'scripts.js', 'styles.css']);
});
