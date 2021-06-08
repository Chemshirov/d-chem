#!/bin/sh

thisPath=$(dirname $(realpath $0))
export NAME="${thisPath##*/}"
levelUp=$(dirname $thisPath)
export PREFIX="$(echo ${levelUp##*/} | head -c 1)-"

dockerName="$PREFIX"$NAME

docker stop $dockerName 1>/dev/null 2>/dev/null;
docker rm $dockerName 1>/dev/null 2>/dev/null;
docker run --name $dockerName --hostname $NAME --network tilda -d redis 1>/dev/null 2>/dev/null;
echo '\t' $NAME is starting;