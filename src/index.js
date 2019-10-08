import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';
import { startsWith } from 'lodash';
import { get } from 'axios';
import cheerio from 'cheerio';
import debug from 'debug';
import Listr from 'listr';

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

const makeResourceName = (target) => {
  if (startsWith(target, 'http')) {
    return target
      .replace(/^https?:\/\//, '')
      .replace(/\W/g, '-');
  }

  const ext = path.extname(target);
  return target
    .replace(/^\//, '')
    .replace(ext, '')
    .replace(/\W/g, '-')
    .concat(ext);
};

const replaceLocalSrc = (html, assetPath) => {
  const $ = cheerio.load(html);

  const replacedPaths = $('img, link, script')
    .filter((_, el) => isLocalSource($(el)))
    .map((_, el) => {
      const srcName = tagsSrcNames[$(el).prop('tagName')];

      const oldSrc = $(el).attr(srcName);
      const newSrc = path.join(assetPath, makeResourceName(oldSrc));

      $(el).attr(srcName, newSrc);

      return oldSrc;
    }).toArray();

  return { html: $.html(), replacedPaths };
};

export default (target, output) => {
  const rootDir = makeResourceName(target);
  log('rootDir: %s', rootDir);

  const assetsDir = `/${rootDir}_files`;
  let results = [];

  const targetTask = new Listr([
    {
      title: target,
      task: () => get(target).catch((data) => {
        throw new Error(`${data.message} ${target}`);
      }).then((targetRes) => {
        const { html, replacedPaths } = replaceLocalSrc(targetRes.data, assetsDir);

        results = results.concat({ output: path.join(output, `${rootDir}.html`), data: html });

        return new Listr(replacedPaths.map((resourcePath) => {
          const assetUrl = url.resolve(target, resourcePath);

          const task = () => get(assetUrl).catch((data) => {
            throw new Error(`${data.message} ${assetUrl}`);
          }).then(({ data }) => {
            const assetOutput = path.join(output, assetsDir, makeResourceName(resourcePath));
            log('asset output %s', assetOutput);
            results = results.concat({ output: assetOutput, data });
          });

          return { title: assetUrl, task };
        }));
      }),
    },
  ]);

  return targetTask.run()
    .then(() => results.length > 0 && fs.mkdir(path.join(output, assetsDir)))
    .then(() => Promise.all(results.map((asset) => fs.writeFile(asset.output, asset.data))));
};
