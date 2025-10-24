import { supabase } from './supabase'

export async function createHashtag(name) {
  try {
    const { data, error } = await supabase
      .from('hashtags')
      .upsert(
        { name: name.toLowerCase(), usage_count: 1 },
        { 
          onConflict: 'name',
          ignoreDuplicates: false 
        }
      )
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating hashtag:', error)
    throw error
  }
}

export async function incrementHashtagUsage(name) {
  try {
    const { data, error } = await supabase
      .from('hashtags')
      .update({ usage_count: supabase.raw('usage_count + 1') })
      .eq('name', name.toLowerCase())
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error incrementing hashtag usage:', error)
    throw error
  }
}

export async function getHashtagInfo(name) {
  try {
    const { data, error } = await supabase
      .from('hashtags')
      .select('*')
      .eq('name', name.toLowerCase())
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting hashtag info:', error)
    throw error
  }
}

export async function getTrendingHashtags(limit = 10) {
  try {
    const { data, error } = await supabase
      .from('hashtags')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting trending hashtags:', error)
    throw error
  }
}

export function extractHashtags(text) {
  if (!text) return []
  const hashtagRegex = /#[\w\u00C0-\u017F\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]+/g
  return text.match(hashtagRegex) || []
}

export async function processHashtags(text) {
  if (!text) return []
  
  const hashtags = extractHashtags(text)
  const processedHashtags = []
  
  for (const hashtag of hashtags) {
    try {
      const name = hashtag.replace('#', '').toLowerCase()
      
      // Crear o incrementar el hashtag
      const { data, error } = await supabase
        .from('hashtags')
        .upsert(
          { name, usage_count: 1 },
          { 
            onConflict: 'name',
            ignoreDuplicates: false 
          }
        )
        .select()
        .single()

      if (!error && data) {
        processedHashtags.push(data)
      }
    } catch (error) {
      console.error(`Error processing hashtag ${hashtag}:`, error)
    }
  }
  
  return processedHashtags
}

export async function linkPostHashtags(postId, text) {
  if (!postId || !text) return
  const client = supabase
  const tags = extractHashtags(text).map(t => t.replace('#', '').toLowerCase())
  if (tags.length === 0) return

  // Asegurar hashtags y luego vincular en post_hashtags
  const hashtagIds = []
  for (const name of tags) {
    const { data } = await client
      .from('hashtags')
      .upsert({ name, usage_count: 1 }, { onConflict: 'name', ignoreDuplicates: false })
      .select('*')
      .single()
    if (data?.id) hashtagIds.push(data.id)
  }

  if (hashtagIds.length > 0) {
    const rows = hashtagIds.map(id => ({ post_id: postId, hashtag_id: id }))
    await client.from('post_hashtags').insert(rows)
  }
}

export async function relinkPostHashtags(postId, text) {
  if (!postId) return
  const client = supabase
  // Borrar vínculos existentes
  await client.from('post_hashtags').delete().eq('post_id', postId)
  // Volver a vincular según el texto actual
  await linkPostHashtags(postId, text || '')
}
