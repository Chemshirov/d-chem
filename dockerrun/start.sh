#!/bin/sh

export EXTRA1=$2;
export EXTRA2=$3;
export EXTRA3=$4;
export EXTRA4=$5;

thisPath=$(dirname $(realpath $0));
export NAME="${thisPath##*/}";
stagePath=$(dirname $thisPath);
export STAGE="${stagePath##*/}";
export PREFIX="$(echo ${stagePath##*/} | head -c 1)-";
export AFTER_TILDA=$(echo $thisPath | sed -e "s|$PWD/||")

$thisPath/dockerRunWatcher.sh $STAGE 1>/dev/null 2>/dev/null;

docker network create tilda 1>/dev/null 2>/dev/null;
dc=/usr/local/bin/docker-compose;
$dc -f $thisPath/docker-compose.yml down 1>/dev/null 2>/dev/null;

if [ -z "$1" ]
then
	$dc -f $thisPath/docker-compose.yml up -d 1>/dev/null 2>/dev/null;
	echo '\t' $NAME is starting;
else
	$dc -f $thisPath/docker-compose.yml up;
fi;