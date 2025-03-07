import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Text,
  StyleSheet,
  BackHandler,
  Linking,
} from 'react-native';
import { supabase } from '../lib/supabase';
import LinearGradient from 'react-native-linear-gradient';
import Settings from './settings'; // Add this import

export default function Hamburger() {
  const [visible, setVisible] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(-250)).current;
  const [settingsVisible, setSettingsVisible] = useState(false); // Add this state

  useEffect(() => {
    getUserEmail();
  }, []);

  async function getUserEmail() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setUserEmail(user.email);
    }
  }

  const openMenu = () => {
    setVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -250,
      duration: 300,
      easing: Easing.ease,
      useNativeDriver: false,
    }).start(() => {
      setVisible(false);
    });
  };

  async function handleLogout() {
    await supabase.auth.signOut().catch(console.error);
    closeMenu();
  }

  // Add this function to open settings
  const openSettings = () => {
    closeMenu();
    setSettingsVisible(true);
  };

  const menuItems = [
    { icon: 'settings', label: 'Settings', onPress: openSettings }, // Update this to use openSettings
    { icon: 'folder', label: 'My Collections', onPress: () => {} },
    { icon: 'star', label: 'Favorites', onPress: () => {} },
    { icon: 'history', label: 'History', onPress: () => {} },
    { icon: 'share', label: 'Share App', onPress: () => {} },
    { 
      icon: 'help', 
      label: 'Help & Support', 
      onPress: () => {
        Linking.openURL('https://docs.google.com/forms/d/e/1FAIpQLSfLQJiHDziHBBB3StpyJyQHPJlc99drAd9InBkeAgkLeP0whg/viewform?usp=sharing');
      } 
    },
  ];

  useEffect(() => {
    const backAction = () => {
      if (visible) {
        closeMenu();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [visible]);

  return (
    <>
      <TouchableOpacity onPress={openMenu}>
        <Image
          source={require('../assets/hamburger.png')}
          style={{ width: 24, height: 24, tintColor: '#fff' }}
        />
      </TouchableOpacity>

      <Modal transparent visible={visible} animationType="none">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeMenu}
        />
        <Animated.View style={[styles.menuContainer, { left: slideAnim }]}>
          {/* Add branding at the top */}
          <View style={styles.branding}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.brandLogo}
            />
            <Text style={styles.brandText}>SuperMind</Text>
          </View>

          {/* Menu items section */}
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.menuItem} 
              onPress={item.onPress}
            >
              <Image source={{ uri: item.icon }} style={styles.menuIcon} />
              <Text style={styles.menuText}>{item.label}</Text>
            </TouchableOpacity>
          ))}

          {/* Footer section with email and logout */}
          <View style={styles.footer}>
            <View style={styles.emailContainer}>
              <Text style={styles.emailLabel}>Signed in as:</Text>
              <Text style={styles.userEmail}>{userEmail || 'Not signed in'}</Text>
            </View>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Image
                source={require('../assets/logout.png')}
                style={styles.logoutIcon}
              />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>

      {/* Add the Settings component */}
      <Settings 
        visible={settingsVisible} 
        onClose={() => setSettingsVisible(false)} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000055',
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 250,
    backgroundColor: '#1a1a1a',
    borderRightWidth: 1,
    borderRightColor: '#333',
    paddingBottom: 140,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 12,
  },
  menuIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  emailContainer: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
  },
  emailLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  userEmail: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E53935', // Material Design Red 600
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  logoutIcon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
    marginRight: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  branding: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a', // Remove gradient, use solid color
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  brandLogo: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  brandText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});