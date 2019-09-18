import fs from 'fs';
import path from 'path';
import { get } from 'axios';

export default (target, dest) => new Promise((resolve, reject) => {
  get(target)
    .then(({ data }) => {
      const fileName = target
        .replace(/^https?:\/\//, '')
        .replace(/\W/g, '-')
        .concat('.html');

      fs.writeFile(path.join(dest, fileName), data, (err) => {
        if (err) {
          reject(err);
        }

        resolve();
      });
    })
    .catch(reject);
});
