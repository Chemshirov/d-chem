#!/bin/bash

path=$(dirname $(realpath $0));
stage="${path##*/}";
ports="80 443"
if [ "$stage" = "development" ]; then
	ports="84 4434";
fi;

echo -e '(Re)building docker images:';
directories=($(find "$path" -type d));
for d in "${directories[@]}"
	do :
		creator=$d/create-image.sh;
		if [ -f $creator ]; then
			pathWithSlash="$path/";
			pathPart=${creator/#$pathWithSlash/};
			echo -e '\t' $(dirname $pathPart) is building;
			eval "${creator}" 1>/dev/null 2>/dev/null;
		fi;
done;
echo The docker building process has finished.;

echo "";
echo Starting containers:;
docker network create tilda 1>/dev/null 2>/dev/null;
	$path/rabbitmq/start.sh;
	$path/redis/start.sh;
	$path/mysql/start.sh;
	$path/logger/start.sh;
	$path/dockerrun/start.sh;
	$path/chem/onrequest/start.sh '' $ports;
docker image prune -f 1>/dev/null 2>/dev/null;
echo Wait for boot code complete of all containers, it takes time.;