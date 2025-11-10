import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import Constants from 'expo-constants';
const { API_BASE_URL } = Constants.expoConfig.extra;

const LoanDetails = () => {
  const { member_id, loan_id } = useLocalSearchParams();
  const router = useRouter();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [approvalType, setApprovalType] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [disbursementModalVisible, setDisbursementModalVisible] = useState(false);
  const [disbursementDate, setDisbursementDate] = useState(new Date());
  const [transactionId, setTransactionId] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');


  useEffect(() => {
    if (member_id) fetchLoanDetails();
  }, [member_id]);

  useEffect(() => {
  fetchCurrentUser();
}, []);

const fetchCurrentUser = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    if (data.success) {
      setCurrentUserName(data.payload.name || 'Admin');
    }
  } catch (error) {
    console.error('Error fetching current user:', error);
    setCurrentUserName('Admin');
  }
};

  const fetchLoanDetails = async () => {
  try {
    setLoading(true);
    const token = await AsyncStorage.getItem('token');
    
    // Use loan_id if provided, otherwise use member_id
    const endpoint = loan_id 
      ? `${API_BASE_URL}/api/loans/${loan_id}`
      : `${API_BASE_URL}/api/loans/all/${member_id}`;
    
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('Fetched loan data:', data);

    if (response.ok && data.success) {
      if (loan_id) {
        // Single loan response
        setLoan({
          active: data.payload,
          previous: [],
        });
      } else {
        // Multiple loans response
        const loans = data.payload || [];
        const activeLoan = loans.find(l => 
          (l.status >= 0 && l.status <= 4) || l.is_active
        );
        const previousLoans = loans.filter(l => 
          (l.status < 0 || l.status > 4) && !l.is_active
        );

        setLoan({
          active: activeLoan,
          previous: previousLoans,
        });
      }
    } else {
      Alert.alert('Error', data.error || 'No loans found');
      setLoan(null);
    }
  } catch (error) {
    console.error('Error fetching loans:', error);
    Alert.alert('Error', 'Failed to fetch loan details');
  } finally {
    setLoading(false);
  }
};

  const getStatusText = (status) => {
    const statusMap = {
      0: 'Pending BM Approval',
      1: 'Pending CM Approval',
      2: 'Pending HQ Approval',
      3: 'Pending Disbursement',
      4: 'Disbursed',
      6: 'Defaulted',
      7: 'Repossession',
      '-1': 'Rejected',
    };
    return statusMap[status] || 'Unknown';
  };

  const getApprovalStatuses = () => {
    if (!loan || !loan.active) return [];
    
    const activeLoan = loan.active;
    return [
      {
        label: 'Created',
        completed: true,
        pending: false,
      },
      {
        label: 'BM Approval',
        completed: activeLoan.status >= 1,
        pending: activeLoan.status === 0,
      },
      {
        label: 'HQ Approval',
        completed: activeLoan.status >= 3,
        pending: activeLoan.status === 2,
      },
      {
        label: 'Disbursed',
        completed: activeLoan.status === 4,
        pending: activeLoan.status === 3,
      },
    ];
  };

  const handleApprove = (type) => {
    setApprovalType(type);
    setApprovalComment('');
    setApprovalModalVisible(true);
  };

  const submitApproval = async () => {
    if (!loan || !loan.active) return;
    
    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('token');
      
      let endpoint = '';
      if (approvalType === 'BM') {
        endpoint = `${API_BASE_URL}/api/loans/approve-bm/${loan.active.id}`;
      } else if (approvalType === 'HQ') {
        endpoint = `${API_BASE_URL}/api/loans/approve-hq/${loan.active.id}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          approval_comment: approvalComment.trim() || null,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', data.message);
        setApprovalModalVisible(false);
        await fetchLoanDetails();
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (error) {
      console.error('Error approving loan:', error);
      Alert.alert('Error', 'Failed to approve loan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisburse = () => {
  if (!loan || !loan.active) return;
  
  // Reset modal state
  setDisbursementDate(new Date());
  setTransactionId('');
  setDisbursementModalVisible(true);
};

const submitDisbursement = async () => {
  if (!loan || !loan.active) return;
  
  if (!transactionId.trim()) {
    Alert.alert('Error', 'Please enter a transaction ID');
    return;
  }
  
  Alert.alert(
    'Confirm Disbursement',
    'Are you sure you want to disburse this loan?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: 'default',
        onPress: async () => {
          try {
            setSubmitting(true);
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/loans/disburse/${loan.active.id}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                transaction_id: transactionId.trim(),
                disbursement_date: disbursementDate.toISOString().split('T')[0],
                disbursal_officer: currentUserName,
              }),
            });

            const data = await response.json();
            if (data.success) {
              Alert.alert('Success', data.message);
              setDisbursementModalVisible(false);
              await fetchLoanDetails();
            } else {
              Alert.alert('Error', data.error);
            }
          } catch (error) {
            console.error('Error disbursing loan:', error);
            Alert.alert('Error', 'Failed to disburse loan');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]
  );
};

  const handleDecline = () => {
    if (!loan || !loan.active) return;
    
    Alert.prompt(
      'Decline Loan',
      'Please provide a reason for declining:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async (reason) => {
            if (!reason || !reason.trim()) {
              Alert.alert('Error', 'Please provide a reason for declining');
              return;
            }
            
            try {
              const token = await AsyncStorage.getItem('token');
              const response = await fetch(`${API_BASE_URL}/api/loans/reject/${loan.active.id}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ reason: reason.trim() }),
              });

              const data = await response.json();
              if (data.success) {
                Alert.alert('Success', data.message, [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                Alert.alert('Error', data.error);
              }
            } catch (error) {
              console.error('Error declining loan:', error);
              Alert.alert('Error', 'Failed to decline loan');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading loan details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!loan || !loan.active) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={styles.errorText}>No active loan found</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activeLoan = loan.active;
  const approvalStatuses = getApprovalStatuses();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2196F3" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Loan Details</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Text style={styles.updateButton}>Update</Text>
        </TouchableOpacity>
      </View>

      {/* Status Badge */}
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>{getStatusText(activeLoan.status)}</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Client Information */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Loan Number</Text>
              <Text style={styles.value}>{activeLoan.loan_number || '-'}</Text>
              <Text style={styles.subValue}>BDO</Text>
              <Text style={styles.value}>{activeLoan.bdo_name || '-'}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Outstanding Balance</Text>
              <Text style={styles.value}>
                {parseFloat(activeLoan.outstanding_balance || 0).toLocaleString('en-US', { 
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1 
                })}
              </Text>
              <Text style={styles.subValue}>Repayment Date</Text>
              <Text style={styles.value}>
                {activeLoan.repayment_date ? new Date(activeLoan.repayment_date).toLocaleDateString() : '-'}
              </Text>
            </View>
          </View>

          <View style={styles.amountSection}>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Principal to be disbursed</Text>
              <TouchableOpacity style={styles.editButton}>
                <Ionicons name="create-outline" size={16} color="#2196F3" />
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.amountValue}>
              {parseFloat(activeLoan.amount || 0).toLocaleString('en-US', { 
                minimumFractionDigits: 1,
                maximumFractionDigits: 1 
              })}
            </Text>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Total Interest</Text>
              <Text style={styles.value}>
                {parseFloat(activeLoan.total_interest || 0).toLocaleString('en-US', { 
                  minimumFractionDigits: 1 
                })}
              </Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Total Charges</Text>
              <Text style={styles.value}>{activeLoan.total_charges || '0'}</Text>
            </View>
          </View>
        </View>

        {/* Loan Details */}
        <View style={styles.card}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Loan Product</Text>
            <Text style={styles.detailValue}>{activeLoan.product_name || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Next Due Date</Text>
            <Text style={styles.detailValue}>
              {activeLoan.next_due_date ? new Date(activeLoan.next_due_date).toLocaleDateString() : '-'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Product Top-Up Access Fee</Text>
            <Text style={styles.detailValue}>{activeLoan.product_top_up?.access_fee || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Allowed Active Loans</Text>
            <Text style={styles.detailValue}>{activeLoan.product_top_up?.allowed_active_loans || '-'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Perc Repayment Before Top-Up</Text>
            <Text style={styles.detailValue}>{activeLoan.product_top_up?.perc_repayment_before_top_up || '-'}</Text>
          </View>
        </View>

        {/* Approval Status */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Approval Status</Text>
          <View style={styles.approvalStatusContainer}>
            {approvalStatuses.map((status, index) => (
              <View key={index} style={styles.approvalStep}>
                <View style={styles.approvalIconContainer}>
                  {status.completed ? (
                    <View style={styles.approvalIconCompleted}>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </View>
                  ) : status.pending ? (
                    <View style={styles.approvalIconPending}>
                      <Ionicons name="time-outline" size={20} color="#FF9800" />
                    </View>
                  ) : (
                    <View style={styles.approvalIconInactive}>
                      <Ionicons name="ellipse-outline" size={20} color="#9E9E9E" />
                    </View>
                  )}
                </View>
                <Text style={[
                  styles.approvalLabel,
                  status.pending && styles.approvalLabelPending,
                  status.completed && styles.approvalLabelCompleted
                ]}>
                  {status.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          {activeLoan.status === 0 && (
            <>
              <View style={styles.actionInfo}>
                <Ionicons name="time-outline" size={20} color="#FF9800" />
                <Text style={styles.actionInfoText}>Loan needs BM approval</Text>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApprove('BM')}
                >
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={handleDecline}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {activeLoan.status === 2 && (
            <>
              <View style={styles.actionInfo}>
                <Ionicons name="time-outline" size={20} color="#FF9800" />
                <Text style={styles.actionInfoText}>Loan needs HQ approval</Text>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={() => handleApprove('HQ')}
                >
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={handleDecline}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {activeLoan.status === 3 && (
            <>
              <View style={styles.actionInfo}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
                <Text style={styles.actionInfoText}>Loan is awaiting disbursement</Text>
              </View>
              <TouchableOpacity
                style={styles.disburseButton}
                onPress={handleDisburse}
              >
                <Text style={styles.disburseButtonText}>Disburse Loan</Text>
              </TouchableOpacity>
            </>
          )}

          {activeLoan.status === 4 && (
            <View style={styles.actionInfo}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.actionInfoText}>Loan has been disbursed</Text>
            </View>
          )}

          {activeLoan.status === -1 && (
            <View style={[styles.actionInfo, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="close-circle" size={20} color="#F44336" />
              <Text style={[styles.actionInfoText, { color: '#C62828' }]}>
                Loan has been rejected
              </Text>
            </View>
          )}
        </View>

        {/* Payments */}
        <View style={[styles.card, { marginBottom: 20 }]}>
          <Text style={styles.sectionTitle}>Payments (0)</Text>
          <View style={styles.emptyPayments}>
            <View style={styles.emptyPaymentsIcon}>
              <Ionicons name="wallet-outline" size={48} color="#FFC107" />
            </View>
            <Text style={styles.emptyPaymentsText}>
              No payments made towards this loan.
            </Text>
          </View>
        </View>

        {/* Previous Loans Section */}
        {loan.previous && loan.previous.length > 0 && (
          <View style={[styles.card, { marginBottom: 20 }]}>
            <Text style={styles.sectionTitle}>Previous Loans</Text>
            {loan.previous.map((prevLoan, index) => (
              <TouchableOpacity
                key={index}
                style={styles.detailRow}
                onPress={() => router.push(`/loan_details/${prevLoan.id}`)}
              >
                <Text style={styles.detailLabel}>
                  {prevLoan.product_name || 'Unknown Product'}
                </Text>
                <Text style={styles.detailValue}>
                  {getStatusText(prevLoan.status)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Approval Modal */}
      <Modal
        visible={approvalModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !submitting && setApprovalModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Approve this loan?</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter approval comments (Optional)"
              placeholderTextColor="#9E9E9E"
              multiline
              numberOfLines={4}
              value={approvalComment}
              onChangeText={setApprovalComment}
              textAlignVertical="top"
              editable={!submitting}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalApproveButton, submitting && styles.buttonDisabled]}
                onPress={submitApproval}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.modalApproveButtonText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCancelButton, submitting && styles.buttonDisabled]}
                onPress={() => setApprovalModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Disbursement Modal */}
      <Modal
        visible={disbursementModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !submitting && setDisbursementModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Disbursement approval</Text>
            <Text style={styles.modalSubtitle}>You are about to approve loan disbursement.</Text>
            
            {/* Loan Details */}
            <View style={styles.disbursementDetails}>
              <View style={styles.disbursementRow}>
                <View style={styles.disbursementCol}>
                  <Text style={styles.disbursementLabel}>Amount to be disbursed</Text>
                  <Text style={styles.disbursementValue}>
                    Kes {parseFloat(activeLoan.amount || 0).toLocaleString('en-US', { 
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1 
                    })}
                  </Text>
                </View>
                <View style={styles.disbursementCol}>
                  <Text style={styles.disbursementLabel}>Client's name</Text>
                  <Text style={styles.disbursementValue}>
                    {activeLoan.client_name || 'N/A'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.disbursementRow}>
                <View style={styles.disbursementCol}>
                  <Text style={styles.disbursementLabel}>Client's phone NO.</Text>
                  <Text style={styles.disbursementValue}>
                    {activeLoan.client_phone || 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Date of disbursement */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date of disbursement</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateInputText}>
                  {disbursementDate.toLocaleDateString('en-GB')}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#757575" />
              </TouchableOpacity>
            </View>

            {/* Transaction ID */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Enter transaction ID.</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter transaction ID"
                placeholderTextColor="#9E9E9E"
                value={transactionId}
                onChangeText={setTransactionId}
                editable={!submitting}
              />
            </View>

            {/* Disbursed by */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Disbursed by</Text>
              <View style={styles.disabledInput}>
                <Text style={styles.disabledInputText}>{currentUserName}</Text>
              </View>
            </View>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelButton, submitting && styles.buttonDisabled]}
                onPress={() => setDisbursementModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalDisburseButton, submitting && styles.buttonDisabled]}
                onPress={submitDisbursement}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalDisburseButtonText}>Mark disbursed</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker for iOS/Android */}
      {showDatePicker && (
        <Modal
          transparent
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerModal}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerButton}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.datePickerButton, styles.datePickerDone]}>Done</Text>
                </TouchableOpacity>
              </View>
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={disbursementDate}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setDisbursementDate(selectedDate);
                    }
                  }}
                />
              ) : (
                <DateTimePicker
                  value={disbursementDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setDisbursementDate(selectedDate);
                    }
                  }}
                />
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#757575',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerButton: {
    minWidth: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  updateButton: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  statusText: {
    color: '#FF9800',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    marginTop: 12,
    marginHorizontal: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  col: {
    flex: 1,
    paddingRight: 8,
  },
  label: {
    fontSize: 12,
    color: '#9E9E9E',
    marginBottom: 4,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '600',
    marginBottom: 8,
  },
  subValue: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '500',
  },
  amountSection: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editText: {
    color: '#2196F3',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 13,
    color: '#757575',
    flex: 1,
  },
  detailValue: {
    fontSize: 13,
    color: '#212121',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
  },
  approvalStatusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  approvalStep: {
    alignItems: 'center',
    flex: 1,
  },
  approvalIconContainer: {
    marginBottom: 8,
  },
  approvalIconCompleted: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvalIconPending: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvalIconInactive: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  approvalLabel: {
    fontSize: 11,
    color: '#757575',
    textAlign: 'center',
    fontWeight: '500',
  },
  approvalLabelPending: {
    color: '#FF9800',
    fontWeight: '600',
  },
  approvalLabelCompleted: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  actionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  actionInfoText: {
    fontSize: 13,
    color: '#F57C00',
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  declineButtonText: {
    color: '#757575',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  disburseButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  disburseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyPayments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyPaymentsIcon: {
    backgroundColor: '#FFF9C4',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyPaymentsText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 24,
    color: '#212121',
    backgroundColor: '#fafafa',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalApproveButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  modalApproveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  modalCancelButtonText: {
    color: '#757575',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalSubtitle: {
  fontSize: 14,
  color: '#757575',
  marginBottom: 20,
  textAlign: 'center',
},
disbursementDetails: {
  backgroundColor: '#F5F5F5',
  padding: 16,
  borderRadius: 8,
  marginBottom: 20,
},
disbursementRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 12,
},
disbursementCol: {
  flex: 1,
  paddingRight: 8,
},
disbursementLabel: {
  fontSize: 12,
  color: '#2196F3',
  marginBottom: 4,
  fontWeight: '500',
},
disbursementValue: {
  fontSize: 16,
  color: '#212121',
  fontWeight: '600',
},
formGroup: {
  marginBottom: 16,
},
formLabel: {
  fontSize: 13,
  color: '#757575',
  marginBottom: 8,
  fontWeight: '500',
},
dateInput: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#e0e0e0',
  borderRadius: 8,
  padding: 12,
  backgroundColor: '#fff',
},
dateInputText: {
  fontSize: 14,
  color: '#212121',
},
textInput: {
  borderWidth: 1,
  borderColor: '#e0e0e0',
  borderRadius: 8,
  padding: 12,
  fontSize: 14,
  color: '#212121',
  backgroundColor: '#fff',
},
disabledInput: {
  borderWidth: 1,
  borderColor: '#e0e0e0',
  borderRadius: 8,
  padding: 12,
  backgroundColor: '#F5F5F5',
},
disabledInputText: {
  fontSize: 14,
  color: '#757575',
},
modalDisburseButton: {
  flex: 1,
  backgroundColor: '#2196F3',
  paddingVertical: 14,
  borderRadius: 8,
  alignItems: 'center',
  elevation: 2,
},
modalDisburseButtonText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '600',
  letterSpacing: 0.5,
},
datePickerModal: {
  flex: 1,
  justifyContent: 'flex-end',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
},
datePickerContainer: {
  backgroundColor: '#fff',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingBottom: 20,
},
datePickerHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  padding: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#e0e0e0',
},
datePickerButton: {
  fontSize: 16,
  color: '#2196F3',
  fontWeight: '600',
},
datePickerDone: {
  color: '#4CAF50',
},
});

export default LoanDetails;