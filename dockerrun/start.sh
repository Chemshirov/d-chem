#!/bin/sh

export START=$2;

thisPath=$(dirname $(realpath $0));
export NAME="${thisPath##*/}";
stagePath=$(dirname $thisPath);
export STAGE="${stagePath##*/}";
export PREFIX="$(echo ${stagePath##*/} | head -c 1)-";
beforePath=$(dirname $stagePath);
export AFTER_TILDA=$(echo $thisPath | sed -e "s|$beforePath/||")/

$thisPath/dockerRunWatcher.sh $STAGE 1>/dev/null 2>/dev/null;

docker stop $PREFIX$NAME 1>/dev/null 2>/dev/null;
docker network create tilda 1>/dev/null 2>/dev/null;
dc=/usr/local/bin/docker-compose;
if [ -z "$1" ]
then
	$dc -f $thisPath/docker-compose.yml -p $PREFIX$NAME up -d 1>/dev/null 2>/dev/null;
	echo '\t' $PREFIX$NAME is starting;
else
	$dc -f $thisPath/docker-compose.yml -p $PREFIX$NAME up;
fi;