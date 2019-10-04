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

describe('check_resources', () => {
  test('target_is_not_found', async () => {
    nock(host).get('/courses').reply(404);

    await expect(loadPage(`${host}/courses`, tmpdir))
      .rejects.toThrow('Request failed with status code 404 http://hexlet.io/courses');
  });

  test('assets_not_available', async () => {
    nock(host)
      .get('/courses')
      .replyWithFile(200, getFixturesPath('index.html'))
      .get('/assets/inferno.jpg')
      .replyWithFile(200, getFixturesPath('assets/inferno.jpg'))
      .get('/assets/styles.css')
      .replyWithFile(200, getFixturesPath('assets/styles.css'))
      .get('/assets/scripts.js')
      .reply(403);

    await expect(loadPage(`${host}/courses`, tmpdir))
      .rejects.toThrow('Request failed with status code 403 http://hexlet.io/assets/scripts.js');
  });
});

describe('check_files', () => {
  beforeEach(() => {
    nock(host)
      .get('/courses')
      .replyWithFile(200, getFixturesPath('index.html'))
      .get('/assets/inferno.jpg')
      .replyWithFile(200, getFixturesPath('assets/inferno.jpg'))
      .get('/assets/styles.css')
      .replyWithFile(200, getFixturesPath('assets/styles.css'))
      .get('/assets/scripts.js')
      .replyWithFile(200, getFixturesPath('assets/scripts.js'));
  });

  test('page-loader', async () => {
    await loadPage(`${host}/courses`, tmpdir);

    const [expected, result, assets] = await Promise.all([
      fs.readFile(getFixturesPath('result.html'), 'utf8'),
      fs.readFile(path.join(tmpdir, 'hexlet-io-courses.html'), 'utf8'),
      fs.readdir(path.join(tmpdir, 'hexlet-io-courses_files')),
    ]);

    expect(result).toMatch(expected);
    expect(assets).toEqual(['assets-inferno.jpg', 'assets-scripts.js', 'assets-styles.css']);
  });

  test('output_error', async () => {
    await expect(loadPage(`${host}/courses`, '/undefined'))
      .rejects.toThrow('/undefined');
  });

  test('permissions_error', async () => {
    await fs.chmod(tmpdir, 0o400);
    await expect(loadPage(`${host}/courses`, tmpdir)).rejects.toThrow(tmpdir);
  });
});
