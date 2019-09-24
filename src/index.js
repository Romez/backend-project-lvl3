import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';
import { startsWith } from 'lodash';
import { get } from 'axios';
import cheerio from 'cheerio';
import debug from 'debug';

const log = debug('page-loader');

const tagsSrcNames = {
  IMG: 'src',
  SCRIPT: 'src',
  LINK: 'href',
};

const isLocalSource = (el) => {
  const srcName = tagsSrcNames[el.prop('tagName')];
  const src = el.attr(srcName);

  log('isLocalSource %s, %s', srcName, src);

  if (!src) {
    return false;
  }

  return !startsWith(src, 'http');
};

const replaceLocalSrc = (html, assetPath) => {
  const $ = cheerio.load(html);

  const replacedPaths = $('img, link, script')
    .filter((_, el) => isLocalSource($(el)))
    .map((_, el) => {
      const srcName = tagsSrcNames[$(el).prop('tagName')];

      const oldSrc = $(el).attr(srcName);
      const newSrc = path.join(assetPath, path.basename(oldSrc));

      $(el).attr(srcName, newSrc);

      return oldSrc;
    }).toArray();

  log('assetsPaths: %o', replacedPaths);
  return { html: $.html(), replacedPaths };
};

export default (target, output) => {
  const rootDir = target.replace(/^https?:\/\//, '').replace(/\W/g, '-');
  log('rootDir: %s', rootDir);

  const assetsDir = `/${rootDir}_files`;
  const assetsPath = path.join(output, assetsDir);
  let paths;

  const saveAssetData = ({ request, data }) => {
    const assetPath = path.join(assetsPath, path.basename(request.path));
    log('assetPath: %s', assetPath);
    return fs.writeFile(assetPath, data);
  };

  return get(target)
    .then(({ data }) => {
      const { html, replacedPaths } = replaceLocalSrc(data, assetsDir);
      paths = replacedPaths;

      return fs.writeFile(path.join(output, `${rootDir}.html`), html);
    })
    .then(() => fs.mkdir(assetsPath))
    .then(() => Promise.all(paths.map((pathname) => get(url.resolve(target, pathname)))))
    .then((results) => Promise.all(results.map(saveAssetData)));
};
