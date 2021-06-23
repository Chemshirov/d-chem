#!/bin/sh

export CACHE_ON=$2;
export EXTRA=$3;

thisPath=$(dirname $(realpath $0));
export NAME="${thisPath##*/}";
levelUp=$(dirname $thisPath);
export LABEL="${levelUp##*/}";
stagePath=$(dirname $levelUp);
export STAGE="${stagePath##*/}";
export PREFIX="$(echo ${stagePath##*/} | head -c 1)-";
beforePath=$(dirname $stagePath);
export AFTER_TILDA=$(echo $thisPath | sed -e "s|$beforePath/||")/;

docker network create tilda 1>/dev/null 2>/dev/null;
dc=/usr/local/bin/docker-compose;
$dc -f $thisPath/docker-compose.yml down 1>/dev/null 2>/dev/null;

if [ -z "$1" ]
then
	$dc -f $thisPath/docker-compose.yml up -d 1>/dev/null 2>/dev/null;
	echo $NAME is starting;
else
	$dc -f $thisPath/docker-compose.yml up;
fi;