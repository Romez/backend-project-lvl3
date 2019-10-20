import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';
import axios from 'axios';
import { trim, flow, isEmpty } from 'lodash';
import cheerio from 'cheerio';
import debug from 'debug';

const log = debug('page-loader');

export const makePageFilename = flow(
  url.parse,
  ({ hostname, pathname }) => `${hostname}${pathname}`,
  (value) => trim(value, '/'),
  (value) => value.replace(/\W/g, '-'),
);

const makeAssetName = (target) => {
  const ext = path.extname(target);

  return trim(target, '/')
    .replace(ext, '')
    .replace(/\W/g, '-')
    .concat(ext);
};

const isLocal = (target) => {
  const reg = new RegExp('(?:^[a-z][a-z0-9+.-]*:|//)', 'i');
  return !reg.test(target);
};

const attributes = { link: 'href', img: 'src', script: 'src' };

const replaceAssets = (html, assetsPath) => {
  const $ = cheerio.load(html);

  const assets = $('img, link, script')
    .toArray()
    .reduce((acc, el) => {
      const attrubute = attributes[el.name];
      const oldValue = el.attribs[attrubute];

      if (!oldValue || !isLocal(oldValue)) {
        return acc;
      }

      const newValue = path.join(assetsPath, makeAssetName(oldValue));
      log('oldAsset: %s', oldValue);
      log('newAsset: %s', newValue);

      $(el).attr(attrubute, newValue);

      return acc.concat(oldValue);
    }, []);

  return { html: $.html(), assets };
};

export default (target, output) => {
  const baseName = makePageFilename(target);
  const htmlFilePath = path.resolve(output, `${baseName}.html`);
  const assetsPath = path.join(output, `${baseName}_files`);
  let assets = [];

  return axios
    .get(target)
    .catch(({ message, code }) => { throw new Error(`${target} ${message} ${code}`); })
    .then(({ data }) => {
      const result = replaceAssets(data, `${baseName}_files`);
      assets = result.assets;

      log('htmlFilePath: %s', htmlFilePath);
      return fs.writeFile(htmlFilePath, result.html);
    })
    .then(() => !isEmpty(assets) && fs.mkdir(assetsPath))
    .then(() => {
      const promises = assets.map((asset) => axios
        .get(url.resolve(target, asset), { responseType: 'arraybuffer' })
        .then(({ data }) => fs.writeFile(path.join(assetsPath, makeAssetName(asset)), data)));

      return Promise.all(promises);
    });
};
