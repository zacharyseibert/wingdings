import { Modal, View, Image, TouchableOpacity, StyleSheet, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Props {
  uri: string | null;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export default function ImageViewer({ uri, onClose }: Props) {
  return (
    <Modal visible={!!uri} transparent animationType="fade" onRequestClose={onClose}>
      <StatusBar hidden />
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        {uri && (
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
          />
        )}
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <View style={styles.closeInner}>
            <View style={[styles.closeLine, { transform: [{ rotate: '45deg' }] }]} />
            <View style={[styles.closeLine, { transform: [{ rotate: '-45deg' }] }]} />
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width,
    height: height * 0.85,
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
  },
  closeInner: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 18,
  },
  closeLine: {
    position: 'absolute',
    width: 18,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
});
