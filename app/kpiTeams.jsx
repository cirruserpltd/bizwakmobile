import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
const { API_BASE_URL } = Constants.expoConfig.extra;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function KPITeamsScreen() {
  const router = useRouter();
  const now = new Date();

  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [tempMonth, setTempMonth] = useState(now.getMonth() + 1);
  const [tempYear, setTempYear] = useState(now.getFullYear());
  const [showFilterModal, setShowFilterModal] = useState(false);

  const currentYear = now.getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    getToken();
  }, []);

  useEffect(() => {
    if (!token) return;
    fetchKPI();
  }, [token, selectedMonth, selectedYear]);

  const getToken = async () => {
    try {
      const t = await AsyncStorage.getItem('token');
      if (t) setToken(t);
      else Alert.alert('Error', 'Authentication token not found. Please login again.');
    } catch (e) {
      console.error('Error retrieving token:', e);
    }
  };

  const fetchKPI = async () => {
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/api/dashboard/kpi/teams?month=${selectedMonth}&year=${selectedYear}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      if (result.success && result.payload?.data) {
        setData(parseKPIData(result.payload.data));
      } else {
        Alert.alert('Error', result.error || 'Failed to fetch KPI data');
      }
    } catch (e) {
      console.error('Error fetching KPI:', e);
      Alert.alert('Error', 'Failed to fetch KPI data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // API returns:
  // [ { branch_id, branch_name,
  //     branch_totals: { disbursement, collection, net_margin, ... },
  //     teams: [ { team_id, team_name, disbursement, collection, net_margin, ... } ]
  //   } ]
  const parseKPIData = (raw) => {
    if (!Array.isArray(raw)) return [];
    return raw.map((branchRow) => ({
      branch: branchRow.branch_name || 'Unknown Branch',
      totals: branchRow.branch_totals || {},
      teams: (branchRow.teams || []).map((team) => ({
        team:         team.team_name || 'Unknown Team',
        disbursement: Number(team.disbursement || 0),
        collection:   Number(team.collection   || 0),
        margin:       Number(team.net_margin   || 0),
      })),
    }));
  };

  const fmt = (n) => Number(n).toLocaleString();
  const getMarginColor = (n) => (n < 0 ? '#D32F2F' : '#388E3C');

  const handleOpenFilter = () => {
    setTempMonth(selectedMonth);
    setTempYear(selectedYear);
    setShowFilterModal(true);
  };

  const handleApplyFilter = () => {
    setSelectedMonth(tempMonth);
    setSelectedYear(tempYear);
    setShowFilterModal(false);
  };

  const getFilterLabel = () => `${MONTHS[selectedMonth - 1]} ${selectedYear}`;

  const renderTeamRow = (item, index) => (
    <View key={index} style={[styles.teamRow, index % 2 === 0 && styles.teamRowAlt]}>
      <Text style={[styles.cell, styles.teamCell]}>{item.team}</Text>
      <Text style={[styles.cell, styles.numCell]}>{fmt(item.disbursement)}</Text>
      <Text style={[styles.cell, styles.numCell]}>{fmt(item.collection)}</Text>
      <Text style={[styles.cell, styles.numCell, { color: getMarginColor(item.margin) }]}>
        {fmt(item.margin)}
      </Text>
    </View>
  );

  const renderBranchSection = ({ item }) => (
    <View style={styles.branchSection}>
      {/* Branch header */}
      <View style={styles.branchHeader}>
        <Ionicons name="business" size={16} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.branchHeaderText}>{item.branch}</Text>
        <Text style={styles.branchTeamCount}>{item.teams.length} team{item.teams.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Column headers */}
      <View style={styles.colHeader}>
        <Text style={[styles.colHeaderText, styles.teamCell]}>Team</Text>
        <Text style={[styles.colHeaderText, styles.numCell]}>Disbursement</Text>
        <Text style={[styles.colHeaderText, styles.numCell]}>%</Text>
        <Text style={[styles.colHeaderText, styles.numCell]}>Margin</Text>
      </View>

      {/* Team rows */}
      {item.teams.length === 0 ? (
        <View style={styles.emptyBranch}>
          <Text style={styles.emptyBranchText}>No team data</Text>
        </View>
      ) : (
        item.teams.map((t, i) => renderTeamRow(t, i))
      )}

      {/* Branch totals row — uses branch_totals from API directly */}
      {item.teams.length > 0 && (
        <View style={styles.totalRow}>
          <Text style={[styles.cell, styles.teamCell, styles.totalLabel]}>Total</Text>
          <Text style={[styles.cell, styles.numCell, styles.totalValue]}>
            {fmt(item.totals.disbursement || 0)}
          </Text>
          <Text style={[styles.cell, styles.numCell, styles.totalValue]}>
            {fmt(item.totals.collection || 0)}
          </Text>
          <Text style={[styles.cell, styles.numCell, styles.totalValue, { color: getMarginColor(item.totals.net_margin || 0) }]}>
            {fmt(item.totals.net_margin || 0)}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4285F4" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/actions')}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KPI — Teams</Text>
        <TouchableOpacity style={styles.filterIconBtn} onPress={handleOpenFilter}>
          <Ionicons name="calendar-outline" size={22} color="white" />
        </TouchableOpacity>
      </View>

      {/* Period pill */}
      <View style={styles.periodRow}>
        <View style={styles.periodPill}>
          <Ionicons name="calendar" size={13} color="#4285F4" style={{ marginRight: 5 }} />
          <Text style={styles.periodPillText}>{getFilterLabel()}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchKPI}>
          <Ionicons name="refresh" size={16} color="#4285F4" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>Loading KPI data...</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderBranchSection}
          keyExtractor={(item, i) => `branch-${i}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="bar-chart-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No KPI data available</Text>
              <Text style={styles.emptySubText}>for {getFilterLabel()}</Text>
            </View>
          }
        />
      )}

      {/* Month/Year Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Period</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Year */}
            <Text style={styles.sectionLabel}>Year</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.yearScroll}
              contentContainerStyle={styles.yearScrollContent}
            >
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[styles.yearChip, tempYear === year && styles.yearChipActive]}
                  onPress={() => setTempYear(year)}
                >
                  <Text style={[styles.yearChipText, tempYear === year && styles.yearChipTextActive]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Month */}
            <Text style={styles.sectionLabel}>Month</Text>
            <View style={styles.monthGrid}>
              {MONTHS.map((month, index) => (
                <TouchableOpacity
                  key={month}
                  style={[styles.monthChip, tempMonth === index + 1 && styles.monthChipActive]}
                  onPress={() => setTempMonth(index + 1)}
                >
                  <Text style={[styles.monthChipText, tempMonth === index + 1 && styles.monthChipTextActive]}>
                    {month.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.previewRow}>
              <Ionicons name="calendar-outline" size={14} color="#4285F4" />
              <Text style={styles.previewText}>{MONTHS[tempMonth - 1]} {tempYear}</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowFilterModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={handleApplyFilter}>
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  header: {
    backgroundColor: '#4285F4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 50,
  },
  backButton: { marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '600', color: 'white' },
  filterIconBtn: { padding: 4 },

  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  periodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  periodPillText: { fontSize: 13, fontWeight: '600', color: '#4285F4' },
  refreshBtn: {
    padding: 8,
    backgroundColor: '#E8F0FE',
    borderRadius: 8,
  },

  listContent: { padding: 12, gap: 16, paddingBottom: 40 },

  branchSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  branchHeader: {
    backgroundColor: '#4285F4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  branchHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  branchTeamCount: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },

  colHeader: {
    flexDirection: 'row',
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#C5D8FA',
  },
  colHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3367D6',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  teamRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  teamRowAlt: { backgroundColor: '#FAFAFA' },

  totalRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#F0F4FF',
    borderTopWidth: 1.5,
    borderTopColor: '#C5D8FA',
    alignItems: 'center',
  },
  totalLabel: { fontWeight: '700', color: '#333' },
  totalValue: { fontWeight: '700', color: '#222' },

  cell: { fontSize: 13, color: '#333' },
  teamCell: { flex: 1.2, paddingRight: 4 },
  numCell: { flex: 1, textAlign: 'right' },

  emptyBranch: { padding: 20, alignItems: 'center' },
  emptyBranchText: { fontSize: 13, color: '#999' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubText: { fontSize: 13, color: '#bbb', marginTop: 4 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  yearScroll: { marginBottom: 20 },
  yearScrollContent: { gap: 8, paddingRight: 8 },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  yearChipActive: { backgroundColor: '#E8F0FE', borderColor: '#4285F4' },
  yearChipText: { fontSize: 14, fontWeight: '600', color: '#555' },
  yearChipTextActive: { color: '#4285F4' },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  monthChip: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  monthChipActive: { backgroundColor: '#4285F4', borderColor: '#4285F4' },
  monthChipText: { fontSize: 13, fontWeight: '600', color: '#555' },
  monthChipTextActive: { color: 'white' },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
    backgroundColor: '#E8F0FE',
    paddingVertical: 8,
    borderRadius: 8,
  },
  previewText: { fontSize: 14, fontWeight: '700', color: '#4285F4' },
  modalActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#555' },
  applyBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: '#4285F4',
    alignItems: 'center',
  },
  applyBtnText: { fontSize: 14, fontWeight: '600', color: 'white' },
});