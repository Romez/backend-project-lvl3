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

  return { html: $.html(), replacedPaths };
};

const makeResourceName = (resourceUrl) => resourceUrl.replace(/^https?:\/\//, '').replace(/\W/g, '-');

export default (target, output) => {
  const rootDir = makeResourceName(target);
  log('rootDir: %s', rootDir);

  const assetsDir = `/${rootDir}_files`;
  const assetsPath = path.join(output, assetsDir);
  log('assetsPath: %s', assetsPath);

  let paths;

  return get(target)
    .catch((data) => {
      throw new Error(`${data.message} ${target}`);
    })
    .then(({ data }) => {
      const { html, replacedPaths } = replaceLocalSrc(data, assetsDir);
      log('replacedPaths: %o', replacedPaths);

      paths = replacedPaths;

      return fs.writeFile(path.join(output, `${rootDir}.html`), html);
    })
    .then(() => paths.length > 0 && fs.mkdir(assetsPath))
    .then(() => Promise.all(paths.map((resourcePath) => get(url.resolve(target, resourcePath)))))
  // .catch((data) => {
  // console.log('data: ', data)
  // throw new Error(`${data.message} ${resourceUrl}`);
  // })
    .then(({ request, data }) => {
      console.log(request)
      // const resourceFilePath = path.join(assetsPath, path.basename(resourcePath));
      // return fs.writeFile(resourceFilePath, data);
    });
  ;
};
