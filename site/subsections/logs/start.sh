#!/bin/sh

export SHOW=$1;
export EXTRA=$2;

thisPath=$(dirname $(realpath $0));
export NAME="${thisPath##*/}";
levelUp=$(dirname $(dirname $thisPath));
export LABEL="${levelUp##*/}";
stagePath=$(dirname $levelUp);
export STAGE="${stagePath##*/}";
export PREFIX="$(echo ${stagePath##*/} | head -c 1)-";
beforePath=$(dirname $stagePath);
export AFTER_TILDA=$(echo $thisPath | sed -e "s|$beforePath/||")/;

dockerName="$PREFIX${LABEL}_$NAME";
docker stop $PREFIX${LABEL}_$NAME 1>/dev/null 2>/dev/null;
docker rm $dockerName 1>/dev/null 2>/dev/null;
docker network create tilda 1>/dev/null 2>/dev/null;
dc=/usr/local/bin/docker-compose;
$dc -f $thisPath/docker-compose.yml down 1>/dev/null 2>/dev/null;
if [ -z "$1" ]
then
	$dc -f $thisPath/docker-compose.yml -p $PREFIX$NAME up -d 1>/dev/null 2>/dev/null;
#	dockerImage="-d ${dockerName}";
	echo $NAME is starting;
else
	$dc -f $thisPath/docker-compose.yml -p $PREFIX$NAME up;
#	dockerImage="$dockerName";
fi;

# docker run \
	# --name $dockerName \
	# --hostname $dockerName \
	# --network tilda \
	# -v ~/:/usr/nodejs/tilda \
	# -v /mnt/sda:/usr/nodejs/sda \
	# -e STAGE="$STAGE" \
	# -e PREFIX="$PREFIX" \
	# -e LABEL="$LABEL" \
	# -e PREFIX="$PREFIX" \
	# -e NAME="$NAME" \
	# -e TILDA="/usr/nodejs/tilda/" \
	# -e AFTER_TILDA="$AFTER_TILDA" \
	# -e SHOW="$SHOW" \
	# -e EXTRA="$EXTRA" \
	# -e TZ='Europe/Moscow' \
	# --memory="512m" \
	# --memory-swap="512m" \
	# $dockerImage;