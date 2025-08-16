import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

const useVerificationStatus = () => {
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkVerificationStatus = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setVerificationStatus(null)
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('verify_status_id')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error fetching verification status:', error)
        setVerificationStatus(null)
      } else {
        setVerificationStatus(profile.verify_status_id)
      }
    } catch (error) {
      console.error('Error in checkVerificationStatus:', error)
      setVerificationStatus(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkVerificationStatus()
  }, [])

  const isVerified = verificationStatus === 1

  return {
    verificationStatus,
    isVerified,
    loading,
    refreshVerificationStatus: checkVerificationStatus
  }
}

export default useVerificationStatus
