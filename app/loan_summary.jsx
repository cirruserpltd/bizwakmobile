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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
const { API_BASE_URL } = Constants.expoConfig.extra;

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

  // Fetch token on mount
  useEffect(() => {
    getToken();
  }, []);

  // Fetch data when token, page, or search changes
  useEffect(() => {
    if (token) {
      fetchLoansReport();
    }
  }, [token, currentPage, searchQuery]);

  useEffect(() => {
  if (token && params?.statusFilter !== undefined) {
    setActiveFilter(params.statusFilter);
    fetchLoansReport({ status: params.statusFilter });
  } else if (token) {
    fetchLoansReport();
  }
}, [token, currentPage, params?.statusFilter]);

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
      let url = `${API_BASE_URL}/api/loans/getpaginatedloans/${currentPage}/20`;
      
      // Add status filter if present
      if (filters.status !== undefined) {
        url += `?status=${filters.status}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        const loans = result.payload || [];

        // Format data for table or card display
        const formattedData = loans.map((loan) => ({
          id: loan.id,
          memberId: loan.client_id,
          name: loan.name || 'N/A',
          phone: loan.phone || 'N/A',
          paid: Number(loan.amount_paid || loan.paid || 0),
          balance: Number(loan.outstanding_balance || loan.balance || 0),
          status: loan.status,
          statusLabel: getStatusLabel(loan.status),
          statusStyles: getStatusStyles(loan.status),
          branch: loan.branch?.name || 'N/A',
          team: loan.team || 'N/A',
          bde: loan.bde || 'N/A',
          dueDate: loan.next_due_date
            ? new Date(loan.next_due_date).toLocaleDateString()
            : 'N/A',
        }));

        // Update UI states
        setData(formattedData);
        setTotalPages(Math.ceil(result.all_items_total / 20));
        setTotalLoans(result.additional_data?.summary?.total_no_of_loans || 0);
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
          onPress={() => router.push("/actions")} // 👈 navigate back to actions.jsx
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Loans Report</Text>
      </View>

      {activeFilter !== null && (
        <View style={styles.filterBanner}>
          <Text style={styles.filterText}>
            Showing: {params?.filterLabel || getStatusLabel(activeFilter)}
          </Text>
          <TouchableOpacity 
            onPress={() => {
              setActiveFilter(null);
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
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="filter" size={20} color="white" />
          </TouchableOpacity>
        </View>

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
    marginBottom: 16,
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
});