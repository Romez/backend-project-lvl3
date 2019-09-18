install:
	npm install

publish:
	npm publish --dry-run

build:
	rm -rf dist
	npm run build

lint:
	npx eslint .

test:
	npm test

test-watch:
	npm run test-watch

help:
	npx babel-node src/bin/page-loader.js -h
