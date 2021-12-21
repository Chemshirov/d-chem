#!/bin/bash

stage=$1;
path=$2;
fileString=$3;

while true; do
	pids=($(ps aux | grep -e "bash.*dockerStatsToFile.sh.*$stage" | awk {'print $2'}));
	for i in "${pids[@]}"
		do :
			if [ "$$" -ne "$i" ];
			then
				kill -9 $i 1>/dev/null 2>/dev/null;
			fi;
	done;
	$path/site/watcher/dockerStatsToFile.sh "$fileString" & disown;
	sleep 3600;
done;