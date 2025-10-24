import { Link } from 'react-router-dom'

export default function HashtagLink({ hashtag, className = "" }) {
  return (
    <Link
      to={`/hashtag/${hashtag.replace('#', '')}`}
      className={`text-blue-400 hover:text-blue-300 transition-colors font-medium ${className}`}
    >
      {hashtag}
    </Link>
  )
}
