#!/bin/sh

thisPath=$(dirname $(realpath $0))
NAME="${thisPath##*/}"
STAGEPATH=$(dirname $thisPath)
STAGE="${STAGEPATH##*/}"
PREFIX="$(echo ${STAGEPATH##*/} | head -c 1)-"

docker build -t "$PREFIX""$NAME" $thisPath