#!/bin/sh

export EXTRA1=$2;

thisPath=$(dirname $(realpath $0));
export NAME="${thisPath##*/}";
levelUp=$(dirname $thisPath);
export LABEL="${levelUp##*/}";
export STAGEPATH=$(dirname $levelUp);
export STAGE="${STAGEPATH##*/}";
export PREFIX="$(echo ${STAGEPATH##*/} | head -c 1)-";
export AFTER_TILDA="$(echo $thisPath | sed -e "s|$PWD/||")"/

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