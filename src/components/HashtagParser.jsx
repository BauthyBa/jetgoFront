import HashtagLink from './HashtagLink'

export default function HashtagParser({ text, className = "" }) {
  if (!text) return null

  // Regex para encontrar hashtags (#palabra)
  const hashtagRegex = /#[\w\u00C0-\u017F\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]+/g
  
  const parts = text.split(hashtagRegex)
  const hashtags = text.match(hashtagRegex) || []
  
  const result = []
  
  for (let i = 0; i < parts.length; i++) {
    // Agregar texto normal
    if (parts[i]) {
      result.push(
        <span key={`text-${i}`} className={className}>
          {parts[i]}
        </span>
      )
    }
    
    // Agregar hashtag si existe
    if (hashtags[i]) {
      result.push(
        <HashtagLink 
          key={`hashtag-${i}`} 
          hashtag={hashtags[i]} 
          className={className}
        />
      )
    }
  }
  
  return <>{result}</>
}
