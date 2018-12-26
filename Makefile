.PHONY: build
build: node_modules
	./node_modules/.bin/gulp

.PHONY: serve
serve: node_modules
	./node_modules/.bin/gulp serve

.PHONY: node_modules
node_modules: .phony-node_modules
.phony-node_modules: package.json
	npm install
	@touch $@
