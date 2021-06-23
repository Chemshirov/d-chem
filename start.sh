#!/bin/bash

path=$(dirname $(realpath $0));
stage="${path##*/}";
ports=(43001 43003 43005);
if [ "$stage" = "development" ]; then
	ports=(43002 43004 43006);
fi;

echo "(Re)building docker images:";
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
	$path/redis/start.sh ${ports[1]};
	$path/mysql/start.sh ${ports[2]};
	$path/logger/start.sh;
	$path/dockerrun/start.sh;
	$path/site/onrequest/start.sh "" ${ports[0]};
docker image prune -f 1>/dev/null 2>/dev/null;
echo Wait for other containers been started, it takes time.;