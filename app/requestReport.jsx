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

export default function LoanRequestsScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);
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
      fetchLoanRequests();
    }
  }, [token, currentPage]);

  useEffect(() => {
    if (token && params?.statusFilter !== undefined) {
      setActiveFilter(params.statusFilter);
      fetchLoanRequests({ status: params.statusFilter });
    } else if (token) {
      fetchLoanRequests();
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
      '0': 'Pending Approval',
      '1': 'Approved',
      '2': 'Processed',
    };
    return statusMap[String(statusCode)] || 'Unknown';
  };

  const getStatusColor = (statusCode) => {
    const statusLabel = getStatusLabel(statusCode);
    
    switch (statusLabel) {
      case 'Rejected':
        return '#D32F2F';
      case 'Pending Approval':
        return '#FBC02D';
      case 'Approved':
        return '#4CAF50';
      case 'Processed':
        return '#00796B';
      default:
        return '#607D8B';
    }
  };

  const fetchLoanRequests = async (filters = {}) => {
    setLoading(true);
    try {
      const url = `${API_BASE_URL}/api/loans/requests/list/${currentPage}/20`;
      
      // Prepare request body with filters
      const requestBody = {};
      
      // Add search query if present
      if (searchQuery.trim()) {
        requestBody.client_name = searchQuery.trim();
      }
      
      // Add status filter if present
      if (filters.status !== undefined) {
        requestBody.status = filters.status;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();
      console.log('API Response:', result);

      if (result.success) {
        const requests = result.payload || [];

        // Format data for table display
        const formattedData = requests.map((request) => ({
          id: request.id,
          clientId: request.client_id,
          name: request.client_name || 'N/A',
          phone: request.client_phone || 'N/A',
          amount: Number(request.amount || 0),
          status: request.status,
          statusLabel: getStatusLabel(request.status),
          statusColor: getStatusColor(request.status),
          date: request.created_at
            ? new Date(request.created_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
            : 'N/A',
        }));

        // Update UI states
        setData(formattedData);
        setTotalPages(Math.ceil(result.all_items_total / 20));
        setTotalRequests(result.all_items_total || 0);
      } else {
        Alert.alert('Error', result.error || 'Failed to fetch loan requests');
      }
    } catch (error) {
      console.error('Error fetching loan requests:', error);
      Alert.alert('Error', 'Failed to fetch loan requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLoanRequests();
  };

  const handlePhonePress = (clientId) => {
    if (clientId) {
      router.push(`/profile?memberId=${clientId}`);
    } else {
      Alert.alert('Error', 'Client ID not found');
    }
  };

  const formatPhone = (phone) => {
    if (!phone || phone === 'N/A') return phone;
    return phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
  };

  const renderItem = ({ item }) => (
    <View style={styles.tableRow}>
      <Text style={[styles.cell, styles.dateCell]}>{item.date}</Text>
      <Text style={[styles.cell, styles.nameCell]} numberOfLines={2}>{item.name}</Text>
      
      <TouchableOpacity 
        style={styles.phoneCellContainer}
        onPress={() => handlePhonePress(item.clientId)}
        activeOpacity={0.7}
      >
        <Text style={[styles.cell, styles.phoneCell, styles.phoneLink]}>
          {formatPhone(item.phone)}
        </Text>
      </TouchableOpacity>
      
      <Text style={[styles.cell, styles.amountCell]}>
        {item.amount?.toLocaleString?.() || '0'}
      </Text>
      
      <Text style={[styles.cell, styles.statusCell, { color: item.statusColor }]}>
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

        <Text style={styles.headerTitle}>Loan Requests</Text>
      </View>

      {activeFilter !== null && (
        <View style={styles.filterBanner}>
          <Text style={styles.filterText}>
            Showing: {params?.filterLabel || getStatusLabel(activeFilter)}
          </Text>
          <TouchableOpacity 
            onPress={() => {
              setActiveFilter(null);
              router.replace('/loan_requests');
            }} 
            style={styles.clearFilterButton}
          >
            <Text style={styles.clearFilterText}>Clear Filter ✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Total Requests Section */}
        <View style={styles.totalSection}>
          <View>
            <Text style={styles.totalLabel}>Total Requests</Text>
            <Text style={styles.totalValue}>{totalRequests.toLocaleString()}</Text>
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
              placeholder="Search by name"
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
          <Text style={[styles.headerCell, styles.dateCell]}>Date</Text>
          <Text style={[styles.headerCell, styles.nameCell]}>Name</Text>
          <Text style={[styles.headerCell, styles.phoneHeaderCell]}>Phone</Text>
          <Text style={[styles.headerCell, styles.amountCell]}>Amount</Text>
          <Text style={[styles.headerCell, styles.statusHeaderCell]}>Status</Text>
        </View>

        {/* Table Data */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4285F4" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : (
          <FlatList
            data={data}
            renderItem={renderItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.table}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No loan requests found</Text>
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
    paddingHorizontal: 12,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    textAlign: 'center'
  },
  dateCell: {
    width: '20%',
    paddingRight: 4,
  },
  nameCell: {
    width: '23%',
    paddingRight: 4,
  },
  phoneHeaderCell: {
    width: '25%',
    paddingRight: 4,
  },
  phoneCellContainer: {
    width: '25%',
    paddingRight: 4,
  },
  phoneCell: {
    lineHeight: 16,
  },
  phoneLink: {
    color: '#4285F4',
    fontWeight: '500',
  },
  amountCell: {
    width: '18%',
    textAlign: 'right',
    paddingRight: 8,
  },
  statusHeaderCell: {
    width: '14%',
  },
  statusCell: {
    width: '14%',
    fontSize: 10,
    fontWeight: '600',
  },
  table: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
    minHeight: 60,
  },
  cell: {
    fontSize: 13,
    color: '#333',
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