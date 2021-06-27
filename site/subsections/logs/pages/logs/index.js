import Link from 'next/link'
let now = new Date().toLocaleString()

export default () => (
  <div>
    <h3>Next.js works in Docker</h3>
    <div>{now}</div>
  </div>
)