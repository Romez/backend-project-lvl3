import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import nock from 'nock';
import loadPage from '../src';

const getFixturesPath = (fileName) => path.join(__dirname, '__fixtures__', fileName);

let output;
const host = 'http://hexlet.io';

beforeAll(() => {
  nock(host)
    .get('/courses')
    .replyWithFile(200, getFixturesPath('index.html'))
    .get('/assets/img.jpg')
    .replyWithFile(200, getFixturesPath('img.jpeg'))
    .get('/assets/index.js')
    .replyWithFile(200, getFixturesPath('index.js'))
    .get('/assets/styles.css')
    .replyWithFile(200, getFixturesPath('styles.css'));
});

afterEach(() => {
  nock.cleanAll();
});

beforeEach(async () => {
  output = await fs.mkdtemp(path.join(os.tmpdir(), '/'));
});

test('should_save_page_and_assets', async () => {
  await loadPage(`${host}/courses`, output);

  const [expected, result, assets] = await Promise.all([
    fs.readFile(getFixturesPath('result.html'), 'utf8'),
    fs.readFile(path.join(output, 'hexlet-io-courses.html'), 'utf8'),
    fs.readdir(path.join(output, 'hexlet-io-courses_files')),
  ]);

  expect(result).toMatch(expected);
  expect(assets).toEqual(['assets-img.jpg', 'assets-index.js', 'assets-styles.css']);
});

test('should_not_found_target', async () => {
  nock(host).get('/courses').reply(404);

  await expect(loadPage(`${host}/courses`, output))
    .rejects
    .toThrow(`${host}/courses Request failed with status code 404`);
});

test('should_not_found_asset', async () => {
  nock(host).get('/assets/styles.css').reply(404);

  await expect(loadPage(`${host}/assets/styles.css`, output))
    .rejects
    .toThrow(`${host}/assets/styles.css Request failed with status code 404`);
});

test('shoud_throw_access_error', async () => {
  await fs.chmod(output, 0o400);
  const expectedRegexp = new RegExp(`permission denied.*${output}`, 'i');
  await expect(loadPage(`${host}/courses`, output)).rejects.toThrowError(expectedRegexp);
});

test('shoud_not_found_output_dir', async () => {
  const undefinedPath = '/undfined';
  const expectedRegexp = new RegExp(`no such file or directory.*${undefinedPath}`, 'i');
  await expect(loadPage(`${host}/courses`, undefinedPath)).rejects.toThrowError(expectedRegexp);
});
