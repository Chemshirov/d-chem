#!/bin/sh

thisPath=$(dirname $(realpath $0))
export NAME="${thisPath##*/}"
levelUp=$(dirname $thisPath)
export PREFIX="$(echo ${levelUp##*/} | head -c 1)-"

dockerName="$PREFIX"$NAME

docker stop $dockerName 1>/dev/null 2>/dev/null;
docker rm $dockerName 1>/dev/null 2>/dev/null;
docker run --name $dockerName --hostname $NAME --network tilda -d $NAME 1>/dev/null 2>/dev/null;
echo '\t' $NAME is starting;
sleep 20;

# i=0
# while [ "$i" -lt 10 ]
# do
	# echo $i
	# echo $(docker container inspect -f '{{.State}}' $dockerName);
	# sleep 10;
	# i=$(expr $i + 1);
# done;