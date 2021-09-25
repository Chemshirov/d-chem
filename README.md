### Installation

**1.** Install Docker and Docker-compose.

**2.** Copy files.

**3.** Execute main start.sh
```bash
~/development/start.sh
```


### TLDR

**Dockerrun**. It's an instrument to run Docker containers by Docker containers them selves.

**Proxy**. The gate to the system, it separates static, dynamic and Websockets contents and does proxy it to respective routers by using Node cluster with all CPUs. Also it initializes to run those containers using Dockerrun. At first, it separates static, dynamic and Websockets contents and does proxy it to respective subrouters by using Node cluster with all CPUs. Then subrouters distribute files from preferred cache storage or file system (S), retranslates requests to particular site content containers (D), and does establish middleware Websockets (W).

**Watcher**. It takes all the work with files: cache (calculates and stores to base gzip, size, dates, Etag, TTL and etc.), fires events on changes, synchronises between hardwares, arbitrates the synchronization.

**RabbitMQ**. It is great to use message broker, because it becomes possible to restart some minor containers even every minute with assurance that all the work will be completed with no breaches.

**Redis**. Smart, user-friendly, compact in many ways (from interface to memory usage) database that simplifies logging, caching everything (tonnes of small files as well) and event distributing.

**MySQL**. I don't know why l keep it. Just for precaution and out of habit I think. Because all the data, besides enormous logs, fits to operative memory staying in useful JS objects and beeing manually extra restructured (indexed) where it needed to speed up, without bunch of aimless automatisms that mostly wastes the resources.

___

**Subsections**. The site is divided to several sections to aim to be possible to reload them independently and if necessary fabricate several working container clones working in cluster to bust up performance.

**Git** - web interface for git cli.

**Logs** - quick and useful table of thousands of log events and errors, implemented without pagination and plain scroll.

**Finance6** - old system invented to book spends and income, debts and actives. At the first it created and used a few times to simplify calculations of final shares when group of tourists pays randomly by one's card or another's and it's too complicated to keep all napkin notes of dynamic distribution of each other's debts. But eventually it is too complicated because it is strictly necessary to input all the information for accurate results (even in case when one person or several write for all using auto splitters and such handy features, because they sometime forget to do the job). Now the 6th version barely breathing still handles my finances and keeps all and every pays I did since 2013, allowing to use search, filters, labels, indicators and images of important bills.

**Data**. It is some sort of everyday diary and the one way social network that allows to keep an eye on me to relatives and friends (most of the content is hidden for public). Also it plays major role in complex home media theater and serves as a web station to music, movies and audiobooks.