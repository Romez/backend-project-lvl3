import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';
import axios from 'axios';
import { trim, flow } from 'lodash';
import cheerio from 'cheerio';

export const makeFileName = flow(
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

const isLocal = /^((?!data|http).*)/gi;

const attrNames = { link: 'href', img: 'src', script: 'src' };

const replaceAssets = (html, baseName) => {
  const $ = cheerio.load(html);

  const replacedPaths = [];

  $('img, link, script')
    .filter((_, el) => {
      const val = $(el).prop(attrNames[el.tagName]);
      // console.log(val)
      return isLocal.test(val);
    })
    .each((id, el) => {
      const attrName = attrNames[el.tagName];
      const oldVal = $(el).prop(attrName);

      const newVal = path.join(`${baseName}_files`, makeAssetName(oldVal));
      // console.log(newVal)
      $(el).attr(attrName, newVal);

      replacedPaths[id] = oldVal;
    });

  return [$.html(), replacedPaths];
};

export default (target, output) => {
  const baseName = makeFileName(target);
  const assetsPath = path.join(output, `${baseName}_files`);
  let pathnames = [];

  return axios.get(target)
    .then((response) => {
      const filepath = path.resolve(output, `${baseName}.html`);

      const [html, replacedPaths] = replaceAssets(response.data, baseName);
      pathnames = replacedPaths;

      return fs.writeFile(filepath, html);
    })
    .then(() => fs.mkdir(assetsPath))
    .then(() => {
      const urls = pathnames.map((pathname) => url.resolve(target, pathname));
      const promises = urls.map((assetUrl) => axios.get(assetUrl));
      return Promise.all(promises);
    })
    .then((responses) => {
      const promises = responses.map((response) => {
        const filepath = path.join(assetsPath, makeAssetName(response.request.options.pathname));
        // console.log(filepath);
        return fs.writeFile(filepath, response.data);
      });

      return Promise.all(promises);
    });
};
