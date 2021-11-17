export type keyValue<Type> = {
	[key: string]: Type
}

type redisKeyToValue<Type> = (key: Type, anotherKey?: Type) => Promise<Type>
type redisAll = (label: string) => Promise<keyValue<string>>
type redisKeyToArray<Type> = (key: Type, anotherKey?: Type) => Promise<Array<Type>>
type redisRange = (label: string, from: number, to: number) => Promise<Array<string>>
export type redis = {
	hget: redisKeyToValue<string>,
	hgetall: redisAll,
	smembers: redisKeyToArray<string>,
	lrange: redisRange,
}

type settingPortByStage = (stage: string) => number
export type settings = {
	developmentDomains: Array<string>,
	developmentStageName: string,
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
	stage: string,
	stageByContainerName: (hostname: string) => string,
	standardTimeout: number,
	readonly timeZone: number,
}

type RabbitMQreceive = {
	[key: string]: string | number | ((...args: any) => any),
}

export type RabbitMQ = {
	new(onError: Starter['onError'], log: Starter['log']): RabbitMQ,
	send: (options: keyValue<string | number>) => Promise<void>,
	receive: (options: RabbitMQreceive) => Promise<void>,
}

const { Server: WebsocketServer, Socket } = require('socket.io')
export type websockets = typeof WebsocketServer
export type socket = typeof Socket

export type Starter = {
	new(): Starter,
	onError: (className: string, method: string, error: unknown) => void,
	log: (...args: any) => void,
	start: () => void,
	redis: redis,
	rabbitMQ: { new(onError: Starter['onError'], log: Starter['log']): RabbitMQ },
	isMaster: () => Promise<boolean>,
	getDomainAndIps: () => Promise<void>,
	domain?: string,
	currentIp?: string,
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
	objectToFile: (object: keyValue<any>) => Promise<boolean>,
	objectFromFile: () => Promise<keyValue<any>>,
}