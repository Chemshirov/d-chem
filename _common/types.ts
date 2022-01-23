export type keyValue<Type> = {
	[key: string]: Type
}

export type snb = string | number | boolean

type redisKeyToValue<Type> = (key: Type, anotherKey?: Type) => Promise<Type>
type redisAll = (label: string) => Promise<keyValue<string>>
type redisAdd<Type> = (label: string, data: string) => Promise<Type>
type redisGet<Type> = (key: string) => Promise<Type>
type redisKeyToArray<Type> = (key: Type, anotherKey?: Type) => Promise<Array<Type>>
type redisRange = (label: string, from: number, to: number) => Promise<Array<string>>
export type redis = {
	hget: redisKeyToValue<string>,
	hgetall: redisAll,
	sadd: redisAdd<void>,
	smembers: redisKeyToArray<string>,
	srandmember: redisGet<string>,
	srem: redisAdd<number>,
	lrange: redisRange,
	del: string,
}

type settingPortByStage = (stage: string) => number
export type settings = {
	developmentDomains: Array<string>,
	developmentStageName: string,
	domains: Array<string>,
	label: string,
	readonly mainLabel: string,
	nextJsWebsocketPortByStage: settingPortByStage,
	otherContainters: (stage: string) => {
		tree: {
			[type: string]: {
				[hostname: string]: string,
			}
		},
		object: {
			[hostname: string]: {
				type: string,
				path: string,
			}
		}
	},
	productionDomains: Array<string>,
	productionStageName: string,
	rabbitPortByStage: settingPortByStage,
	redisPortByStage: settingPortByStage,
	readonly socketReconnectTime: number,
	sda: string,
	socketMaxBufferSize: number,
	stage: string,
	stageByContainerName: (hostname: string) => string,
	standardTimeout: number,
	subsectionsPath: string,
	readonly timeZone: number,
}

type RabbitMQreceive = keyValue<string | number | ((object: any) => void)> | ((object: any) => void)
type RabbitMQsend = keyValue<string | number | keyValue<any>>

export type RabbitMQ = {
	new(onError: Starter['onError'], log: Starter['log']): RabbitMQ,
	send: (options: RabbitMQsend) => Promise<void>,
	receive: (options: RabbitMQreceive) => Promise<void>,
}

const { Server: WebsocketServer, Socket } = require('socket.io')
export type websockets = typeof WebsocketServer
export type socket = typeof Socket

export type Starter = {
	new(): Starter,
	onError: (className: string, method: string, error: unknown) => void,
	boundOnError: Starter['onError'],
	log: (...args: any) => void,
	start: () => void,
	redis: redis,
	rabbitMQ: RabbitMQ,
	isMaster: () => Promise<boolean>,
	getDomainAndIps: () => Promise<void>,
	domain?: string,
	anotherDomain?: string,
	currentIp?: string,
	anotherIp?: string,
}

export type TsHandler = {
	new(): TsHandler,
	watch: () => void,
}

export type NextHandlerShare = {
	onError: Starter['onError'],
	log: Starter['log'],
	rabbitMQ: Starter['rabbitMQ'],
}
export type NextHandler = {
	new(object: NextHandlerShare, projectPath: string): NextHandler,
	start: (currentDomain?: string) => Promise<void>,
}

export type FileHandler = {
	new(onError: Starter['onError'], fileString: string): FileHandler,
	ifNotExistsCreateEmpty: () => Promise<void>,
	isExists: () => Promise<boolean>,
	copyTo: (fileString: string) => Promise<boolean>,
	objectToFile: (object: keyValue<any>) => Promise<boolean>,
	objectFromFile: () => Promise<keyValue<any>>,
}

export type FilesWatcher = {
	new(onError: Starter['onError']): FilesWatcher,
	getList: (path: string, selectiveRegExp?: RegExp) => Promise<Array<string>>,
}