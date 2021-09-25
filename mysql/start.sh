#!/bin/sh

thisPath=$(dirname $(realpath $0));
export NAME="${thisPath##*/}";
stagePath=$(dirname $thisPath);
export STAGE="${stagePath##*/}";
export PREFIX="$(echo ${stagePath##*/} | head -c 1)-";

dockerName="$PREFIX"$NAME
workingPath=/mnt/sda/$STAGE/$NAME
secret=$(cat $workingPath/settings.txt)

docker stop $dockerName 1>/dev/null 2>/dev/null;
docker rm $dockerName 1>/dev/null 2>/dev/null;
docker run --name $dockerName --hostname $dockerName --network tilda \
	-p $1:3306 \
	-v $workingPath/data:/var/lib/mysql \
	-v $workingPath:/docker-entrypoint-initdb.d/ \
	-e MYSQL_ROOT_PASSWORD=$secret \
	-e TZ='Europe/Moscow' \
	--memory="256m" \
	-d mysql:5.6 1>/dev/null 2>/dev/null;
echo '\t' $dockerName is starting;