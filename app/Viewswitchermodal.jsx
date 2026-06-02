import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VIEW_LEVEL } from './Useviewpermissions';

export default function ViewSwitcherModal({
  visible,
  onClose,
  onSelect,
  viewType,
  selectedView,
  viewLevel,
  availableBranches = [],
  availableTeams    = [],
  userBranch,
  userTeam,
  loading = false,
  accentColor = '#2D5BFF',
}) {
  console.log('[ViewSwitcherModal] render:', JSON.stringify({
    visible,
    viewLevel,
    availableTeamsCount: availableTeams?.length,
    availableTeams,
    loading,
  }));
  const isSelected = (type, item = null) => {
    if (type === VIEW_LEVEL.ALL) return viewType === VIEW_LEVEL.ALL;
    return viewType === type && selectedView?.id == item?.id;
  };

  const optionStyle = (selected) => [
    styles.option,
    selected && { backgroundColor: `${accentColor}15`, borderColor: accentColor, borderWidth: 1.5 },
  ];

  const iconColor = (selected) => (selected ? accentColor : '#888');
  const textColor = (selected) => ({
    color: selected ? accentColor : '#333',
    fontWeight: selected ? '600' : '500',
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Switch View</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={22} color="#555" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={styles.loaderText}>Loading options…</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
             
              {viewLevel === VIEW_LEVEL.ALL && (
                <>
                  {/* "All Branches" — view everything */}
                  <TouchableOpacity
                    style={optionStyle(isSelected(VIEW_LEVEL.ALL))}
                    onPress={() => onSelect(VIEW_LEVEL.ALL, null)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: `${accentColor}20` }]}>
                      <Ionicons name="business" size={20} color={iconColor(isSelected(VIEW_LEVEL.ALL))} />
                    </View>
                    <Text style={[styles.optionText, textColor(isSelected(VIEW_LEVEL.ALL))]}>
                      All Branches
                    </Text>
                    {isSelected(VIEW_LEVEL.ALL) && (
                      <Ionicons name="checkmark-circle" size={20} color={accentColor} />
                    )}
                  </TouchableOpacity>

                  {/* All branches list */}
                  {availableBranches.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>View by Branch</Text>
                      {availableBranches.map((branch) => {
                        const sel = isSelected(VIEW_LEVEL.BRANCH, branch);
                        return (
                          <TouchableOpacity
                            key={branch.id}
                            style={optionStyle(sel)}
                            onPress={() => onSelect(VIEW_LEVEL.BRANCH, branch)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.iconWrap, { backgroundColor: '#FFF3E0' }]}>
                              <Ionicons name="location" size={20} color={iconColor(sel)} />
                            </View>
                            <View style={styles.optionTextBlock}>
                              <Text style={[styles.optionText, textColor(sel)]}>{branch.name}</Text>
                              {branch.location ? (
                                <Text style={styles.optionSub}>{branch.location}</Text>
                              ) : null}
                            </View>
                            {sel && <Ionicons name="checkmark-circle" size={20} color={accentColor} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* All teams list */}
                  {availableTeams.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>View by Team</Text>
                      {availableTeams.map((team) => {
                        const sel = isSelected(VIEW_LEVEL.TEAM, team);
                        return (
                          <TouchableOpacity
                            key={team.id}
                            style={optionStyle(sel)}
                            onPress={() => onSelect(VIEW_LEVEL.TEAM, team)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.iconWrap, { backgroundColor: '#E8F5E9' }]}>
                              <Ionicons name="people" size={20} color={iconColor(sel)} />
                            </View>
                            <Text style={[styles.optionText, textColor(sel)]}>{team.name}</Text>
                            {sel && <Ionicons name="checkmark-circle" size={20} color={accentColor} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              )}

             
              {viewLevel === VIEW_LEVEL.BRANCH && (
                <>
                  {userBranch ? (
                    <>
                      <Text style={styles.sectionLabel}>Your Branch</Text>
                      <TouchableOpacity
                        style={optionStyle(isSelected(VIEW_LEVEL.BRANCH, userBranch))}
                        onPress={() => onSelect(VIEW_LEVEL.BRANCH, userBranch)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.iconWrap, { backgroundColor: '#FFF3E0' }]}>
                          <Ionicons
                            name="location"
                            size={20}
                            color={iconColor(isSelected(VIEW_LEVEL.BRANCH, userBranch))}
                          />
                        </View>
                        <View style={styles.optionTextBlock}>
                          <Text style={[styles.optionText, textColor(isSelected(VIEW_LEVEL.BRANCH, userBranch))]}>
                            {userBranch.name}
                          </Text>
                          <Text style={styles.optionSub}>All teams in branch</Text>
                        </View>
                        {isSelected(VIEW_LEVEL.BRANCH, userBranch) && (
                          <Ionicons name="checkmark-circle" size={20} color={accentColor} />
                        )}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={styles.noBranchWarning}>
                      <Ionicons name="warning-outline" size={24} color="#FFA000" />
                      <Text style={styles.noBranchText}>
                        No branch assigned to your account.{'\n'}Contact an admin to resolve this.
                      </Text>
                    </View>
                  )}

                  {/* Teams within their branch */}
                  {availableTeams.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>View by Team</Text>
                      {availableTeams.map((team) => {
                        const sel = isSelected(VIEW_LEVEL.TEAM, team);
                        return (
                          <TouchableOpacity
                            key={team.id}
                            style={optionStyle(sel)}
                            onPress={() => onSelect(VIEW_LEVEL.TEAM, team)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.iconWrap, { backgroundColor: '#E8F5E9' }]}>
                              <Ionicons name="people" size={20} color={iconColor(sel)} />
                            </View>
                            <Text style={[styles.optionText, textColor(sel)]}>{team.name}</Text>
                            {sel && <Ionicons name="checkmark-circle" size={20} color={accentColor} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              )}

             {viewLevel === VIEW_LEVEL.TEAM && (
                <>
                  {userBranch && (
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>Your Branch</Text>
                      <TouchableOpacity
                        style={optionStyle(isSelected(VIEW_LEVEL.BRANCH, userBranch))}
                        onPress={() => onSelect(VIEW_LEVEL.BRANCH, userBranch)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.iconWrap, { backgroundColor: '#FFF3E0' }]}>
                          <Ionicons name="location" size={20} color={iconColor(isSelected(VIEW_LEVEL.BRANCH, userBranch))} />
                        </View>
                        <Text style={[styles.optionText, textColor(isSelected(VIEW_LEVEL.BRANCH, userBranch))]}>
                          {userBranch.name}
                        </Text>
                        {isSelected(VIEW_LEVEL.BRANCH, userBranch) && (
                          <Ionicons name="checkmark-circle" size={20} color={accentColor} />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {userTeam && (
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>Your Team</Text>
                      <TouchableOpacity
                        style={optionStyle(isSelected(VIEW_LEVEL.TEAM, userTeam))}
                        onPress={() => onSelect(VIEW_LEVEL.TEAM, userTeam)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.iconWrap, { backgroundColor: '#E8F5E9' }]}>
                          <Ionicons name="people" size={20} color={iconColor(isSelected(VIEW_LEVEL.TEAM, userTeam))} />
                        </View>
                        <Text style={[styles.optionText, textColor(isSelected(VIEW_LEVEL.TEAM, userTeam))]}>
                          {userTeam.name}
                        </Text>
                        {isSelected(VIEW_LEVEL.TEAM, userTeam) && (
                          <Ionicons name="checkmark-circle" size={20} color={accentColor} />
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '90%',
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    letterSpacing: -0.3,
  },
  loader: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    color: '#888',
  },
  scroll: {
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  section: {
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F7F7F7',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
  },
  optionTextBlock: {
    flex: 1,
  },
  optionSub: {
    fontSize: 11,
    color: '#AAA',
    marginTop: 2,
  },
  lockedContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 16,
  },
  lockedText: {
    fontSize: 13,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 20,
  },
  noBranchWarning: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  noBranchText: {
    fontSize: 13,
    color: '#FFA000',
    textAlign: 'center',
    lineHeight: 20,
  },
});