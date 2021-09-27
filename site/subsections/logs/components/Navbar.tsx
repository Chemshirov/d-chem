import { Badge, Button, Navbar as NavbarB, Nav, Form } from 'react-bootstrap'
import 'bootstrap/dist/css/bootstrap.css'
import { Component } from 'react'
import Settings from '../scripts/Settings'

interface NavbarProps {
	title: string,
	tree: object,
	showLabel: string,
	onNavButtonClick: ((label: string) => void),
}
class Navbar extends Component<NavbarProps> {
	constructor(props: NavbarProps) {
		super(props)
	}
	
	protected _getNavTypes() {
		let jsx = []
		let variant = 'warning'
		if (this.props.tree[Settings.typesName]) {
			let types = Object.keys(this.props.tree[Settings.typesName])
			if (types.length < 3) {
				types = [Settings.allName]
			}
			types.sort().forEach(type => {
				let count = Object.keys(this.props.tree[Settings.typesName][type]).length
				if (type === 'errors') {
					variant = 'danger'
				} else if (type === 'logs') {
					variant = 'primary'
				}
				let name = type.substring(0, 1).toUpperCase() + type.substring(1)
				this._addFilter(jsx, Settings.typesName + type, name, count, this.props.showLabel, variant)
			})
		}
		return jsx
	}
	
	protected _getFilters() {
		let jsx = []
		if (this.props.tree['_labels']) {
			let filters = Object.keys(this.props.tree['_labels'])
			filters.sort().forEach(label => {
				let count = Object.keys(this.props.tree['_labels'][label]).length
				this._addFilter(jsx, label, label, count, this.props.showLabel, false)
			})
		}
		return jsx
	}
	
	protected _addFilter(jsx, label, name, count, showLabel, variant) {
		jsx.push(
			<Filter
				key={label}
				label={label}
				name={name}
				count={count}
				onClick={this.props.onNavButtonClick}
				showLabel={showLabel}
				variant={variant}
			/>
		)
	}
	
	render() {
		let navTypes = this._getNavTypes()
		let filters = this._getFilters()
		return (
			<NavbarB bg="white" expand="md" className="flex-wrap p-0 m-1">
				<Nav className="flex-row justify-content-between w-100 pr-5">
					<NavbarB.Brand as="div" className="d-flex align-items-center pl-4">
						<h6 className="m-0">{this.props.title}</h6>
					</NavbarB.Brand>
					<Nav className="flex-row">
						<NavbarB.Toggle />
					</Nav>
				</Nav>
				<NavbarB.Collapse>
					<Nav className="flex-wrap flex-row">
						{navTypes}
						{filters}
					</Nav>
				</NavbarB.Collapse>
			</NavbarB>
		)
	}
}

interface FilterProps {
	key: string,
	label: string | null,
	name: string,
	count: number,
	onClick: NavbarProps["onNavButtonClick"],
	showLabel: NavbarProps["showLabel"],
	variant: string | null,
}
class Filter extends Component<FilterProps> {
	protected _onClick() {
		this.props.onClick(this.props.label)
	}
	
	render() {
		let disabled: boolean = false
		let buttonVariant = 'outline-secondary'
		let badgeVariant = 'secondary'
		if (this.props.variant) {
			buttonVariant = 'outline-' + this.props.variant
			badgeVariant = this.props.variant
		}
		if (this.props.showLabel === this.props.label) {
			disabled = true
			buttonVariant = 'success'
		}
		return (
			<Button 
				variant={buttonVariant}
				size="sm"
				className="my-1 mx-2"
				onClick={this._onClick.bind(this)}
				disabled={disabled}
			>
				<span className="pr-1">
					{this.props.name}
				</span>
				<Badge variant={badgeVariant}>
					{this.props.count}
				</Badge>
			</Button>
		)
	}
}

export default Navbar