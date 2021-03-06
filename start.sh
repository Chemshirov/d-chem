#!/bin/bash

path=$(dirname $(realpath $0));
STAGE="${path##*/}";
ports=(43001 43003 43005 43007);
if [ "$STAGE" = "development" ]; then
	ports=(43002 43004 43006 43008);
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
	$path/rabbitmq/start.sh ${ports[3]};
	$path/redis/start.sh ${ports[1]};
	$path/mysql/start.sh ${ports[2]};
	$path/dockerrun/start.sh "" "start";

sdaStagePath="/mnt/sda/$STAGE/"
fileString="${sdaStagePath}dockerStats.txt"
pids=($(ps aux | grep -e "bash.*dockerStatsToFileStarter.sh.*$STAGE" | awk {'print $2'}));
for i in "${pids[@]}"
	do :
		if [ "$$" -ne "$i" ];
		then
			kill -9 $i 1>/dev/null 2>/dev/null;
		fi;
done;
$path/site/watcher/dockerStatsToFileStarter.sh "$STAGE" "$path" "$fileString" & disown;
echo Docker stats writing to $fileString.;

docker image prune -f 1>/dev/null 2>/dev/null;
docker volume rm $(docker volume ls -qf dangling=true) 1>/dev/null 2>/dev/null;
docker system prune -f 1>/dev/null 2>/dev/null;
echo Wait for other containers been started, it takes time.;

echo $(stat -c %Z /proc/) > "${sdaStagePath}startDate.txt"