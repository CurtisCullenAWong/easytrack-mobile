import React, { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { supabase } from './lib/supabase'

export default function MyComponent() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
        const { data, error } = await supabase.from('verify_status').select('*')
        console.log('Fetched data:', data)
      
        if (error) {
          console.error('Supabase fetch error:', error)
        } else {
          setData(data)
        }
      
        setLoading(false)
      }
      

    fetchData()
  }, [])

  if (loading) return <ActivityIndicator />

  return (
    <View>
        <Text>is it working</Text>
      {data.map((item, index) => (
        <Text key={index}>{JSON.stringify(item)}</Text>
      ))}
    </View>
  )
}
