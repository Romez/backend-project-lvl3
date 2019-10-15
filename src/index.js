import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';
import axios from 'axios';
import _ from 'lodash';

export const makeFileName = _.flow(
  url.parse,
  ({ hostname, pathname }) => `${hostname}${pathname}`,
  (value) => _.trim(value, '/'),
  (value) => value.replace(/\W/g, '-'),
  (value) => `${value}.html`,
);

export default (target, output) => {
  return axios.get(target)
    .then((response) => {
      const filepath = path.resolve(output, makeFileName(target));
      // console.log(filepath);
      return fs.writeFile(filepath, response.data);
    });
};
