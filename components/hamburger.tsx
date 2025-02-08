import React, { useState, useRef } from 'react';
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
  const slideAnim = useRef(new Animated.Value(-250)).current;

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

  return (
    <>
      {/* Hamburger icon */}
      <TouchableOpacity onPress={openMenu}>
        <Image
          source={require('../assets/hamburger.png')}
          style={{ width: 24, height: 24, tintColor: '#fff' }}
        />
      </TouchableOpacity>

      {/* Slide-in menu */}
      <Modal transparent visible={visible} animationType="none">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeMenu}
        />
        <Animated.View style={[styles.menuContainer, { left: slideAnim }]}>
          {/* Put your menu items here */}
          <TouchableOpacity style={styles.menuItem} onPress={closeMenu}>
            <Text style={styles.menuText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={closeMenu}>
            <Text style={styles.menuText}>Menu Item 2</Text>
          </TouchableOpacity>

          {/* Logout at the bottom */}
          <View style={styles.spacer} />
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Text style={styles.menuText}>Logout</Text>
          </TouchableOpacity>
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
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  menuItem: {
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  menuText: {
    fontSize: 16,
    color: '#000',
  },
  spacer: {
    flex: 1,
  },
});