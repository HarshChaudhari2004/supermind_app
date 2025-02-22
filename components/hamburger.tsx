import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Text,
  StyleSheet
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function Hamburger() {
  const [visible, setVisible] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const slideAnim = useRef(new Animated.Value(-250)).current;

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

  const menuItems = [
    { icon: 'settings', label: 'Settings', onPress: () => {} },
    { icon: 'folder', label: 'My Collections', onPress: () => {} },
    { icon: 'star', label: 'Favorites', onPress: () => {} },
    { icon: 'history', label: 'History', onPress: () => {} },
    { icon: 'share', label: 'Share App', onPress: () => {} },
    { icon: 'help', label: 'Help & Support', onPress: () => {} },
  ];

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
          {/* Menu items section */}
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={item.onPress}>
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
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
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
    paddingTop: 50,
    borderRightWidth: 1,
    borderRightColor: '#333',
    paddingBottom: 140, // Add space for footer
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
    padding: 8,
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
    backgroundColor: '#ff4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  spacer: {
    flex: 1,
  },
});