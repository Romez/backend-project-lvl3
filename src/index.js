import fs from 'fs';
import path from 'path';
import url from 'url';
import { startsWith } from 'lodash';
import { get } from 'axios';
import cheerio from 'cheerio';
import debug from 'debug';
import Listr from 'listr';

const fsPromises = fs.promises;

const log = debug('page-loader');

const tagsSrcNames = {
  IMG: 'src',
  SCRIPT: 'src',
  LINK: 'href',
};

const isLocalSource = (el) => {
  const srcName = tagsSrcNames[el.prop('tagName')];
  const src = el.attr(srcName);

  if (!src || startsWith(src, 'http') || !startsWith(src, '/')) {
    return false;
  }

  return true;
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
  const targetTask = new Listr([
    {
      title: target,
      task: () => {
        const rootDir = makeResourceName(target);
        log('rootDir: %s', rootDir);

        const assetsDir = `${rootDir}_files`;

        let replacedAssets = [];

        return get(target)
          .catch(({ message }) => {
            throw new Error(`${message} ${target}`);
          })
          .then((targetResponse) => {
            const { html, replacedPaths } = replaceLocalSrc(targetResponse.data, assetsDir);
            replacedAssets = replacedPaths;

            return fsPromises.writeFile(path.join(output, `${rootDir}.html`), html);
          })
          .then(() => replacedAssets.length > 0 && fsPromises.mkdir(path.join(output, assetsDir)))
          .then(() => {
            const assets = replacedAssets.map((assetPath) => {
              const assetUrl = url.resolve(target, assetPath);

              return {
                title: assetUrl,
                task: () => {
                  const assetOutput = path.join(output, assetsDir, makeResourceName(assetPath));
                  const assetWriter = fs.createWriteStream(assetOutput);
                  log('asset output %s', assetOutput);

                  return get(assetUrl, { responseType: 'stream' })
                    .catch(({ message }) => {
                      throw new Error(`${message} ${assetUrl}`);
                    })
                    .then((assetResponse) => new Promise((resolve, reject) => {
                      assetResponse.data.pipe(assetWriter);

                      assetWriter.on('finish', resolve);
                      assetWriter.on('error', reject);
                    }));
                },
              };
            });

            return new Listr(assets, { concurrent: true });
          });
      },
    },
  ]);

  return targetTask.run();
};
