#!/bin/bash

fileString=$1;
touch $fileString;
chown 1000:1000 $fileString;

last=$(date +"%s");
multiLine="";
format="table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}";
docker stats --all --format "$format" --no-trunc | (while read line; do
	sedLine=$(echo "$line" | sed "s/^.*name.*cpu.*mem.*$/_divider_/i")
	if [ "$sedLine" != "_divider_" ];
	then
		multiLine="${multiLine}"'\n'"${line}";
	else
		now=$(date +"%s");
		if [ "$now" -ne "$last" ];
		then
			echo -e $multiLine > $fileString;
			last=$(date +"%s");
			multiLine="";
		else
			multiLine="${multiLine}"'\n'"${line}";
		fi;
	fi;
done);