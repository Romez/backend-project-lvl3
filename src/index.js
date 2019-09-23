import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';
import { startsWith, isEmpty } from 'lodash';
import { get } from 'axios';
import cheerio from 'cheerio';

const makeDirectoryName = (target) => target.replace(/^https?:\/\//, '').replace(/\W/g, '-');

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

const replaceAssets = (html, assetPath) => {
  const $ = cheerio.load(html);

  const oldPaths = $('img, link, script')
    .filter((_, el) => isLocalSource($(el)))
    .map((_, el) => {
      const srcName = tagsSrcNames[$(el).prop('tagName')];

      const oldAttr = $(el).attr(srcName);
      const newAttr = path.join(assetPath, path.basename(oldAttr));

      $(el).attr(srcName, newAttr);

      return oldAttr;
    }).toArray();

  return { html: $.html(), oldPaths };
};

export default (target, output) => get(target)
  .then(({ data }) => {
    const targetUrl = url.parse(target);
    const dirName = makeDirectoryName(target);
    const assetsDir = `/${dirName}_files`;

    const { html, oldPaths } = replaceAssets(data, assetsDir);

    return fs.writeFile(path.join(output, `${dirName}.html`), html)
      .then(() => {
        if (isEmpty(oldPaths)) {
          return true;
        }

        const assetsPath = path.join(output, assetsDir);
        return fs.mkdir(assetsPath)
          .then(() => Promise.all(oldPaths.map((pathname) => {
            const assetUrl = url.format({ ...targetUrl, pathname });
            return get(assetUrl).then((res) => {
              const assetPath = path.join(assetsPath, path.basename(pathname));
              return fs.writeFile(assetPath, res.data);
            });
          })));
      });
  }).then();
