import { promises as fs } from 'fs';
import path from 'path';
import { get } from 'axios';

export default (target, output) => get(target)
  .then(({ data }) => {
    const fileName = target
      .replace(/^https?:\/\//, '')
      .replace(/\W/g, '-')
      .concat('.html');

    const filePath = path.join(output, fileName);
    return fs.writeFile(filePath, data);
  });
