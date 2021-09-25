#!/bin/sh

thisPath=$(dirname $(realpath $0))
export NAME="${thisPath##*/}"
levelup=$(dirname $thisPath)
export STAGE="$(echo ${levelup##*/})"
export PREFIX="$(echo ${STAGE##*/} | head -c 1)-"

dockerName="$PREFIX"$NAME
confFile="/mnt/sda/$STAGE/$NAME/$NAME.conf"
PASSWORD=$(cat $confFile)

docker kill $dockerName 1>/dev/null 2>/dev/null;
docker rm $dockerName 1>/dev/null 2>/dev/null;
docker run --name $dockerName --hostname $dockerName --network tilda \
	-p $1:5672 \
	-e RABBITMQ_DEFAULT_USER=$NAME \
	-e RABBITMQ_DEFAULT_PASS=$PASSWORD \
	-d $NAME 1>/dev/null 2>/dev/null;
sleep 10;
echo '\t' $dockerName is starting;