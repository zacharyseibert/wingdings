import { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  FlatList, ScrollView, Dimensions,
} from 'react-native';
import { colors } from '../lib/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLS = 8;
const CELL_SIZE = Math.floor((SCREEN_WIDTH - 32) / COLS);

const CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: 'Recent', icon: '🕐',
    emojis: ['🔥','👏','😤','🍗','💀','🤯','😭','🫡','👀','💪','🤌','🫠','😮','🥵','🤤','👑'],
  },
  {
    label: 'Smileys', icon: '😀',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','🫠','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🫢','🫣','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁','☹️','😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾','🤖'],
  },
  {
    label: 'People', icon: '👋',
    emojis: ['👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🤌','🤏','✌️','🤞','🫰','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','🫵','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁️','👅','👄','🫦','💋','👶','🧒','👦','👧','🧑','👱','👨','🧔','👩','🧓','👴','👵','🙍','🙎','🙅','🙆','💁','🙋','🧏','🙇','🤦','🤷'],
  },
  {
    label: 'Animals', icon: '🐶',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🦆','🐔','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🪱','🐛','🦋','🐌','🐞','🐜','🪰','🪲','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️','🦔'],
  },
  {
    label: 'Food', icon: '🍕',
    emojis: ['🍕','🍔','🍟','🌭','🍿','🧂','🥓','🥚','🍳','🧇','🥞','🧈','🍞','🥐','🥖','🫓','🥨','🥯','🧀','🥗','🥙','🥪','🌮','🌯','🫔','🥫','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣','🍤','🍥','🥮','🍡','🥟','🥠','🥡','🦪','🍦','🍧','🍨','🍩','🍪','🎂','🍰','🧁','🥧','🍫','🍬','🍭','🍮','🍯','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🫒','🥑','🍆','🥔','🥕','🌽','🌶️','🫑','🥒','🥬','🥦','🧄','🧅','🍄','🥜','🫘','🌰','🍗','🍖','🦴','🥩','🥚','🧆','🥙','🫕'],
  },
  {
    label: 'Activities', icon: '⚽',
    emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🎰','🧩'],
  },
  {
    label: 'Travel', icon: '✈️',
    emojis: ['✈️','🚀','🛸','🚁','🛩️','🛫','🛬','🪂','💺','🚂','🚆','🚇','🚈','🚉','🚊','🚝','🚞','🚋','🚌','🚍','🚎','🏎️','🚐','🚑','🚒','🚓','🚔','🚕','🚖','🚗','🚘','🚙','🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛺','🚨','🚥','🚦','🛑','🚧','⚓','🛟','⛵','🛶','🚤','🛥️','🛳️','⛴️','🚢','🗺️','🗿','🗽','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛺','🏕️','🏖️','🏗️','🌁','🏘️','🏚️','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏭','🌆','🌇','🌉','🌃','🌌','🌄','🌅','🌠','🎇','🎆','🌇','🌆','🏙️'],
  },
  {
    label: 'Objects', icon: '💡',
    emojis: ['💡','🔦','🕯️','🪔','🧱','🪞','🪟','🛋️','🪑','🚽','🪠','🚿','🛁','🪤','🪒','🧴','🧷','🧹','🧺','🧻','🪣','🧼','🫧','🪥','🧽','🧯','🛒','🚪','🪑','🧳','🌂','☂️','🧵','🧶','🪡','🧷','💎','👑','🔮','🪄','🎩','🪅','🎀','🎁','🎗️','🎟️','🎫','🔑','🗝️','🔐','🔒','🔓','🪝','🔨','🪓','⛏️','⚒️','🛠️','🗡️','⚔️','🛡️','🔧','🔩','⚙️','🗜️','🔗','⛓️','🧲','🪜','🔬','🔭','📡','💉','🩸','💊','🩹','🩼','🩺','🩻','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','💈','⚗️','🔭','🩬'],
  },
  {
    label: 'Symbols', icon: '❤️',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🔕','🔇','🔈','🔉','🔊','📣','📢','💬','💭','🗯️','♠️','♣️','♥️','♦️','🃏','🀄','🎴'],
  },
];

interface EmojiPickerProps {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ visible, onSelect, onClose }: EmojiPickerProps) {
  const [categoryIndex, setCategoryIndex] = useState(0);

  const currentEmojis = CATEGORIES[categoryIndex].emojis;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.handle} />

          {/* Category tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabsContent}>
            {CATEGORIES.map((cat, i) => (
              <TouchableOpacity
                key={cat.label}
                style={[styles.tab, i === categoryIndex && styles.tabActive]}
                onPress={() => setCategoryIndex(i)}
              >
                <Text style={styles.tabIcon}>{cat.icon}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.categoryLabel}>{CATEGORIES[categoryIndex].label}</Text>

          {/* Emoji grid */}
          <FlatList
            data={currentEmojis}
            keyExtractor={(item, index) => `${item}-${index}`}
            numColumns={COLS}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.cell} onPress={() => { onSelect(item); onClose(); }}>
                <Text style={styles.emoji}>{item}</Text>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
            style={styles.grid}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 40,
    height: '55%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 12,
  },
  tabs: { flexGrow: 0, marginBottom: 8 },
  tabsContent: { gap: 4 },
  tab: {
    padding: 8, borderRadius: 10,
    backgroundColor: colors.borderLight,
  },
  tabActive: { backgroundColor: colors.primary + '22', borderWidth: 1, borderColor: colors.primary },
  tabIcon: { fontSize: 20 },
  categoryLabel: { fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  grid: { flex: 1 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26 },
});
