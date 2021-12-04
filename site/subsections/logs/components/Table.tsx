import { Component } from 'react'
import Alert from 'react-bootstrap/Alert'
import TableB from 'react-bootstrap/Table'

interface TableProps {
	list: object,
	offset: number
}
class Table extends Component<TableProps> {
	constructor(props: TableProps) {
		super(props)
	}
	
	protected _getTbody() {
		let jsx = []
		let array = Object.keys(this.props.list).sort().reverse()
		let extra = 50
		let offset = this.props.offset
		if (offset >= array.length) {
			offset = array.length - 10
		}
		let limit = offset + extra
		for (let i = offset; i < limit; i++) {
			let date = array[i]
			if (date) {
				let object = this.props.list[date]
				jsx.push(
					<Tr
						date={date}
						label={object.label}
						data={object.data}
						type={object.type}
						key={date}
					/>
				)
			}
		}
		return jsx
	}
	
	render() {
		return (
			<TableB 
				id="table"
				striped bordered hover size="sm" 
				style={{fontSize: "0.875rem"}}
			>
				<thead>
					<tr>
						<th>Date</th>
						<th>Label</th>
						<th>Data</th>
					</tr>
				</thead>
				<tbody>
					{this._getTbody()}
				</tbody>
			</TableB>
		)
	}
}

interface TrData {
	[key: string]: string,
}
interface TrProps {
	date: string,
	label: string,
	data: string | TrData,
	type: string,
	key: string,
}
class Tr extends Component<TrProps> {
	constructor(props: TrProps) {
		super(props)
	}
	
	render() {
		let labelClass = ''
		if (this.props.type === 'error') {
			labelClass += ' text-danger'
		}
		
		return (
			<tr>
				<td><Date date={this.props.date} /></td>
				<td><Label name={this.props.label} /></td>
				<td className="w-100"><Data data={this.props.data} /></td>
			</tr>
		)
	}
}

interface DateProps {
	date: string
}
class Date extends Component<DateProps> {
	constructor(props: DateProps) {
		super(props)
	}
	
	render() {
		let spaceParts = this.props.date.split(' ')
		let daysPart = spaceParts[0]
		let timePart = spaceParts[1]
		let dotPart = timePart.split('.')
		let hms = dotPart[0]
		let nanoSeconds = dotPart[1]
		return (
			<div>
				<div className="text-nowrap d-none d-md-block">
					<small className="text-secondary">
						{daysPart}{' '}
					</small>
					<span>
						{hms}
					</span>
					<small className="text-secondary">
						.{nanoSeconds}
					</small>
				</div>
				<div className="text-nowrap d-md-none">
					<div>
						<small className="text-secondary">
							{daysPart}
						</small>
					</div>
					<div>
						{hms}
					</div>
					<div>
						<small className="text-secondary">
							.{nanoSeconds}
						</small>
					</div>
				</div>
			</div>
		)
	}
}

interface LabelProps {
	name: string
}
class Label extends Component<LabelProps> {
	constructor(props: LabelProps) {
		super(props)
	}
	
	render() {
		let defisSplit = this.props.name.split('-')
		let stageOrName = defisSplit[0]
		let secondPart = defisSplit[1]
		let underscoreSplit = secondPart ? secondPart.split('_') : false
		let siteName = underscoreSplit ? underscoreSplit[0] : ''
		let labelName = underscoreSplit ? underscoreSplit[1] : ''
		return (
			<div>
				<div className="text-nowrap d-none d-md-block">
					{this.props.name}
				</div>
				<div className="text-wrap d-md-none">
					<div>
						<small>
							{stageOrName}
						</small>
					</div>
					<div>
						<small>
							{siteName}
						</small>
					</div>
					<div>
						<small>
							{labelName}
						</small>
					</div>
				</div>
			</div>
		)
	}
}

interface DataProps {
	data: string | any
}
interface DataState {
	shortVersion: object,
	longVersion: object,
	showLong: boolean,
	toRender: object,
}
class Data extends Component<DataProps, DataState> {
	constructor(props) {
		super(props)
		let { shortVersion, createLong } = this._getShort()
		let longVersion
		if (createLong) {
			longVersion = this._getLong()
		}
		this.state = {
			shortVersion,
			longVersion: longVersion || null,
			showLong: false,
			toRender: shortVersion
		}
	}
	
	protected _onClick() {
		let nextShowLong = !this.state.showLong
		this.setState({ 
			showLong: nextShowLong,
			toRender: (nextShowLong ? this.state.longVersion : this.state.shortVersion)
		})
	}
	
	protected _getMethod() {
		if (this.props.data.method) {
			return (
				<Alert variant="danger" className="d-inline-block p-1 mb-1">
					{this.props.data.method.substring(0, 50)}
				</Alert>
			)
		} else {
			return null
		}
	}
	
	protected _getShort() {
		let createLong = false
		let onClick = null
		let className = 'text-break'
		
		let toStringify = this.props.data
		let method = this.props.data.method
		if (method) {
			toStringify = this.props.data.error
		}
		let dataString = this._jsonToString(toStringify, 1)
		let firstLine = dataString.split('\\n')[0]
		let limit = 100
		let shortString = firstLine.substring(0, limit)
			shortString = shortString.replaceAll('\\t', ' ')
			shortString = shortString.trim()
		let ellipsis = ' ' + String.fromCharCode(8629)
		if (dataString.length > limit || dataString.includes('\\n')) {
			shortString += ellipsis
			className += ' p-0 text-left'
			createLong = true
			onClick = this._onClick.bind(this)
		}
		let phoneShortString = shortString.substring(0, 80)
		if (phoneShortString !== shortString) {
			if (shortString.includes('\\n')) {
				shortString.replace('\\n', '<br/>')
				shortString.replace('\\n', '<br/>')
			}
			phoneShortString += ellipsis
		}
		let shortVersion = (
			<div className={className}>
				{this._getMethod()}
				<div role="button" onClick={onClick} className="d-none d-md-block">
					{shortString}
				</div>
				<div className="d-md-none">
					{phoneShortString}
				</div>
			</div>
		)
		return { shortVersion, createLong }
	}
	
	protected _getLong() {
		let dataString = this._jsonToString(this.props.data, 4)
		if (dataString) {
			let tabSpan = '<span class="pl-1 pr-4">'
			dataString = '<div>' + dataString.split('\\n').join('</div><div>') + '</div>'
			dataString = '<div>' + dataString.split('\n').join('</div><div>') + '</div>'
			dataString = tabSpan + dataString.split('    ').join('</span>' + tabSpan) + '</span>'
			return (
				<div
					className='p-0 text-left text-break text-monospace'
					dangerouslySetInnerHTML={{__html: dataString}}
					role="button"
					onClick={this._onClick.bind(this)}
				/>
			)
		}
	}
	
	protected _jsonToString(toStringify, spaceAmount) {
		let dataString = ''
		if (toStringify) {
			dataString = JSON.stringify(toStringify, null, spaceAmount)
			dataString = dataString.replace(/^"/, '')
			dataString = dataString.replace(/"$/, '')
			dataString = dataString.trim()
		}
		return dataString
	}
	
	render() {
		return this.state.toRender
	}
}

export default Table