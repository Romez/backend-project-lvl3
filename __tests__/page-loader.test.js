import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import nock from 'nock';
import loadPage from '../src';

const getFixturesPath = (fileName) => path.join(__dirname, '__fixtures__', fileName);

let tmpdir;
const host = 'http://hexlet.io';

beforeEach(async () => {
  tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), '/'));
});

test('should_save_page_and_assets', async () => {
  nock(host)
    .get('/courses')
    .replyWithFile(200, getFixturesPath('index.html'))
    .get('/assets/img.jpg')
    .replyWithFile(200, getFixturesPath('img.jpeg'))
    .get('/assets/index.js')
    .replyWithFile(200, getFixturesPath('index.js'))
    .get('/assets/styles.css')
    .replyWithFile(200, getFixturesPath('styles.css'));

  await loadPage(`${host}/courses`, tmpdir);

  const [expected, result, assets] = await Promise.all([
    fs.readFile(getFixturesPath('result.html'), 'utf8'),
    fs.readFile(path.join(tmpdir, 'hexlet-io-courses.html'), 'utf8'),
    fs.readdir(path.join(tmpdir, 'hexlet-io-courses_files')),
  ]);

  expect(result).toMatch(expected);
  expect(assets).toEqual(['assets-img.jpg', 'assets-index.js', 'assets-styles.css']);
});
