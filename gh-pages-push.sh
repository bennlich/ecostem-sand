#!/bin/sh

repo=ecostem-sand

mkdir gh_pages_tmp && \
pushd gh_pages_tmp && \
  git clone git@github.com:simtable/$repo.git && \
  pushd $repo && \
    (git push origin --delete gh-pages || true ) && \
    git branch gh-pages && \
    git checkout gh-pages && \
    git pull origin master && \
    git clone git@github.com:simtable/st-api.git && \
    rm -rf st-api/.git && \
    git add st-api && \
    (git commit -a -m 'update' || true) && \
    (git push origin gh-pages || true) && \
  popd && \
popd && \
rm -rf gh_pages_tmp
