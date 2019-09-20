.PHONY: coverage

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

coverage:
	npm run coverage

help:
	npx babel-node src/bin/page-loader.js -h

run:
	npx babel-node src/bin/page-loader.js 'http://hexlet.io/courses'
