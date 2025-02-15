import React, { useState } from 'react'
import { Alert, StyleSheet, View, useColorScheme } from 'react-native'
import { supabase } from '../lib/supabase'
import { Button, Input } from '@rneui/themed'
import Icon from 'react-native-vector-icons/MaterialIcons' // Add this import

export default function Auth() {
  const colorScheme = useColorScheme()
  const backgroundColor = colorScheme === 'dark' ? '#000' : '#fff'
  const textColor = colorScheme === 'dark' ? '#fff' : '#000'
  const placeholderTextColor = colorScheme === 'dark' ? '#ccc' : '#888'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signInWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) Alert.alert(error.message)
    setLoading(false)
  }

  async function signUpWithEmail() {
    setLoading(true)
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (error) Alert.alert(error.message)
    if (!session) Alert.alert('Please check your inbox for email verification!')
    setLoading(false)
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Input
          label="Email"
          labelStyle={{ color: textColor }}
          inputStyle={{ color: textColor }}
          leftIcon={
            <Icon 
              name="mail-outline" 
              size={24} 
              color={textColor} 
            />
          }
          onChangeText={setEmail}
          value={email}
          placeholder="email@address.com"
          autoCapitalize="none"
          placeholderTextColor={placeholderTextColor}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          label="Password"
          labelStyle={{ color: textColor }}
          inputStyle={{ color: textColor }}
          leftIcon={
            <Icon 
              name="lock-outline" 
              size={24} 
              color={textColor} 
            />
          }
          onChangeText={setPassword}
          value={password}
          secureTextEntry
          placeholder="Password"
          autoCapitalize="none"
          placeholderTextColor={placeholderTextColor}
        />
      </View>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title="Sign in"
          titleStyle={{ color: textColor }}
          disabled={loading}
          onPress={signInWithEmail}
          buttonStyle={{ backgroundColor: colorScheme === 'dark' ? '#333' : '#ddd' }}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Button
          title="Sign up"
          titleStyle={{ color: textColor }}
          disabled={loading}
          onPress={signUpWithEmail}
          buttonStyle={{ backgroundColor: colorScheme === 'dark' ? '#333' : '#ddd' }}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
    flex: 1,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
})
