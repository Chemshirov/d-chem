import ReactDOM from 'react-dom'
import * as t from '../../types'

export type func<Input, Output> = (input: Input) => Output

export type obj<Type> = {
	[key: string]: Type
}

export type event = ReactDOM.MouseEvent | Event

export type containersList = Array<Extract<keyof t.containers, string>>

export type closeButtonProps = {
	onClose: func<ReactDOM.MouseEvent | Event, void>,
	parentClasses: string,
	hidden?: boolean,
}

export type coloredContainerProps = {
	name: string,
	hostname: string,
	statisticsArray: t.statisticsArray | false,
	current: boolean,
	small: boolean,
}

export type detailedProps = {
	currentServerStaticProps: t.staticObjectDomain,
	containers: containersList,
	currentStatistics: obj<t.statisticsArray | false> | false,
}

export type headerProps = {
	serverBlockNumber: mainState['serverBlockNumber'],
	passIsIncorrect: mainProps['passIsIncorrect'],
	isAdmin: mainProps['isAdmin'],
	loginMenuOpener: (callback?: func<void, void>) => void,
	emit: mainProps['emit'],
}

export type loginProps = Omit<headerProps, 'isAdmin'>

export type mainProps = {
	staticProps: t.staticObject,
	uptimeDates: IndexState['uptimeDates'],
	roles: IndexState['roles'],
	statistics: IndexState['statistics'],
	shortLogs: IndexState['shortLogs'],
	emit: func<object, void>,
	buttonsState: IndexState['buttonsState'],
	passIsIncorrect: boolean,
	isAdmin: boolean,
}

export type mainState = {
	chosenServerBlock: false | number,
	serverBlockNumber: number,
	currentDomain: string,
	allContainers: t.domains<containersList>,
}

export type mainGetCurrentOutput = {
	serverBlockNumber: mainState['serverBlockNumber'],
	currentDomain: mainState['currentDomain']
}

export type serverBlockProps = {
	chosenServerBlock: mainState['chosenServerBlock'],
	serverBlockNumber: mainState['serverBlockNumber'],
	serverStaticProps: t.staticObjectDomain,
	containers: containersList,
	uptimeDate: t.nowDate,
	role: string | false,
	currentStatistics: t.statistics,
	shortLog: t.shortLog,
	onClick: func<number, void>,
	isAdmin: mainProps['isAdmin'],
	loginMenuOpener: (callback?: func<void, void>) => void,
	emit: mainProps['emit'],
	buttonsState: mainProps['buttonsState'],
}

type numberId = { 'number': number }
export type serverBlockInfoProps = Omit<serverBlockProps, 'uptimeDate'> & numberId

type omitsForTitle = 'chosenServerBlock' | 'currentStatistics' | 'shortLog' | 'onClick'
export type serverBlockTitleProps = Omit<serverBlockProps, omitsForTitle> & numberId

type omitsForButtons = 'number' | 'serverBlockNumber' | 'uptimeDate'
export type serverBlockButtonsProps = Omit<serverBlockTitleProps, omitsForButtons>

export type indexProps = {
	staticObject?: t.staticObject,
	error?: false | unknown,
}

export type IndexState = {
	uptimeDates: t.domains<t.nowDate>,
	roles: t.domains<string>,
	statistics: t.domains<obj<t.statisticsArray | false>>,
	shortLogDates: t.domains<t.nowDate>,
	shortLogs: t.domains<t.shortLog>,
	buttonsState: obj<string | false>,
	passIsIncorrect: boolean,
	isAdmin: boolean,
	statisticsTree: t.domains<obj<t.statisticsArray | false>>,
}