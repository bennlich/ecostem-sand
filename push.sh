#!/bin/sh

git checkout master && \
git push && \
git checkout gh-pages && \
git pull origin master && \
git push && \
git checkout master
