import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
const { API_BASE_URL } = Constants.expoConfig.extra;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function LoansReportScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalLoans, setTotalLoans] = useState(0);
  const [token, setToken] = useState(null);
  const params = useLocalSearchParams();
  const [activeFilter, setActiveFilter] = useState(null);
  const [dueInDaysFilter, setDueInDaysFilter] = useState(null);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(null); // null = any month
  const [selectedYear, setSelectedYear] = useState(now.getFullYear()); // default to current year
  const [tempMonth, setTempMonth] = useState(null);
  const [tempYear, setTempYear] = useState(now.getFullYear());
  const [showFilterModal, setShowFilterModal] = useState(false);

  const currentYear = now.getFullYear();
  const years = Array.from({ length: 8 }, (_, i) => currentYear - 5 + i);

  useEffect(() => {
    getToken();
  }, []);

  useEffect(() => {
    if (!token) return;

    if (params?.statusFilter !== undefined && params.statusFilter !== null) {
      setActiveFilter(params.statusFilter);
      setDueInDaysFilter(null);
      fetchLoansReport({ status: params.statusFilter });
    } else if (params?.dueInDays !== undefined && params.dueInDays !== null) {
      setDueInDaysFilter(params.dueInDays);
      setActiveFilter(null);
      fetchLoansReport({ due_in_days: params.dueInDays });
    } else {
      setActiveFilter(null);
      setDueInDaysFilter(null);
      fetchLoansReport();
    }
  }, [token, currentPage, searchQuery, params?.statusFilter, params?.dueInDays, selectedMonth, selectedYear]);

  const getToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
      } else {
        Alert.alert('Error', 'Authentication token not found. Please login again.');
      }
    } catch (error) {
      console.error('Error retrieving token:', error);
      Alert.alert('Error', 'Failed to retrieve authentication token.');
    }
  };

  const getStatusLabel = (statusCode) => {
    const statusMap = {
      '-1': 'Rejected',
      '0': 'Pending BM',
      '1': 'Pending CM',
      '2': 'Pending HQ',
      '3': 'Pending Disbursement',
      '4': 'Active',
      '5': 'Paid',
      '6': 'Defaulted',
      '7': 'Repossession'
    };
    return statusMap[String(statusCode)] || 'Unknown';
  };

  const getStatusStyles = (statusCode) => {
    const statusLabel = getStatusLabel(statusCode);
    switch (statusLabel) {
      case 'Rejected':
        return { badge: { backgroundColor: '#FFEBEE' }, text: { color: '#D32F2F' } };
      case 'Pending BM':
        return { badge: { backgroundColor: '#FFF8E1' }, text: { color: '#FBC02D' } };
      case 'Pending CM':
        return { badge: { backgroundColor: '#E3F2FD' }, text: { color: '#1976D2' } };
      case 'Pending HQ':
        return { badge: { backgroundColor: '#E8EAF6' }, text: { color: '#b553ff' } };
      case 'Pending Disbursement':
        return { badge: { backgroundColor: '#a36926ff' }, text: { color: '#eea858ff' } };
      case 'Active':
        return { badge: { backgroundColor: '#E8F5E9' }, text: { color: '#4CAF50' } };
      case 'Paid':
        return { badge: { backgroundColor: '#E0F2F1' }, text: { color: '#00796B' } };
      case 'Defaulted':
        return { badge: { backgroundColor: '#FFEBEE' }, text: { color: '#D32F2F' } };
      case 'Repossession':
        return { badge: { backgroundColor: '#212121' }, text: { color: '#FFFFFF' } };
      default:
        return { badge: { backgroundColor: '#ECEFF1' }, text: { color: '#607D8B' } };
    }
  };

  const fetchLoansReport = async (filters = {}) => {
    setLoading(true);
    try {
      const requestBody = {};

      if (filters.status !== undefined) {
        requestBody.status = filters.status;
      }
      if (filters.due_in_days !== undefined) {
        requestBody.due_in_days = filters.due_in_days;
      }

      // disbursed_at is returned in each loan object and filtered after fetch

      const url = `${API_BASE_URL}/api/loans/getpaginatedloans/${currentPage}/20`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      console.log('API Response Sample:', result.payload[0]);

      if (result.success) {
        const loans = result.payload || [];
        const formattedData = loans.map((loan) => ({
          id: loan.id,
          memberId: loan.client_id,
          name: loan.name || 'N/A',
          phone: loan.phone || 'N/A',
          paid: Number(loan.il_amount_paid || 0),
          balance: Number(loan.il_balance_due || 0),
          status: loan.status,
          statusLabel: getStatusLabel(loan.status),
          statusStyles: getStatusStyles(loan.status),
          branch: loan.branch?.name || 'N/A',
          team: loan.team || 'N/A',
          bde: loan.bde || 'N/A',
          dueDate: loan.next_due_date
            ? new Date(loan.next_due_date).toLocaleDateString()
            : 'N/A',
          disbursedAt: loan.disbursed_at || null, 
        }));

        // Client-side filter by disbursed_at month/year
        const filtered = formattedData.filter((loan) => {
          if (!loan.disbursedAt) return true;
          const d = new Date(loan.disbursedAt);
          if (isNaN(d)) return true;
          const monthMatch = selectedMonth === null || d.getMonth() === selectedMonth;
          const yearMatch  = selectedYear  === null || d.getFullYear() === selectedYear;
          return monthMatch && yearMatch;
        });

        setData(filtered);
        setTotalPages(Math.ceil(result.all_items_total / 20));
        setTotalLoans(filtered.length || result.additional_data?.summary?.total_no_of_loans || 0);
      } else {
        Alert.alert('Error', result.error || 'Failed to fetch loans report');
      }
    } catch (error) {
      console.error('Error fetching loans report:', error);
      Alert.alert('Error', 'Failed to fetch loans report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLoansReport();
  };

  const handleClientPress = (memberId) => {
    if (memberId) {
      router.push(`/loan_details?member_id=${memberId}`);
    } else {
      Alert.alert('Error', 'Member ID not found');
    }
  };

  const handleOpenFilterModal = () => {
    setTempMonth(selectedMonth);
    setTempYear(selectedYear);
    setShowFilterModal(true);
  };

  const handleApplyFilter = () => {
    setSelectedMonth(tempMonth);
    setSelectedYear(tempYear);
    setCurrentPage(1);
    setShowFilterModal(false);
  };

  const handleResetDateFilter = () => {
    setTempMonth(null);
    setTempYear(null);
  };

  const hasDateFilter = selectedMonth !== null || selectedYear !== null;

  const getDateFilterLabel = () => {
    if (selectedMonth !== null && selectedYear !== null) return `${MONTHS[selectedMonth]} ${selectedYear}`;
    if (selectedMonth !== null) return `${MONTHS[selectedMonth]} (Any Year)`;
    if (selectedYear !== null) return `All of ${selectedYear}`;
    return null;
  };

  const renderItem = ({ item }) => (
    <View style={styles.tableRow}>
      <TouchableOpacity
        style={[styles.cell, styles.nameCell]}
        onPress={() => handleClientPress(item.memberId)}
        activeOpacity={0.7}
      >
        <Text style={styles.nameCellText}>{item.name}</Text>
      </TouchableOpacity>
      <Text style={styles.cell}>{item.paid?.toLocaleString?.() || '0'}</Text>
      <Text style={styles.cell}>{item.balance?.toLocaleString?.() || '0'}</Text>
      <Text style={[styles.cell, styles.dateCell, styles.dateCellText]}>{item.dueDate}</Text>
      <Text style={[styles.cell, styles.statusCell, item.statusStyles.text]}>
        {item.statusLabel}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4285F4" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/actions")}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Loans Report</Text>
      </View>

      {/* Active status/due-in-days filter banner */}
      {(activeFilter !== null || dueInDaysFilter !== null) && (
        <View style={styles.filterBanner}>
          <Text style={styles.filterText}>
            {activeFilter !== null
              ? (params?.filterLabel || getStatusLabel(activeFilter))
              : `Loans Due in ${dueInDaysFilter} Days`
            }
          </Text>
          <TouchableOpacity
            onPress={() => {
              setActiveFilter(null);
              setDueInDaysFilter(null);
              router.replace('/loan_summary');
            }}
            style={styles.clearFilterButton}
          >
            <Text style={styles.clearFilterText}>Clear Filter ✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Total Loans Section */}
        <View style={styles.totalSection}>
          <View>
            <Text style={styles.totalLabel}>Total Loans</Text>
            <Text style={styles.totalValue}>{totalLoans.toLocaleString()}</Text>
          </View>
          <TouchableOpacity style={styles.downloadButton}>
            <Ionicons name="download-outline" size={18} color="white" />
            <Text style={styles.downloadText}>Download</Text>
          </TouchableOpacity>
        </View>

        {/* Search and Filter */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or loan ID"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity onPress={handleSearch}>
              <Ionicons name="search" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Filter button — shows a dot indicator when not on current month/year */}
          <TouchableOpacity style={styles.filterButton} onPress={handleOpenFilterModal}>
            <Ionicons name="calendar-outline" size={20} color="white" />
            {hasDateFilter && <View style={styles.filterActiveDot} />}
          </TouchableOpacity>
        </View>

        {/* Month/Year label pill */}
        {hasDateFilter && (
          <View style={styles.dateFilterPill}>
            <Ionicons name="calendar" size={13} color="#4285F4" style={{ marginRight: 4 }} />
            <Text style={styles.dateFilterPillText}>{getDateFilterLabel()}</Text>
            <TouchableOpacity
              onPress={() => {
                setSelectedMonth(null);
                setSelectedYear(null);
                setCurrentPage(1);
              }}
              style={styles.pillClearBtn}
            >
              <Text style={styles.pillClearText}>Clear ✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
          <Text style={styles.headerCell}>Paid</Text>
          <Text style={styles.headerCell}>Balance</Text>
          <Text style={[styles.headerCell, styles.dateCell]}>Due Date</Text>
          <Text style={[styles.headerCell, styles.statusCell]}>Status</Text>
        </View>

        {/* Table Data */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4285F4" />
            <Text style={styles.loadingText}>Loading loans...</Text>
          </View>
        ) : (
          <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.table}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No loans found</Text>
              </View>
            }
          />
        )}

        {/* Pagination */}
        <View style={styles.pagination}>
          <TouchableOpacity
            style={styles.pageButton}
            onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || loading}
          >
            <Ionicons name="arrow-back" size={20} color={currentPage === 1 ? '#ccc' : '#666'} />
          </TouchableOpacity>
          <Text style={styles.pageText}>
            Page {currentPage} of {totalPages || 1}
          </Text>
          <TouchableOpacity
            style={[styles.pageButton, styles.nextButton]}
            onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || loading}
          >
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Month/Year Filter Modal ── */}
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
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Period</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={22} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Year selector */}
            <Text style={styles.sectionLabel}>Year <Text style={styles.sectionHint}>(tap to select/deselect)</Text></Text>
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
                  onPress={() => setTempYear(tempYear === year ? null : year)}
                >
                  <Text style={[styles.yearChipText, tempYear === year && styles.yearChipTextActive]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Month grid */}
            <Text style={styles.sectionLabel}>Month <Text style={styles.sectionHint}>(tap to select/deselect)</Text></Text>
            <View style={styles.monthGrid}>
              {MONTHS.map((month, index) => (
                <TouchableOpacity
                  key={month}
                  style={[styles.monthChip, tempMonth === index && styles.monthChipActive]}
                  onPress={() => setTempMonth(tempMonth === index ? null : index)}
                >
                  <Text style={[styles.monthChipText, tempMonth === index && styles.monthChipTextActive]}>
                    {month.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Preview label */}
            <View style={styles.previewRow}>
              <Ionicons name="calendar-outline" size={14} color="#4285F4" />
              <Text style={styles.previewText}>
                {tempMonth !== null && tempYear !== null
                  ? `${MONTHS[tempMonth]} ${tempYear}`
                  : tempMonth !== null
                  ? `${MONTHS[tempMonth]} — Any Year`
                  : tempYear !== null
                  ? `All of ${tempYear}`
                  : 'No filter — showing all loans'}
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.resetBtn} onPress={handleResetDateFilter}>
                <Text style={styles.resetBtnText}>Clear All</Text>
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
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#4285F4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 16 : 50,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  totalSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  downloadButton: {
    backgroundColor: '#4285F4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  downloadText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
  },
  filterButton: {
    backgroundColor: '#4285F4',
    width: 48,
    height: 48,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5252',
    borderWidth: 1,
    borderColor: 'white',
  },

  // Date filter pill
  dateFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E8F0FE',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
  },
  dateFilterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4285F4',
  },
  pillClearBtn: {
    marginLeft: 8,
    backgroundColor: '#4285F4',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  pillClearText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '600',
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  nameCell: {
    flex: 1.2,
    textAlign: 'left',
    paddingLeft: 8,
  },
  nameCellText: {
    fontSize: 13,
    color: '#4285F4',
    fontWeight: '500',
  },
  dateCell: {
    flex: 0.8,
  },
  statusCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  table: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  cell: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
  },
  dateCellText: {
    fontSize: 11,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 16,
  },
  pageButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
  },
  nextButton: {
    backgroundColor: '#4285F4',
  },
  pageText: {
    fontSize: 14,
    color: '#666',
  },
  filterBanner: {
    backgroundColor: '#FFF3E0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },
  clearFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E65100',
  },

  // ── Modal styles ──
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
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  sectionHint: {
    fontSize: 10,
    fontWeight: '400',
    color: '#aaa',
    textTransform: 'none',
    letterSpacing: 0,
  },
  yearScroll: {
    marginBottom: 20,
  },
  yearScrollContent: {
    gap: 8,
    paddingRight: 8,
  },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  yearChipActive: {
    backgroundColor: '#E8F0FE',
    borderColor: '#4285F4',
  },
  yearChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  yearChipTextActive: {
    color: '#4285F4',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  monthChip: {
    width: '22%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  monthChipActive: {
    backgroundColor: '#4285F4',
    borderColor: '#4285F4',
  },
  monthChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  monthChipTextActive: {
    color: 'white',
  },
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
  previewText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4285F4',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: '#4285F4',
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});