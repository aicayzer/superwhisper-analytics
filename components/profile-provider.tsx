'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Profile = 'default' | 'on'

interface ProfileContextValue {
  profile: Profile
  setProfile: (p: Profile) => void
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: 'default',
  setProfile: () => {},
})

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<Profile>('default')

  useEffect(() => {
    const stored = localStorage.getItem('sw_profile') as Profile | null
    if (stored === 'on') setProfileState('on')
  }, [])

  const setProfile = (p: Profile) => {
    localStorage.setItem('sw_profile', p)
    setProfileState(p)
  }

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
