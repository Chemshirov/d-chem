#!/bin/sh

thisPath=$(dirname $(realpath $0));
NAME="${thisPath##*/}";
levelUp=$(dirname $(dirname $thisPath));
LABEL="${levelUp##*/}";
stagePath=$(dirname $levelUp);
PREFIX="$(echo ${stagePath##*/} | head -c 1)-";

echo $stagePath
docker build -t "$PREFIX""$LABEL"_"$NAME" $thisPath;