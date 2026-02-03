import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Dimensions, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCardContext } from '@/context/CardContext';
import { colors } from '@/constants/themeColors';

const AVAILABLE_TCGS = [
  { id: 1,name: 'DragonBallSuper', label: 'Fusion World', color: '#3b82f6' },
  { id: 5,name: 'riftbound', label: 'Riftbound', color: '#7c3aed' },
  // { id: 3,name: 'one piece', label: 'One Piece', color: '#10b981' },
  // { id: 1006, name: 'pokemon', label: 'Pokemon', color: '#ef4444' },
  // { id: 4, name: "magic: the gathering", label: 'Magic', color: '#f59e0b' },
  // { id: 1007, name: 'digimon', label: 'Digimon', color: '#ec4899' },
];

const TCGSelector = () => {
  const { tcgName, setTcgName, tcgId, setTcgId } = useCardContext();
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<View>(null);

  const activeTcg = AVAILABLE_TCGS.find(t => t.id === tcgId) || AVAILABLE_TCGS[0];

  const openDropdown = () => {
    // Measure where the button is on the screen to place the modal correctly
    triggerRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setDropdownPos({
        top: pageY + height + 5,
        left: pageX,
        width: Math.max(width, 180)
      });
      setIsOpen(true);
    });
  };

  return (
    <View style={styles.container} ref={triggerRef}>
      <TouchableOpacity 
        style={[styles.trigger, { borderColor: `${activeTcg.color}40` }]} 
        onPress={openDropdown}
      >
        <View style={[styles.dot, { backgroundColor: activeTcg.color }]} />
        <Text style={styles.triggerText}>{activeTcg.label}</Text>
        <MaterialCommunityIcons name="chevron-down" size={14} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Modal visible={isOpen} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setIsOpen(false)}>
          <View style={[styles.dropdown, { 
              top: dropdownPos.top, 
              left: dropdownPos.left, 
              minWidth: dropdownPos.width 
            }]}>
            {AVAILABLE_TCGS.map((tcg) => (
              <TouchableOpacity
                key={tcg.id}
                style={[styles.option, tcg.id === tcgId && styles.optionSelected]}
                onPress={() => {
                  setTcgId(tcg.id);
                  setTcgName(tcg.name);
                  setIsOpen(false);
                }}
              >
                <Text style={[styles.optionText, tcg.id === tcgId && { color: tcg.color }]}>
                  {tcg.label}
                </Text>
                {tcg.id === tcgId && <MaterialCommunityIcons name="check" size={16} color={tcg.color} />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginLeft: 12 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  triggerText: { color: colors.foreground, fontSize: 12, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'transparent' },
  dropdown: {
    position: 'absolute',
    backgroundColor: '#1a1a1a', // Ensure this is a solid color
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 10 }
    })
  },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 8 },
  optionSelected: { backgroundColor: 'rgba(255,255,255,0.05)' },
  optionText: { color: colors.mutedForeground, fontSize: 13, fontWeight: '500' },
});

export default TCGSelector;