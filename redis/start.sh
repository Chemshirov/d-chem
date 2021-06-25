#!/bin/sh

thisPath=$(dirname $(realpath $0))
export NAME="${thisPath##*/}"
stagePath=$(dirname $thisPath)
export PREFIX="$(echo ${stagePath##*/} | head -c 1)-"
dockerName="$PREFIX"$NAME

docker stop $dockerName 1>/dev/null 2>/dev/null;
docker rm $dockerName 1>/dev/null 2>/dev/null;
docker run --name $dockerName --hostname $dockerName --network tilda \
	-p $1:6379 \
	-v /mnt/sda/development/redis:/redis \
	-d redis redis-server /redis/redis.conf 1>/dev/null 2>/dev/null;
echo '\t' $dockerName is starting;