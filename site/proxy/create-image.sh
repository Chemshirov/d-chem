#!/bin/sh

thisPath=$(dirname $(realpath $0));
NAME="${thisPath##*/}";
levelUp=$(dirname $thisPath);
LABEL="${levelUp##*/}";
STAGEPATH=$(dirname $levelUp);
STAGE="${STAGEPATH##*/}";
PREFIX="$(echo ${STAGEPATH##*/} | head -c 1)-";

docker build -t "$PREFIX""$LABEL"_"$NAME" $thisPath;