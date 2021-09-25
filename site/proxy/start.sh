#!/bin/sh

export SHOW=$1; 
export EXTRA=$2;

thisPath=$(dirname $(realpath $0));
export NAME="${thisPath##*/}";
levelUp=$(dirname $thisPath);
export LABEL="${levelUp##*/}";
stagePath=$(dirname $levelUp);
export STAGE="${stagePath##*/}";
export PREFIX="$(echo ${stagePath##*/} | head -c 1)-";
beforePath=$(dirname $stagePath);
export AFTER_TILDA=$(echo $thisPath | sed -e "s|$beforePath/||")/;

docker stop $PREFIX${LABEL}_$NAME 1>/dev/null 2>/dev/null;
docker network create tilda 1>/dev/null 2>/dev/null;
dc=/usr/local/bin/docker-compose;
$dc -f $thisPath/docker-compose.yml down 1>/dev/null 2>/dev/null;
if [ -z "$SHOW" ]
then
	$dc -f $thisPath/docker-compose.yml -p $PREFIX$NAME up -d 1>/dev/null 2>/dev/null;
	echo $NAME is starting;
else
	$dc -f $thisPath/docker-compose.yml -p $PREFIX$NAME up;
fi;