#!/bin/sh

thisPath=$(dirname $(realpath $0));
export NAME="${thisPath##*/}";
stagePath=$(dirname $thisPath);
export STAGE="${stagePath##*/}";
export PREFIX="$(echo ${stagePath##*/} | head -c 1)-";

dockerName="$PREFIX"$NAME
workingPath=/mnt/sda/$STAGE/$NAME
secret=$(cat $workingPath/settings.txt)
port="3306"
if [ "$STAGE" = "development" ]; then
	port="3307";
fi;

docker stop $dockerName 1>/dev/null 2>/dev/null;
docker rm $dockerName 1>/dev/null 2>/dev/null;
docker run --name $dockerName --hostname $NAME --network tilda \
	-p $port:3306 \
	-v $workingPath/data:/var/lib/mysql \
	-v $workingPath:/docker-entrypoint-initdb.d/ \
	-e MYSQL_ROOT_PASSWORD=$secret \
	-e TZ='Europe/Moscow' \
	-d mysql:5.6 1>/dev/null 2>/dev/null;
echo '\t' $NAME is starting;