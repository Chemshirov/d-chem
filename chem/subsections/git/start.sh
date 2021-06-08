#!/bin/sh

export EXTRA1=$2;
export EXTRA2=$3;

thisPath=$(dirname $(realpath $0));
export NAME="${thisPath##*/}";
levelUp=$(dirname $(dirname $thisPath));
export LABEL="${levelUp##*/}";
stagePath=$(dirname $levelUp);
export STAGE="${stagePath##*/}";
export PREFIX="$(echo ${stagePath##*/} | head -c 1)-";
export AFTER_TILDA="$(echo $thisPath | sed -e "s|$PWD/||")"/

docker network create tilda 1>/dev/null 2>/dev/null;
dc=/usr/local/bin/docker-compose;
$dc -f $thisPath/docker-compose.yml down 1>/dev/null 2>/dev/null;

if [ -z "$1" ]
then
#	$dc -f $thisPath/docker-compose.yml -p "$PREFIX""$LABEL"_"$NAME" up -d 1>/dev/null 2>/dev/null;
	$dc -f $thisPath/docker-compose.yml  up -d 1>/dev/null 2>/dev/null;
	echo $NAME is starting;
else
# 	$dc -f $thisPath/docker-compose.yml -p "$PREFIX""$LABEL"_"$NAME" up;
	$dc -f $thisPath/docker-compose.yml up --remove-orphans;
fi;