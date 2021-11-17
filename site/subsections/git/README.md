### Git existing project
docker exec -it d-site_git sh

/bin/su -c "git --git-dir=/usr/nodejs/sda/development/d-chem.git --work-tree=/usr/nodejs/tilda/development init" - node;
/bin/su -c "git --git-dir=/usr/nodejs/sda/development/d-chem.git add /usr/nodejs/tilda/development/*" - node;
/bin/su -c "git --git-dir=/usr/nodejs/sda/development/d-chem.git commit -m 'ver. 0.4.67'" - node;
/bin/su -c "git --git-dir=/usr/nodejs/sda/development/d-chem.git remote add origin git@github.com:Chemshirov/d-chem.git" - node;
/bin/su -c "git --git-dir=/usr/nodejs/sda/development/d-chem.git remote set-url origin git@github.com:Chemshirov/d-chem.git" - node;
/bin/su -c "git --git-dir=/usr/nodejs/sda/development/d-chem.git push --set-upstream origin master" - node;


/bin/su -c "git --git-dir=/usr/nodejs/sda/development/d-chem.git remote -v" - node;
