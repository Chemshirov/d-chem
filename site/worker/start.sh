#!/bin/sh

export SHOW=$1;
export CPUS=$2;
if [ -z "$CPUS" ]; then
	CPUS="2";
fi;
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

DOCKER_NAME="$PREFIX${LABEL}_$NAME";
docker stop $DOCKER_NAME 1>/dev/null 2>/dev/null;
docker rm $DOCKER_NAME 1>/dev/null 2>/dev/null;
docker network create tilda 1>/dev/null 2>/dev/null;
if [ -z "$SHOW" ]
then
	dockerImage="-d ${DOCKER_NAME}";
	echo $NAME is starting;
else
	dockerImage="$DOCKER_NAME";
fi;

TILDA="/usr/nodejs/tilda/"
SDA="/usr/nodejs/sda"
docker run \
	--name $DOCKER_NAME \
	--hostname $DOCKER_NAME \
	--network tilda \
	-v ~/:"$TILDA" \
	-v /mnt/sda:"$SDA" \
	-v ~/.ssh:/root/.ssh \
	-e STAGE="$STAGE" \
	-e PREFIX="$PREFIX" \
	-e LABEL="$LABEL" \
	-e PREFIX="$PREFIX" \
	-e NAME="$NAME" \
	-e TILDA="$TILDA" \
	-e AFTER_TILDA="$AFTER_TILDA" \
	-e SDA="$SDA" \
	-e SHOW="$SHOW" \
	-e CPUS="$CPUS" \
	-e EXTRA="$EXTRA" \
	-e TZ='Europe/Moscow' \
	--cpus="$CPUS" \
	$dockerImage; 