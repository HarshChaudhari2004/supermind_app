import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Text,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (text: string) => void;
  value: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = "Search what's in your Mind... ",
  onSearch,
  value,
}) => {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <LinearGradient
      colors={['hsla(278, 100%, 50%, 1)', 'hsla(302, 98%, 50%, 1)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <View style={styles.row}>
        <TouchableOpacity onPress={() => setMenuVisible(true)}>
          <Image
            source={require('../assets/hamburger.png')}
            style={styles.icon}
          />
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#ffffff"
          onChangeText={onSearch}
          value={value}
        />

        <TouchableOpacity onPress={() => { /* Handle plus */ }}>
          <Image source={require('../assets/plus.png')} style={styles.icon} />
        </TouchableOpacity>
      </View>

      <Modal visible={menuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menu}>
            <TouchableOpacity onPress={() => { /* Handle settings */ }}>
              <Text style={styles.menuText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { /* Handle bases */ }}>
              <Text style={styles.menuText}>Bases</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10,
    margin: 7,
    borderRadius: 7,
    color: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  input: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    padding: 8,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
  },
  icon: {
    width: 24,
    height: 24,
    tintColor: '#fff',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#00000099',
  },
  menu: {
    backgroundColor: '#fff',
    marginHorizontal: 50,
    borderRadius: 8,
    padding: 10,
  },
  menuText: {
    padding: 10,
    fontSize: 16,
  },
});

export default SearchBar;
