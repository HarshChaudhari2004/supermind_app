import React, { useState } from 'react'
import { Alert, StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { supabase } from '../lib/supabase'
import { Input } from '@rneui/themed'
import Icon from 'react-native-vector-icons/MaterialIcons'
import LinearGradient from 'react-native-linear-gradient'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  async function handleAuthAction() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email,
          password: password,
        })
        if (error) throw error
        Alert.alert('Success', 'Please check your inbox for email verification!')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        })
        if (error) throw error
      }
    } catch (error) {
      Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Welcome to SuperMind</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Create an account to continue' : 'Sign in to your account'}
        </Text>

        <Input
          containerStyle={styles.inputContainer}
          inputContainerStyle={styles.input}
          inputStyle={styles.inputText}
          leftIcon={
            <Icon name="mail-outline" size={24} color="#fff" style={styles.icon} />
          }
          onChangeText={setEmail}
          value={email}
          placeholder="Email"
          placeholderTextColor="#999"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Input
          containerStyle={styles.inputContainer}
          inputContainerStyle={styles.input}
          inputStyle={styles.inputText}
          leftIcon={
            <Icon name="lock-outline" size={24} color="#fff" style={styles.icon} />
          }
          onChangeText={setPassword}
          value={password}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor="#999"
          autoCapitalize="none"
        />

        <TouchableOpacity
          onPress={handleAuthAction}
          disabled={loading}
          style={styles.buttonContainer}
        >
          <LinearGradient
            colors={['hsla(278, 100%, 50%, 1)', 'hsla(302, 98%, 50%, 1)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setIsSignUp(!isSignUp)}
          style={styles.switchButton}
        >
          <Text style={styles.switchText}>
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    paddingHorizontal: 0,
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#2a2a2a',
  },
  inputText: {
    color: '#fff',
    fontSize: 16,
  },
  icon: {
    marginRight: 10,
  },
  buttonContainer: {
    marginTop: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  button: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#999',
    fontSize: 14,
  },
})
