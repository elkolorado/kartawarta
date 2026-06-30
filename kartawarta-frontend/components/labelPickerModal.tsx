import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { colors } from '@/constants/themeColors';
import { UserLabel } from '@/context/CardContext';

const inputNoOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null;
const EMPTY_SELECTED_IDS: number[] = [];
const EMPTY_QUANTITY_BY_LABEL: Record<number, number> = {};

type LabelPickerModalProps = {
  visible: boolean;
  title?: string;
  description?: string;
  labels: UserLabel[];
  initialSelectedIds?: number[];
  maxQuantity?: number;
  quantityByLabel?: Record<number, number>;
  maxQuantityByLabel?: Record<number, number>;
  includeNoLabel?: boolean;
  startQuantitiesAtZero?: boolean;
  mode?: 'select' | 'allocate';
  confirmLabel?: string;
  isWorking?: boolean;
  onCreateLabel: (name: string) => Promise<UserLabel | null>;
  onUpdateLabel?: (labelId: number, name: string) => Promise<UserLabel | null>;
  onDeleteLabel?: (labelId: number) => Promise<boolean>;
  onCancel: () => void;
  onConfirm: (labelIds: number[], labelQuantities?: Record<number, number>) => Promise<void> | void;
};

const LabelPickerModal: React.FC<LabelPickerModalProps> = ({
  visible,
  title = 'Label saved cards',
  description = 'Choose where these cards are stored, or create a new label.',
  labels,
  initialSelectedIds = EMPTY_SELECTED_IDS,
  maxQuantity = 0,
  quantityByLabel = EMPTY_QUANTITY_BY_LABEL,
  maxQuantityByLabel = EMPTY_QUANTITY_BY_LABEL,
  includeNoLabel = false,
  startQuantitiesAtZero = false,
  mode = 'select',
  confirmLabel = 'Save labels',
  isWorking = false,
  onCreateLabel,
  onUpdateLabel,
  onDeleteLabel,
  onCancel,
  onConfirm,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>(initialSelectedIds);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [newLabelName, setNewLabelName] = useState('');
  const [editingLabelId, setEditingLabelId] = useState<number | null>(null);
  const [editingLabelName, setEditingLabelName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isManagingLabels, setIsManagingLabels] = useState(false);

  React.useEffect(() => {
    if (!visible) return;
    setSelectedIds(initialSelectedIds);
    setQuantities(() => {
      const next: Record<number, number> = {};
      const sourceIds = initialSelectedIds.length > 0 ? initialSelectedIds : Object.keys(quantityByLabel).map(Number);
      if (includeNoLabel && !sourceIds.includes(0)) sourceIds.unshift(0);
      sourceIds.forEach(labelId => {
        const existingQuantity = quantityByLabel[labelId] ?? 0;
        next[labelId] = mode === 'allocate'
          ? existingQuantity
          : startQuantitiesAtZero ? 0 : Math.max(0, Math.min(maxQuantity || existingQuantity || 1, existingQuantity || 0));
      });
      return next;
    });
  }, [includeNoLabel, initialSelectedIds, maxQuantity, mode, quantityByLabel, startQuantitiesAtZero, visible]);

  const normalizedNewLabel = newLabelName.trim();
  const sortedLabels = useMemo(() => [...labels].sort((a, b) => a.name.localeCompare(b.name)), [labels]);
  const visibleLabels = useMemo(() => includeNoLabel ? [{ id: 0, name: 'No label', quantity: quantityByLabel[0] ?? 0 } as UserLabel, ...sortedLabels] : sortedLabels, [includeNoLabel, quantityByLabel, sortedLabels]);

  const getBaseQuantity = (label: UserLabel) => Number(quantityByLabel[label.id] ?? label.quantity ?? 0);
  const getDisplayQuantity = (label: UserLabel) => Number(quantities[label.id] ?? getBaseQuantity(label));
  const hasQuantityChanged = (label: UserLabel) => getDisplayQuantity(label) !== getBaseQuantity(label);

  const toggleLabel = (labelId: number) => {
    setSelectedIds(prev => prev.includes(labelId) ? prev.filter(id => id !== labelId) : [...prev, labelId]);
    if (mode === 'allocate') {
      setQuantities(prev => ({ ...prev, [labelId]: prev[labelId] ?? 1 }));
    }
  };

  const updateQuantity = (labelId: number, delta: number) => {
    setSelectedIds(prev => prev.includes(labelId) ? prev : [...prev, labelId]);
    setQuantities(prev => {
      const baseQuantity = quantityByLabel[labelId] ?? 0;
      const current = prev[labelId] ?? baseQuantity;
      const labelMax = (maxQuantityByLabel[labelId] ?? maxQuantity) || Number.MAX_SAFE_INTEGER;
      const nextValue = Math.max(0, Math.min(labelMax, current + delta));
      return { ...prev, [labelId]: nextValue };
    });
  };

  const beginEdit = (label: UserLabel) => {
    setEditingLabelId(label.id);
    setEditingLabelName(label.name);
  };

  const handleUpdateLabel = async () => {
    const nextName = editingLabelName.trim();
    if (!editingLabelId || !nextName || !onUpdateLabel) return;
    const updated = await onUpdateLabel(editingLabelId, nextName);
    if (updated) {
      setEditingLabelId(null);
      setEditingLabelName('');
    }
  };

  const handleDeleteLabel = async (labelId: number) => {
    if (!onDeleteLabel) return;
    const ok = await onDeleteLabel(labelId);
    if (ok) {
      setSelectedIds(prev => prev.filter(id => id !== labelId));
      setQuantities(prev => {
        const next = { ...prev };
        delete next[labelId];
        return next;
      });
    }
  };

  const handleCreateLabel = async () => {
    if (!normalizedNewLabel || isCreating) return;
    setIsCreating(true);
    try {
      const label = await onCreateLabel(normalizedNewLabel);
      if (label) {
        setSelectedIds(prev => prev.includes(label.id) ? prev : [...prev, label.id]);
        if (mode === 'allocate') setQuantities(prev => ({ ...prev, [label.id]: prev[label.id] ?? 1 }));
        setNewLabelName('');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirm = () => {
    const selectedQuantities = mode === 'allocate'
      ? Object.fromEntries(visibleLabels.map(label => [label.id, getDisplayQuantity(label)]))
      : Object.fromEntries(Object.entries(quantities).filter(([, quantity]) => Number(quantity) > 0).map(([labelId, quantity]) => [Number(labelId), Number(quantity)]));
    onConfirm(mode === 'allocate' ? Object.keys(selectedQuantities).map(Number) : selectedIds, mode === 'allocate' ? selectedQuantities : undefined);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>{title}</Text>
            </View>
            <TouchableOpacity accessibilityLabel="Close labels popup" style={styles.closeButton} onPress={onCancel}>
              <FontAwesome6 name="xmark" size={16} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={styles.manageHeaderRow}>
            <Text style={styles.sectionLabel}>LABELS</Text>
            {(onUpdateLabel || onDeleteLabel) && (
              <View style={styles.manageButtons}>
                <TouchableOpacity accessibilityLabel="Manage labels" style={styles.manageButton} onPress={() => setIsManagingLabels(true)}><FontAwesome6 name="pen" size={10} color={colors.foreground} /></TouchableOpacity>
              </View>
            )}
          </View>

          <ScrollView style={styles.labelsList} keyboardShouldPersistTaps="handled">
            {visibleLabels.length > 0 ? visibleLabels.map(label => {
              const isSelected = selectedIds.includes(label.id);
              const labelQuantity = getDisplayQuantity(label);
              const isChanged = mode === 'allocate' && hasQuantityChanged(label);
              return (
                <View key={label.id} style={[styles.labelOption, isSelected && mode !== 'allocate' && styles.labelOptionActive, isChanged && styles.labelOptionChanged]}>
                  <TouchableOpacity style={styles.labelMain} onPress={() => toggleLabel(label.id)}>
                    <Text style={[styles.labelText, isSelected && mode !== 'allocate' && styles.labelTextActive]}>{label.name}</Text>
                  </TouchableOpacity>
                  {mode === 'allocate' && (
                    <View style={styles.quantityControls}>
                      <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(label.id, -1)}><Text style={styles.quantityButtonText}>-</Text></TouchableOpacity>
                      <Text style={styles.quantityValue}>{labelQuantity}</Text>
                      <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(label.id, 1)}><Text style={styles.quantityButtonText}>+</Text></TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            }) : (
              <Text style={styles.emptyText}>No labels yet. Create one below.</Text>
            )}
          </ScrollView>

          <Modal visible={isManagingLabels} transparent animationType="fade" onRequestClose={() => setIsManagingLabels(false)}>
            <View style={styles.overlay}>
              <Pressable style={styles.backdrop} onPress={() => setIsManagingLabels(false)} />
              <View style={styles.card}>
                <View style={styles.headerRow}>
                  <View style={styles.titleBlock}>
                    <Text style={styles.title}>Manage labels</Text>
                    <Text style={styles.description}>Create, rename, or delete label metadata. Deleting a label does not delete cards.</Text>
                  </View>
                  <TouchableOpacity accessibilityLabel="Close label management" style={styles.closeButton} onPress={() => setIsManagingLabels(false)}>
                    <FontAwesome6 name="xmark" size={16} color={colors.foreground} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.labelsList} keyboardShouldPersistTaps="handled">
                  {sortedLabels.map(label => {
                    const isEditing = editingLabelId === label.id;
                    return (
                      <View key={label.id} style={styles.labelOption}>
                        {isEditing ? (
                          <View style={styles.editRow}>
                            <TextInput
                              style={[styles.editInput, inputNoOutline]}
                              value={editingLabelName}
                              onChangeText={setEditingLabelName}
                              autoFocus
                              placeholder="Label name"
                              placeholderTextColor={colors.mutedForeground}
                            />
                            <TouchableOpacity style={styles.iconButton} onPress={handleUpdateLabel}><FontAwesome6 name="check" size={12} color={colors.foreground} /></TouchableOpacity>
                            <TouchableOpacity style={styles.iconButton} onPress={() => setEditingLabelId(null)}><FontAwesome6 name="xmark" size={12} color={colors.foreground} /></TouchableOpacity>
                          </View>
                        ) : (
                          <>
                            <Text style={[styles.labelText, styles.labelMain]}>{label.name}</Text>
                            {onUpdateLabel && <TouchableOpacity style={styles.iconButton} onPress={() => beginEdit(label)}><FontAwesome6 name="pen" size={11} color={colors.foreground} /></TouchableOpacity>}
                            {onDeleteLabel && <TouchableOpacity style={styles.iconButton} onPress={() => handleDeleteLabel(label.id)}><FontAwesome6 name="trash" size={11} color="#ff6b6b" /></TouchableOpacity>}
                          </>
                        )}
                      </View>
                    );
                  })}
                  {sortedLabels.length === 0 && <Text style={styles.emptyText}>No labels yet. Create one below.</Text>}
                </ScrollView>
                <Text style={styles.sectionLabel}>New label</Text>
                <View style={styles.createRow}>
                  <TextInput
                    style={[styles.input, inputNoOutline]}
                    value={newLabelName}
                    onChangeText={setNewLabelName}
                    placeholder="e.g. Binder blue"
                    placeholderTextColor={colors.mutedForeground}
                    onSubmitEditing={handleCreateLabel}
                  />
                  <TouchableOpacity
                    style={[styles.createButton, (!normalizedNewLabel || isCreating) && styles.disabledButton]}
                    disabled={!normalizedNewLabel || isCreating}
                    onPress={handleCreateLabel}
                  >
                    <FontAwesome6 name="plus" size={13} color={colors.foreground} />
                    <Text style={styles.createButtonText}>{isCreating ? 'Adding...' : 'Add'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.secondaryButton} disabled={isWorking} onPress={onCancel}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primaryButton, isWorking && styles.disabledButton]} disabled={isWorking} onPress={handleConfirm}>
              <Text style={styles.primaryButtonText}>{isWorking ? 'Saving...' : confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '86%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  title: { color: colors.foreground, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  description: { color: colors.mutedForeground, fontSize: 13, lineHeight: 18 },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  sectionLabel: { color: colors.mutedForeground, fontSize: 10, marginBottom: 8, fontWeight: '800', textTransform: 'uppercase' },
  manageHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 },
  manageHeaderText: { color: colors.foreground, fontSize: 13, fontWeight: '700', flex: 1 },
  manageButtons: { paddingLeft: 4 },
  manageButton: { width: 14, height: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center',},
  manageButtonText: { color: colors.foreground, fontSize: 12, fontWeight: '800' },
  allocationHint: { color: colors.mutedForeground, fontSize: 12, marginTop: -3, marginBottom: 10 },
  labelsList: { maxHeight: 230, marginBottom: 14 },
  labelOption: {
    minHeight: 42,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  labelMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  labelOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  labelOptionChanged: {
    borderColor: '#facc15',
    backgroundColor: 'rgba(250, 204, 21, 0.18)',
  },
  labelText: { color: colors.foreground, fontSize: 14, fontWeight: '700' },
  labelTextActive: { color: colors.background },
  labelQuantityText: { color: colors.mutedForeground, fontSize: 12, fontWeight: '800', marginLeft: 'auto' },
  labelQuantityTextChanged: { color: '#facc15' },
  labelActions: { flexDirection: 'row', gap: 6 },
  iconButton: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  editRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  editInput: { flex: 1, minWidth: 0, height: 34, borderRadius: 8, borderWidth: 1, borderColor: colors.border, color: colors.foreground, paddingHorizontal: 10 },
  quantityControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  quantityButton: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 7, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.04)' },
  quantityButtonText: { color: colors.foreground, fontWeight: '900', fontSize: 15 },
  quantityValue: { color: colors.foreground, minWidth: 20, textAlign: 'center', fontWeight: '800' },
  emptyText: { color: colors.mutedForeground, fontSize: 13, textAlign: 'center', paddingVertical: 18 },
  createRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  input: {
    flex: 1,
    minWidth: 0,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: colors.foreground,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  createButton: {
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  createButtonText: { color: colors.foreground, fontWeight: '800' },
  footerRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  secondaryButton: {
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  secondaryButtonText: { color: colors.foreground, fontWeight: '800' },
  primaryButton: {
    height: 42,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  primaryButtonText: { color: colors.background, fontWeight: '900' },
  disabledButton: { opacity: 0.5 },
});

export default LabelPickerModal;
