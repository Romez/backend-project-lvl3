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

test('page-loader', async () => {
  nock(host)
    .get('/courses')
    .replyWithFile(200, getFixturesPath('index.html'))
    .get('/assets/inferno.jpg')
    .replyWithFile(200, getFixturesPath('assets/inferno.jpg'))
    .get('/assets/styles.css')
    .replyWithFile(200, getFixturesPath('assets/styles.css'))
    .get('/assets/scripts.js')
    .replyWithFile(200, getFixturesPath('assets/scripts.js'));

  await loadPage(`${host}/courses`, tmpdir);

  const [expected, result, assets] = await Promise.all([
    fs.readFile(getFixturesPath('result.html'), 'utf8'),
    fs.readFile(path.join(tmpdir, 'hexlet-io-courses.html'), 'utf8'),
    fs.readdir(path.join(tmpdir, 'hexlet-io-courses_files')),
  ]);

  expect(result).toMatch(expected);
  expect(assets).toEqual(['inferno.jpg', 'scripts.js', 'styles.css']);
});

test('target_is_not_found', async () => {
  nock(host).get('/courses').reply(404);

  await expect(loadPage(`${host}/courses`, tmpdir)).rejects.toThrow();
});

test('resources_error', async () => {
  nock(host)
    .get('/courses')
    .replyWithFile(200, getFixturesPath('index.html'))
    .get('/assets/inferno.jpg')
    .replyWithFile(200, getFixturesPath('assets/inferno.jpg'))
    .get('/assets/styles.css')
    .replyWithFile(200, getFixturesPath('assets/styles.css'))
    .get('/assets/scripts.js')
    .reply(404);

  await expect(loadPage(`${host}/courses`, tmpdir)).rejects.toThrow();
});
