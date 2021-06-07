#!/bin/bash

path=$(dirname $(realpath $0));
stagePath=$(dirname $(realpath $path));
STAGE="${stagePath##*/}";
startPath=$(dirname $(realpath $stagePath));

pids=($(ps aux | grep -i 'dockerRunWatcher.sh '$STAGE | awk {'print $2'}));
for i in "${pids[@]}"
	do :
		if [ "$$" -ne "$i" ];
		then
			kill -9 $i 1>/dev/null 2>/dev/null;
		fi;
done;


while /bin/true; do
	array=($(find $path"/toRun" -maxdepth 1 -type f | grep -P "dockerToRun.+\.temp"));
	for j in "${array[@]}"
		do :
			string=$(cat $j);
			settings=($string)
			rm -f $j;
			
			cmd=$(echo $startPath"/"${settings[0]}start.sh '""' ${settings[1]} ${settings[2]} ${settings[3]});
			eval "${cmd}" & > /dev/null & disown;
	done;
	sleep 1;
done & > /dev/null & disown;